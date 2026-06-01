import assert from "node:assert/strict";
import test from "node:test";
import {
  createOpenAiRuleParser,
  createStockScreeningPayload,
  normalizeStockScreeningRequest,
} from "./stock-screening-api";
import type { ParsedStockScreeningRules, StockDataProvider } from "./stock-screening";

test("normalizeStockScreeningRequest trims query and clamps limit", () => {
  assert.deepEqual(
    normalizeStockScreeningRequest({
      query: "  市盈率低于20  ",
      market: "us",
      limit: 200,
    }),
    {
      query: "市盈率低于20",
      market: "cn",
      limit: 100,
    }
  );
});

test("normalizeStockScreeningRequest rejects an empty query", () => {
  assert.throws(
    () => normalizeStockScreeningRequest({ query: "   " }),
    /Missing screening query/
  );
});

test("createOpenAiRuleParser parses the first JSON object from a model response", async () => {
  const parser = createOpenAiRuleParser({
    apiKey: "test-key",
    model: "gpt-test",
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body || "{}"));
      assert.equal(body.model, "gpt-test");
      assert.equal(body.input[1].content, "市盈率低于20");
      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    logic: "AND",
                    rules: [
                      {
                        metric: "pe_ttm",
                        operator: "<",
                        value: 20,
                        unit: "times",
                      },
                    ],
                    warnings: [],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 }
      );
    },
  });

  assert.deepEqual(await parser("市盈率低于20"), {
    logic: "AND",
    rules: [{ metric: "pe_ttm", operator: "<", value: 20, unit: "times" }],
    warnings: [],
  } satisfies ParsedStockScreeningRules);
});

test("createOpenAiRuleParser supports OpenAI-compatible base URLs", async () => {
  const parser = createOpenAiRuleParser({
    apiKey: "test-key",
    baseUrl: "https://openai-compatible.test/v1/",
    fetcher: async (url) => {
      assert.equal(String(url), "https://openai-compatible.test/v1/responses");
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            logic: "AND",
            rules: [],
            warnings: ["ok"],
          }),
        }),
        { status: 200 }
      );
    },
  });

  assert.deepEqual(await parser("任意规则"), {
    logic: "AND",
    rules: [],
    warnings: ["ok"],
  } satisfies ParsedStockScreeningRules);
});

test("createStockScreeningPayload falls back to deterministic parsing when AI parsing fails", async () => {
  const provider: StockDataProvider = {
    sourceName: "fixture",
    loadStocks: async () => [
      {
        code: "000001",
        name: "平安银行",
        market: "cn",
        industry: "银行",
        latestPrice: 12.08,
        metrics: {
          pe_ttm: 5.2,
          pb: 0.58,
        },
      },
    ],
  };

  const payload = await createStockScreeningPayload({
    body: {
      query: "市盈率低于10",
    },
    dataProvider: provider,
    aiRuleParser: async () => {
      throw new Error("model unavailable");
    },
    now: new Date("2026-05-29T08:00:00.000Z"),
  });

  assert.deepEqual(payload.results.map((result) => result.code), ["000001"]);
  assert.deepEqual(payload.warnings, ["AI parser unavailable; used local parser."]);
});
