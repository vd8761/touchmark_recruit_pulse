import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Dynamically access followup model to prevent stale references
const getFollowup = () => (prisma as any).followup;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, followup_date, status, is_reschedule } = body;

    const existing = await getFollowup().findUnique({
      where: { id },
    });

    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: "Followup not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (followup_date !== undefined) {
      const parsedDate = new Date(followup_date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      updateData.followup_date = parsedDate;

      // If date is being changed or explicit reschedule action
      if (is_reschedule || parsedDate.getTime() !== new Date(existing.followup_date).getTime()) {
        updateData.rescheduled_count = { increment: 1 };
        updateData.last_rescheduled_at = new Date();
        // If it was completed before, reactivate it upon reschedule
        if (existing.status === "Completed") {
          updateData.status = "Pending";
        }
      }
    }

    const updated = await getFollowup().update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update followup:", error);
    return NextResponse.json({ error: "Failed to update followup" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await getFollowup().findUnique({
      where: { id },
    });

    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: "Followup not found" }, { status: 404 });
    }

    // Soft delete
    await getFollowup().update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true, message: "Followup deleted successfully" });
  } catch (error) {
    console.error("Failed to delete followup:", error);
    return NextResponse.json({ error: "Failed to delete followup" }, { status: 500 });
  }
}
