# Mootdx Stock Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Tushare stock-screening data path with a real Mootdx-backed provider.

**Architecture:** Keep the TypeScript `StockDataProvider` interface and add a `mootdx` provider that invokes a local Python bridge script. The bridge imports Mootdx, loads A-share stocks and quote data, and prints JSON snapshots for Next.js to consume. Unsupported fundamental metrics are filtered before screening so the UI shows clear provider-level warnings instead of pretending values exist.

**Tech Stack:** Next.js 14 server runtime, TypeScript, Node `child_process`, Python 3, Mootdx, node:test.

---

### Task 1: Failing Tests

**Files:**
- Modify: `src/lib/stock-screening-provider.test.ts`
- Modify: `src/lib/stock-screening.test.ts`

**Step 1: Write failing tests**

Test that:
- `createMootdxStockDataProvider` parses JSON emitted by a command runner.
- `createDefaultStockDataProvider` chooses `mootdx`.
- `buildAiStockScreeningPayload` drops rules unsupported by a provider and returns provider-level warnings.

**Step 2: Verify RED**

Run: `pnpm test`

Expected: FAIL because the Mootdx provider and unsupported-rule filtering do not exist.

### Task 2: Provider And Bridge

**Files:**
- Modify: `src/lib/stock-screening-provider.ts`
- Modify: `src/lib/stock-screening.ts`
- Create: `scripts/mootdx_stock_provider.py`

**Step 1: Implement provider**

Add:
- `createMootdxStockDataProvider`
- a command-runner injection point for tests
- JSON validation from Python stdout
- default provider selection for `STOCK_SCREENING_PROVIDER=mootdx`

**Step 2: Implement bridge**

Add Python script that:
- imports `mootdx.quotes.Quotes`
- connects with `Quotes.factory(market="std")`
- fetches SH/SZ stock lists and quote batches
- emits `StockSnapshot[]` JSON with latest price and `pct_chg`

**Step 3: Verify GREEN**

Run: `pnpm test`

Expected: PASS.

### Task 3: Config, Docs, Runtime

**Files:**
- Modify: `.env.example`
- Modify: `.env` local only
- Modify: `README.md`
- Modify: `package.json`

**Step 1: Update config and docs**

Set default provider to `mootdx`, document Python dependency installation, and add a helper script for installing Mootdx.

**Step 2: Verify build**

Run: `pnpm build`

Expected: PASS.

**Step 3: Start dev server**

Run: `pnpm dev`

Expected: app starts on `http://localhost:3000`.
