import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  InvalidWeeklyGoalTemplateFormError,
  parseWeeklyGoalTemplateForm,
} from "@/lib/weekly-goal-form";
import {
  deleteWeeklyGoalTemplate,
  updateWeeklyGoalTemplate,
  WeeklyGoalTemplateDeletedError,
  WeeklyGoalTemplateNotFoundError,
} from "@/lib/weekly-goal-service";

const INVALID_FORM_MESSAGE = "Missing required fields";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const form = parseWeeklyGoalTemplateForm(body);

    await updateWeeklyGoalTemplate({
      db: prisma,
      userId: user.id,
      templateId: params.id,
      form,
      now: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidWeeklyGoalTemplateFormError) {
      return NextResponse.json(
        { message: INVALID_FORM_MESSAGE },
        { status: 400 }
      );
    }
    if (error instanceof WeeklyGoalTemplateDeletedError) {
      return NextResponse.json(
        { message: "Weekly goal template already deleted" },
        { status: 400 }
      );
    }
    if (error instanceof WeeklyGoalTemplateNotFoundError) {
      return NextResponse.json(
        { message: "Weekly goal template not found" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { message: "Failed to update weekly goal template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    await deleteWeeklyGoalTemplate({
      db: prisma,
      userId: user.id,
      templateId: params.id,
      now: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WeeklyGoalTemplateNotFoundError) {
      return NextResponse.json(
        { message: "Weekly goal template not found" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { message: "Failed to delete weekly goal template" },
      { status: 500 }
    );
  }
}
