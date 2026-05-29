import {
  buildAiStockScreeningPayload,
  parseStockScreeningQuery,
  type AiStockScreeningPayload,
  type ParsedStockScreeningRules,
  type StockDataProvider,
  type StockMarket,
  type StockMetricKey,
  type StockRuleOperator,
  type StockScreeningRule,
} from "./stock-screening";
import { createDefaultStockDataProvider } from "./stock-screening-provider";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

type Fetcher = typeof fetch;

type NormalizeRequestBody = {
  readonly query?: unknown;
  readonly market?: unknown;
  readonly limit?: unknown;
};

export type NormalizedStockScreeningRequest = {
  readonly query: string;
  readonly market: StockMarket;
  readonly limit: number;
};

type CreateOpenAiRuleParserOptions = {
  readonly apiKey: string;
  readonly model?: string;
  readonly fetcher?: Fetcher;
};

type CreateStockScreeningPayloadOptions = {
  readonly body: NormalizeRequestBody;
  readonly dataProvider?: StockDataProvider;
  readonly aiRuleParser?: (query: string) => Promise<ParsedStockScreeningRules>;
  readonly now?: Date;
};

function clampLimit(limit: unknown) {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseOpenAiOutput(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const outputText = (body as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText;

  const output = (body as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }

  return "";
}

function parseRuleMetric(value: unknown): StockMetricKey | null {
  if (
    value === "pe_ttm" ||
    value === "pb" ||
    value === "total_mv_billion" ||
    value === "pct_chg" ||
    value === "dividend_yield"
  ) {
    return value;
  }
  return null;
}

function parseRuleOperator(value: unknown): StockRuleOperator | null {
  if (
    value === ">" ||
    value === ">=" ||
    value === "<" ||
    value === "<=" ||
    value === "between" ||
    value === "in_top"
  ) {
    return value;
  }
  return null;
}

function parseRuleValue(value: unknown): number | readonly [number, number] | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    return [value[0], value[1]];
  }
  return null;
}

function validateParsedRules(value: unknown): ParsedStockScreeningRules {
  if (!value || typeof value !== "object") {
    throw new Error("AI returned invalid screening rules");
  }

  const raw = value as {
    logic?: unknown;
    rules?: unknown;
    warnings?: unknown;
  };
  const rawRules = Array.isArray(raw.rules) ? raw.rules : [];
  const rules: StockScreeningRule[] = rawRules.flatMap((rule) => {
    if (!rule || typeof rule !== "object") return [];
    const rawRule = rule as {
      metric?: unknown;
      operator?: unknown;
      value?: unknown;
      unit?: unknown;
    };
    const metric = parseRuleMetric(rawRule.metric);
    const operator = parseRuleOperator(rawRule.operator);
    const value = parseRuleValue(rawRule.value);
    if (!metric || !operator || value === null) return [];

    return [
      {
        metric,
        operator,
        value,
        unit:
          rawRule.unit === "%" ||
          rawRule.unit === "times" ||
          rawRule.unit === "billion"
            ? rawRule.unit
            : undefined,
      },
    ];
  });
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((item): item is string => typeof item === "string")
    : [];

  return {
    logic: "AND",
    rules,
    warnings,
  };
}

export function normalizeStockScreeningRequest(
  body: NormalizeRequestBody
): NormalizedStockScreeningRequest {
  const query = String(body.query || "").trim();
  if (!query) {
    throw new Error("Missing screening query");
  }

  return {
    query,
    market: "cn",
    limit: clampLimit(body.limit),
  };
}

export function createOpenAiRuleParser({
  apiKey,
  fetcher = fetch,
  model = DEFAULT_OPENAI_MODEL,
}: CreateOpenAiRuleParserOptions) {
  return async (query: string): Promise<ParsedStockScreeningRules> => {
    const response = await fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "Parse Chinese A-share screening rules into strict JSON. Supported metrics are pe_ttm, pb, total_mv_billion, pct_chg, dividend_yield. Use logic AND. Put unsupported financial metrics in warnings.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "stock_screening_rules",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                logic: { type: "string", enum: ["AND"] },
                rules: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      metric: {
                        type: "string",
                        enum: [
                          "pe_ttm",
                          "pb",
                          "total_mv_billion",
                          "pct_chg",
                          "dividend_yield",
                        ],
                      },
                      operator: {
                        type: "string",
                        enum: [">", ">=", "<", "<=", "between", "in_top"],
                      },
                      value: {
                        anyOf: [
                          { type: "number" },
                          {
                            type: "array",
                            minItems: 2,
                            maxItems: 2,
                            items: { type: "number" },
                          },
                        ],
                      },
                      unit: {
                        type: "string",
                        enum: ["%", "times", "billion"],
                      },
                    },
                    required: ["metric", "operator", "value"],
                  },
                },
                warnings: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["logic", "rules", "warnings"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error("AI parser request failed");
    }

    const body = await response.json();
    const text = parseOpenAiOutput(body);
    if (!text) {
      throw new Error("AI parser returned an empty response");
    }

    return validateParsedRules(JSON.parse(text));
  };
}

export async function createStockScreeningPayload({
  aiRuleParser,
  body,
  dataProvider = createDefaultStockDataProvider(),
  now,
}: CreateStockScreeningPayloadOptions): Promise<AiStockScreeningPayload> {
  const request = normalizeStockScreeningRequest(body);
  let parseWarnings: readonly string[] = [];
  let ruleParser: (query: string) => ParsedStockScreeningRules =
    parseStockScreeningQuery;

  if (aiRuleParser) {
    ruleParser = (query) => {
      throw new Error("async parser should be resolved before filtering");
    };
    try {
      const parsedRules = await aiRuleParser(request.query);
      ruleParser = () => parsedRules;
    } catch (_error) {
      parseWarnings = ["AI parser unavailable; used local parser."];
      ruleParser = parseStockScreeningQuery;
    }
  }

  const payload = await buildAiStockScreeningPayload({
    query: request.query,
    market: request.market,
    limit: request.limit,
    dataProvider,
    ruleParser,
    now,
  });

  return {
    ...payload,
    warnings: [...parseWarnings, ...payload.warnings],
  };
}
