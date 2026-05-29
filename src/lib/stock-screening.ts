export type StockMarket = "cn";

export type StockMetricKey =
  | "pe_ttm"
  | "pb"
  | "total_mv_billion"
  | "pct_chg"
  | "dividend_yield";

export type StockRuleOperator = ">" | ">=" | "<" | "<=" | "between" | "in_top";

export type StockScreeningRule = {
  readonly metric: StockMetricKey;
  readonly operator: StockRuleOperator;
  readonly value: number | readonly [number, number];
  readonly unit?: "%" | "times" | "billion";
};

export type ParsedStockScreeningRules = {
  readonly logic: "AND";
  readonly rules: readonly StockScreeningRule[];
  readonly warnings: readonly string[];
};

export type StockSnapshot = {
  readonly code: string;
  readonly name: string;
  readonly market: StockMarket;
  readonly industry: string;
  readonly latestPrice: number | null;
  readonly metrics: Partial<Record<StockMetricKey, number>>;
};

export type StockScreeningResult = StockSnapshot & {
  readonly matchedReasons: readonly string[];
};

export type StockDataProvider = {
  readonly sourceName: string;
  loadStocks: () => Promise<readonly StockSnapshot[]>;
};

export type BuildAiStockScreeningPayloadOptions = {
  readonly query: string;
  readonly market: StockMarket;
  readonly limit: number;
  readonly dataProvider: StockDataProvider;
  readonly ruleParser?: (query: string) => ParsedStockScreeningRules;
  readonly now?: Date;
};

export type AiStockScreeningPayload = {
  readonly parsedRules: ParsedStockScreeningRules;
  readonly results: readonly StockScreeningResult[];
  readonly warnings: readonly string[];
  readonly meta: {
    readonly market: StockMarket;
    readonly source: string;
    readonly totalCount: number;
    readonly matchedCount: number;
    readonly asOf: string;
  };
};

type MetricDefinition = {
  readonly label: string;
  readonly unit?: "%" | "times" | "billion";
};

type EastmoneyQuoteRow = {
  readonly f12?: unknown;
  readonly f14?: unknown;
  readonly f2?: unknown;
  readonly f3?: unknown;
  readonly f162?: unknown;
  readonly f167?: unknown;
  readonly f173?: unknown;
};

const METRIC_DEFINITIONS: Record<StockMetricKey, MetricDefinition> = {
  pe_ttm: { label: "PE(TTM)", unit: "times" },
  pb: { label: "PB", unit: "times" },
  total_mv_billion: { label: "Market cap", unit: "billion" },
  pct_chg: { label: "Change", unit: "%" },
  dividend_yield: { label: "Dividend yield", unit: "%" },
};

const UNSUPPORTED_METRIC_WARNINGS = [
  {
    pattern: /roe/i,
    warning:
      "ROE needs a configured financial-data provider before it can be screened.",
  },
  {
    pattern: /营收同比|营业收入同比|收入同比/,
    warning:
      "Revenue growth needs a configured financial-data provider before it can be screened.",
  },
  {
    pattern: /净利润同比|利润同比/,
    warning:
      "Net profit growth needs a configured financial-data provider before it can be screened.",
  },
  {
    pattern: /资产负债率/,
    warning:
      "Debt-to-assets needs a configured financial-data provider before it can be screened.",
  },
] as const;

const RULE_PATTERNS: readonly {
  readonly metric: StockMetricKey;
  readonly pattern: RegExp;
  readonly operator: StockRuleOperator;
  readonly unit?: "%" | "times" | "billion";
}[] = [
  {
    metric: "pe_ttm",
    pattern: /(?:市盈率|pe|PE)(?:TTM|ttm)?(?:低于|小于|少于|<)\s*(\d+(?:\.\d+)?)/,
    operator: "<",
    unit: "times",
  },
  {
    metric: "pe_ttm",
    pattern: /(?:市盈率|pe|PE)(?:TTM|ttm)?(?:高于|大于|超过|>)\s*(\d+(?:\.\d+)?)/,
    operator: ">",
    unit: "times",
  },
  {
    metric: "pb",
    pattern: /(?:市净率|pb|PB)(?:低于|小于|少于|<)\s*(\d+(?:\.\d+)?)/,
    operator: "<",
    unit: "times",
  },
  {
    metric: "pb",
    pattern: /(?:市净率|pb|PB)(?:高于|大于|超过|>)\s*(\d+(?:\.\d+)?)/,
    operator: ">",
    unit: "times",
  },
  {
    metric: "dividend_yield",
    pattern: /(?:股息率|股息|分红率)(?:高于|大于|超过|>)\s*(\d+(?:\.\d+)?)\s*%?/,
    operator: ">",
    unit: "%",
  },
  {
    metric: "pct_chg",
    pattern: /(?:涨幅|涨跌幅)(?:高于|大于|超过|>)\s*(\d+(?:\.\d+)?)\s*%?/,
    operator: ">",
    unit: "%",
  },
  {
    metric: "total_mv_billion",
    pattern: /(?:总市值|市值)(?:高于|大于|超过|>)\s*(\d+(?:\.\d+)?)(?:亿|亿元)?/,
    operator: ">",
    unit: "billion",
  },
  {
    metric: "total_mv_billion",
    pattern: /(?:总市值|市值)(?:低于|小于|少于|<)\s*(\d+(?:\.\d+)?)(?:亿|亿元)?/,
    operator: "<",
    unit: "billion",
  },
];

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  if (value.trim() === "" || value.trim() === "-") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetricValue(rule: StockScreeningRule, value: number) {
  const definition = METRIC_DEFINITIONS[rule.metric];
  if (definition.unit === "%") return `${value}%`;
  return String(value);
}

