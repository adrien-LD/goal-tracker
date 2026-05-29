import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiStockScreeningPayload,
  compileStockScreeningRules,
  mapEastmoneySnapshot,
  parseStockScreeningQuery,
  type StockSnapshot,
} from "./stock-screening";

const STOCKS: StockSnapshot[] = [
  {
    code: "600519",
    name: "贵州茅台",
    market: "cn",
    industry: "白酒",
    latestPrice: 1326,
    metrics: {
      pe_ttm: 19.8,
      pb: 8.6,
      total_mv_billion: 1657.6,
      pct_chg: 3.9,
      dividend_yield: 2.1,
    },
  },
  {
    code: "000001",
    name: "平安银行",
    market: "cn",
    industry: "银行",
    latestPrice: 12.08,
    metrics: {
      pe_ttm: 5.2,
      pb: 0.58,
      total_mv_billion: 234.4,
      pct_chg: -0.4,
      dividend_yield: 6.5,
    },
  },
];

test("parseStockScreeningQuery extracts supported A-share metrics from Chinese rules", () => {
  const parsed = parseStockScreeningQuery(
    "筛选市盈率低于20，市净率小于10，股息率大于2%的A股"
  );

  assert.deepEqual(parsed.rules, [
    { metric: "pe_ttm", operator: "<", value: 20, unit: "times" },
    { metric: "pb", operator: "<", value: 10, unit: "times" },
    { metric: "dividend_yield", operator: ">", value: 2, unit: "%" },
  ]);
  assert.deepEqual(parsed.warnings, []);
});

test("parseStockScreeningQuery reports unsupported financial metrics without failing the whole query", () => {
  const parsed = parseStockScreeningQuery("近三年ROE大于15%，营收同比超过10%");

  assert.equal(parsed.rules.length, 0);
  assert.deepEqual(parsed.warnings, [
    "ROE needs a configured financial-data provider before it can be screened.",
    "Revenue growth needs a configured financial-data provider before it can be screened.",
  ]);
});

test("compileStockScreeningRules filters stocks and explains each match", () => {
  const filter = compileStockScreeningRules([
    { metric: "pe_ttm", operator: "<", value: 20, unit: "times" },
    { metric: "dividend_yield", operator: ">", value: 2, unit: "%" },
  ]);

  assert.deepEqual(
    STOCKS.filter((stock) => filter(stock).matched).map((stock) => stock.code),
    ["600519", "000001"]
  );
  assert.deepEqual(filter(STOCKS[0]).reasons, [
    "PE(TTM)=19.8 < 20",
    "Dividend yield=2.1% > 2%",
  ]);
});

test("compileStockScreeningRules treats missing metric values as non-matches", () => {
  const filter = compileStockScreeningRules([
    { metric: "pb", operator: "<", value: 1, unit: "times" },
  ]);
  const missingMetricStock = {
    ...STOCKS[0],
    metrics: { pe_ttm: 18 },
  };

  assert.deepEqual(filter(missingMetricStock), {
    matched: false,
    reasons: [],
    warnings: ["贵州茅台 is missing PB."],
  });
});

test("mapEastmoneySnapshot converts public A-share quote fields into a stock snapshot", () => {
  assert.deepEqual(
    mapEastmoneySnapshot({
      f12: "600519",
      f14: "贵州茅台",
      f2: 1326,
      f3: 3.92,
      f162: 19.8,
      f167: 8.6,
      f173: 2.1,
    }),
    {
      code: "600519",
      name: "贵州茅台",
      market: "cn",
      industry: "",
      latestPrice: 1326,
      metrics: {
        pe_ttm: 19.8,
        pb: 8.6,
        pct_chg: 3.92,
        dividend_yield: 2.1,
      },
    }
  );
});

test("buildAiStockScreeningPayload returns parsed rules, ranked results, warnings, and meta", async () => {
  const payload = await buildAiStockScreeningPayload({
    query: "市盈率低于10，市净率小于1",
    market: "cn",
    limit: 5,
    dataProvider: {
      loadStocks: async () => STOCKS,
      sourceName: "fixture",
    },
    ruleParser: parseStockScreeningQuery,
    now: new Date("2026-05-29T08:00:00.000Z"),
  });

  assert.deepEqual(
    payload.results.map((result) => ({
      code: result.code,
      matchedReasons: result.matchedReasons,
    })),
    [
      {
        code: "000001",
        matchedReasons: ["PE(TTM)=5.2 < 10", "PB=0.58 < 1"],
      },
    ]
  );
  assert.deepEqual(payload.parsedRules.rules, [
    { metric: "pe_ttm", operator: "<", value: 10, unit: "times" },
    { metric: "pb", operator: "<", value: 1, unit: "times" },
  ]);
  assert.equal(payload.meta.source, "fixture");
  assert.equal(payload.meta.totalCount, 2);
  assert.equal(payload.meta.matchedCount, 1);
  assert.equal(payload.meta.asOf, "2026-05-29T08:00:00.000Z");
});
