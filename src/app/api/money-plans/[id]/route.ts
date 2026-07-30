import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getMoneyPlanForUser,
  updateMoneyPlanAmount,
} from "@/lib/money-plan-service";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const plan = await getMoneyPlanForUser(user.id, context.params.id);
    if (!plan) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { message: "Amount must be a non-negative integer" },
        { status: 400 }
      );
    }

    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : undefined;

    const plan = await updateMoneyPlanAmount({
      userId: user.id,
      planId: context.params.id,
      amount,
      note,
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
      { message: "Failed to update money plan" },
      { status: 500 }
    );
  }
}
