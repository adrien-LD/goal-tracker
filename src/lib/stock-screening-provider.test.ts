import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultStockDataProvider,
  createMootdxStockDataProvider,
} from "./stock-screening-provider";

test("createMootdxStockDataProvider loads snapshots from the Python bridge", async () => {
  const provider = createMootdxStockDataProvider({
    runCommand: async (command, args) => {
      assert.equal(command, "python3");
      assert.deepEqual(args, ["scripts/mootdx_stock_provider.py"]);
      return JSON.stringify([
        {
          code: "000001",
          name: "平安银行",
          market: "cn",
          industry: "",
          latestPrice: 12.08,
          metrics: { pct_chg: -0.4 },
        },
        {
          code: "600519",
          name: "贵州茅台",
          market: "cn",
          industry: "",
          latestPrice: 1326,
          metrics: { pct_chg: 3.9 },
        },
      ]);
    },
  });

  const stocks = await provider.loadStocks();

  assert.equal(provider.sourceName, "mootdx");
  assert.deepEqual(provider.supportedMetrics, ["pct_chg"]);
  assert.deepEqual(stocks, [
    {
      code: "000001",
      name: "平安银行",
      market: "cn",
      industry: "",
      latestPrice: 12.08,
      metrics: { pct_chg: -0.4 },
    },
    {
      code: "600519",
      name: "贵州茅台",
      market: "cn",
      industry: "",
      latestPrice: 1326,
      metrics: { pct_chg: 3.9 },
    },
  ]);
});

test("createDefaultStockDataProvider selects Mootdx when configured", () => {
  const originalProvider = process.env.STOCK_SCREENING_PROVIDER;
  process.env.STOCK_SCREENING_PROVIDER = "mootdx";

  try {
    assert.equal(createDefaultStockDataProvider().sourceName, "mootdx");
  } finally {
    if (originalProvider === undefined) {
      delete process.env.STOCK_SCREENING_PROVIDER;
    } else {
      process.env.STOCK_SCREENING_PROVIDER = originalProvider;
    }
  }
});
