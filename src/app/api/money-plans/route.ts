import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateDefaultMoneyPlan } from "@/lib/money-plan-service";

export async function GET() {
  try {
    const user = await requireUser();
    const plan = await getOrCreateDefaultMoneyPlan(user.id);
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to load money plan" },
      { status: 500 }
    );
  }
}
