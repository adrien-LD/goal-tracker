import {
  mapEastmoneySnapshot,
  type StockDataProvider,
  type StockSnapshot,
} from "./stock-screening";

type EastmoneyListResponse = {
  readonly data?: {
    readonly diff?: unknown;
  };
};

const EASTMONEY_QUOTE_URL =
  "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=300&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f2,f3,f162,f167,f173";

const DEMO_STOCKS: readonly StockSnapshot[] = [
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
  {
    code: "300750",
    name: "宁德时代",
    market: "cn",
    industry: "电池",
    latestPrice: 252.4,
    metrics: {
      pe_ttm: 24.6,
      pb: 5.4,
      total_mv_billion: 1108.3,
      pct_chg: 1.8,
      dividend_yield: 0.9,
    },
  },
];

export function createDemoStockDataProvider(): StockDataProvider {
  return {
    sourceName: "demo",
    loadStocks: async () => DEMO_STOCKS,
  };
}

export function createEastmoneyStockDataProvider(
  fetcher: typeof fetch = fetch
): StockDataProvider {
  return {
    sourceName: "eastmoney",
    loadStocks: async () => {
      const response = await fetcher(EASTMONEY_QUOTE_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 300 },
      });
      if (!response.ok) {
        throw new Error("Failed to load A-share data");
      }

      const body = (await response.json()) as EastmoneyListResponse;
      const rows = Array.isArray(body.data?.diff) ? body.data.diff : [];
      const stocks = rows.map(mapEastmoneySnapshot).filter((stock) => {
        return stock.code && stock.name;
      });

      return stocks.length > 0 ? stocks : DEMO_STOCKS;
    },
  };
}

export function createDefaultStockDataProvider(): StockDataProvider {
  if (process.env.STOCK_SCREENING_PROVIDER === "demo") {
    return createDemoStockDataProvider();
  }
  return createEastmoneyStockDataProvider();
}
