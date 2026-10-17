import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Dynamically access followup model to prevent stale references
const getFollowup = () => (prisma as any).followup;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";

    // Base query for non-deleted followups
    const baseWhere: any = {
      deleted_at: null,
    };

    if (search.trim()) {
      baseWhere.title = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Current start and end of day in local/UTC
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Apply specific filter if requested
    let whereClause = { ...baseWhere };
    if (filter === "due_today") {
      whereClause.status = { not: "Completed" };
      whereClause.followup_date = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (filter === "overdue") {
      whereClause.status = { not: "Completed" };
      whereClause.followup_date = {
        lt: startOfToday,
      };
    } else if (filter === "upcoming") {
      whereClause.status = { not: "Completed" };
      whereClause.followup_date = {
        gt: endOfToday,
      };
    } else if (filter === "completed") {
      whereClause.status = "Completed";
    }

    const followups = await getFollowup().findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { followup_date: "asc" },
      ],
    });

    // Compute stats across all non-deleted followups
    const allActive = await getFollowup().findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        followup_date: true,
        status: true,
      },
    });

    let dueTodayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    for (const item of allActive) {
      if (item.status === "Completed") {
        completedCount++;
      } else {
        const itemDate = new Date(item.followup_date);
        if (itemDate < startOfToday) {
          overdueCount++;
        } else if (itemDate <= endOfToday) {
          dueTodayCount++;
        } else {
          upcomingCount++;
        }
      }
    }

    return NextResponse.json({
      data: followups,
      stats: {
        total: allActive.length,
        dueToday: dueTodayCount,
        overdue: overdueCount,
        upcoming: upcomingCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch followups:", error);
    return NextResponse.json({ error: "Failed to fetch followups" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, followup_date } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!followup_date) {
      return NextResponse.json({ error: "Followup date is required" }, { status: 400 });
    }

    const parsedDate = new Date(followup_date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid followup date" }, { status: 400 });
    }

    // Look up user id from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    const followup = await getFollowup().create({
      data: {
        title: title.trim(),
        followup_date: parsedDate,
        status: "Pending",
        user_id: user?.id || null,
      },
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

    return NextResponse.json(followup, { status: 201 });
  } catch (error) {
    console.error("Failed to create followup:", error);
    return NextResponse.json({ error: "Failed to create followup" }, { status: 500 });
  }
}
