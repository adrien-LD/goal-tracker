import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  createOpenAiRuleParser,
  createStockScreeningPayload,
} from "@/lib/stock-screening-api";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const aiRuleParser = apiKey
      ? createOpenAiRuleParser({
          apiKey,
          model: process.env.OPENAI_STOCK_SCREENING_MODEL,
        })
      : undefined;

    const payload = await createStockScreeningPayload({
      body,
      aiRuleParser,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Missing screening query") {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Failed to screen stocks" },
      { status: 500 }
    );
  }
}