function formatRuleValue(rule: StockScreeningRule) {
  if (Array.isArray(rule.value)) {
    return `${rule.value[0]}-${rule.value[1]}${rule.unit === "%" ? "%" : ""}`;
  }
  if (rule.unit === "%") return `${rule.value}%`;
  return String(rule.value);
}

function compareMetric(value: number, rule: StockScreeningRule) {
  if (Array.isArray(rule.value)) {
    const [min, max] = rule.value;
    return value >= min && value <= max;
  }

  const threshold = Number(rule.value);
  if (rule.operator === ">") return value > threshold;
  if (rule.operator === ">=") return value >= threshold;
  if (rule.operator === "<") return value < threshold;
  if (rule.operator === "<=") return value <= threshold;
  return false;
}

export function parseStockScreeningQuery(
  query: string
): ParsedStockScreeningRules {
  const normalized = query.trim();
  const rules: StockScreeningRule[] = [];
  const warnings: string[] = UNSUPPORTED_METRIC_WARNINGS.flatMap((entry) =>
    entry.pattern.test(normalized) ? [entry.warning] : []
  );

  for (const rulePattern of RULE_PATTERNS) {
    const match = normalized.match(rulePattern.pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;

    const rule: StockScreeningRule = {
      metric: rulePattern.metric,
      operator: rulePattern.operator,
      value,
      unit: rulePattern.unit,
    };

    const hasDuplicate = rules.some(
      (existing) =>
        existing.metric === rule.metric && existing.operator === rule.operator
    );
    if (!hasDuplicate) rules.push(rule);
  }

  if (rules.length === 0 && warnings.length === 0 && normalized.length > 0) {
    warnings.push("No supported A-share screening metrics were recognized.");
  }

  return {
    logic: "AND",
    rules,
    warnings,
  };
}

export function compileStockScreeningRules(
  rules: readonly StockScreeningRule[]
) {
  return (stock: StockSnapshot) => {
    const reasons: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const value = stock.metrics[rule.metric];
      const definition = METRIC_DEFINITIONS[rule.metric];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        warnings.push(`${stock.name} is missing ${definition.label}.`);
        return { matched: false, reasons: [], warnings };
      }

      if (!compareMetric(value, rule)) {
        return { matched: false, reasons: [], warnings };
      }

      reasons.push(
        `${definition.label}=${formatMetricValue(rule, value)} ${rule.operator} ${formatRuleValue(rule)}`
      );
    }

    return { matched: true, reasons, warnings };
  };
}

export function mapEastmoneySnapshot(row: EastmoneyQuoteRow): StockSnapshot {
  return {
    code: String(row.f12 || ""),
    name: String(row.f14 || ""),
    market: "cn",
    industry: "",
    latestPrice: readNumber(row.f2),
    metrics: {
      ...(readNumber(row.f162) === null ? {} : { pe_ttm: readNumber(row.f162)! }),
      ...(readNumber(row.f167) === null ? {} : { pb: readNumber(row.f167)! }),
      ...(readNumber(row.f3) === null ? {} : { pct_chg: readNumber(row.f3)! }),
      ...(readNumber(row.f173) === null
        ? {}
        : { dividend_yield: readNumber(row.f173)! }),
    },
  };
}

export async function buildAiStockScreeningPayload({
  dataProvider,
  limit,
  market,
  now = new Date(),
  query,
  ruleParser = parseStockScreeningQuery,
}: BuildAiStockScreeningPayloadOptions): Promise<AiStockScreeningPayload> {
  const parsedRules = ruleParser(query);
  const stocks = await dataProvider.loadStocks();
  const filter = compileStockScreeningRules(parsedRules.rules);
  const warnings = [...parsedRules.warnings];
  const results: StockScreeningResult[] = [];

  for (const stock of stocks) {
    const filtered = filter(stock);
    if (filtered.warnings.length) warnings.push(...filtered.warnings);
    if (!filtered.matched) continue;

    results.push({
      ...stock,
      matchedReasons: filtered.reasons,
    });
  }

  return {
    parsedRules,
    results: results.slice(0, limit),
    warnings: Array.from(new Set(warnings)),
    meta: {
      market,
      source: dataProvider.sourceName,
      totalCount: stocks.length,
      matchedCount: results.length,
      asOf: now.toISOString(),
    },
  };
}
