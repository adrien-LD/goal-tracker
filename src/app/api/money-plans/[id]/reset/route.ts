import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resetMoneyPlan } from "@/lib/money-plan-service";

type RouteContext = {
  params: { id: string };
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const plan = await resetMoneyPlan({
      userId: user.id,
      planId: context.params.id,
    });
    if (!plan) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to reset money plan" },
      { status: 500 }
    );
  }
}
