import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getMoneyPlanForUser,
  setMoneyStageActionDone,
} from "@/lib/money-plan-service";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const body = await request.json();
    if (typeof body.done !== "boolean") {
      return NextResponse.json(
        { message: "done must be a boolean" },
        { status: 400 }
      );
    }

    const result = await setMoneyStageActionDone({
      userId: user.id,
      actionId: context.params.id,
      done: body.done,
    });

    if (!result) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const plan = await getMoneyPlanForUser(user.id, result.planId);
    return NextResponse.json({
      action: { id: result.actionId, done: result.done },
      plan,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Failed to update action" },
      { status: 500 }
    );
  }
}
