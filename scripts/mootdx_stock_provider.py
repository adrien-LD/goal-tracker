#!/usr/bin/env python3
"""Emit A-share stock snapshots from Mootdx as JSON."""

from __future__ import annotations

import json
import math
import sys
from typing import Any

try:
    import pandas as pd
    from mootdx import consts
    from mootdx.quotes import Quotes
except Exception as exc:  # pragma: no cover - exercised in runtime setup only
    sys.stderr.write(f"Failed to import Mootdx dependencies: {exc}\n")
    sys.exit(1)


def clean_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def clean_string(value: Any) -> str:
    if value is None:
        return ""
    if pd.isna(value):
        return ""
    return str(value).replace("\x00", "").strip()


def read_column(row: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in row:
            return row[name]
    return None


def is_a_share_code(code: str) -> bool:
    return (
        len(code) == 6
        and code.isdigit()
        and code.startswith(
            ("000", "001", "002", "003", "300", "301", "600", "601", "603", "605", "688")
        )
    )


def normalize_stock_rows(frame: pd.DataFrame) -> list[dict[str, str]]:
    if frame is None or frame.empty:
        return []

    rows: list[dict[str, str]] = []
    for raw_row in frame.to_dict("records"):
        row = dict(raw_row)
        code = clean_string(read_column(row, "code", "symbol"))
        name = clean_string(read_column(row, "name", "volunit"))
        if is_a_share_code(code) and name:
            rows.append({"code": code, "name": name})
    return rows


def load_stock_list(client: Any) -> list[dict[str, str]]:
    stocks: list[dict[str, str]] = []
    for market in (consts.MARKET_SZ, consts.MARKET_SH):
        stocks.extend(normalize_stock_rows(client.stocks(market=market)))
    return stocks


def load_quotes(client: Any, codes: list[str], batch_size: int) -> dict[str, dict[str, Any]]:
    quotes: dict[str, dict[str, Any]] = {}
    for index in range(0, len(codes), batch_size):
        batch = codes[index : index + batch_size]
        frame = client.quotes(symbol=batch)
        if frame is None or frame.empty:
            continue

        for raw_row in frame.to_dict("records"):
            row = dict(raw_row)
            code = clean_string(read_column(row, "code", "symbol"))
            if code:
                quotes[code] = row
    return quotes


def latest_price(row: dict[str, Any]) -> float | None:
    return clean_number(read_column(row, "price", "now", "close"))


def percent_change(row: dict[str, Any]) -> float | None:
    pct = clean_number(read_column(row, "涨跌幅", "percent", "pct_chg"))
    if pct is not None:
        return pct

    price = latest_price(row)
    previous_close = clean_number(read_column(row, "last_close", "pre_close"))
    if price is None or previous_close in (None, 0):
        return None
    return round((price - previous_close) / previous_close * 100, 4)


def build_snapshots(limit: int, batch_size: int) -> list[dict[str, Any]]:
    client = Quotes.factory(market="std", multithread=True, heartbeat=True)
    stocks = load_stock_list(client)
    if limit > 0:
        stocks = stocks[:limit]

    quotes = load_quotes(client, [stock["code"] for stock in stocks], batch_size)
    snapshots: list[dict[str, Any]] = []
    for stock in stocks:
        quote = quotes.get(stock["code"], {})
        price = latest_price(quote)
        if price is None or price <= 0:
            continue

        pct_chg = percent_change(quote)
        metrics = {}
        if pct_chg is not None:
            metrics["pct_chg"] = pct_chg

        snapshots.append(
            {
                "code": stock["code"],
                "name": stock["name"],
                "market": "cn",
                "industry": "",
                "latestPrice": price,
                "metrics": metrics,
            }
        )
    return snapshots


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 80
    print(
        json.dumps(
            build_snapshots(limit=limit, batch_size=batch_size),
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )


if __name__ == "__main__":
    main()
