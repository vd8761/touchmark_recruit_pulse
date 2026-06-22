import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sendResourceClosedAlert } from "@/lib/email";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const id = params.id;
    const body = await req.json();
    const { closed_count, closure_date, closure_details, remarks } = body;

    if (!closed_count || closed_count <= 0) {
      return NextResponse.json({ error: "Closed count must be greater than 0" }, { status: 400 });
    }
    if (!closure_details) {
      return NextResponse.json({ error: "Closure details are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const position = await prisma.position.findUnique({
      where: { id }
    });

    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    if (position.closed_count + parseInt(closed_count) > position.requested_count) {
      return NextResponse.json({ error: "Cannot close more resources than requested" }, { status: 400 });
    }

    // Process closure in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newClosedCount = position.closed_count + parseInt(closed_count);
      const isFullyClosed = newClosedCount === position.requested_count;
      
      const newStatus = isFullyClosed ? "Closed" : "Partially Closed";

      // 1. Update Position
      const updatedPosition = await tx.position.update({
        where: { id },
        data: {
          closed_count: newClosedCount,
          status: newStatus,
          updated_by: user.id
        }
      });

      // 2. Create PositionClosure record (Using raw SQL to bypass hot-reload cache for new tables)
      const closureId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`
        INSERT INTO "PositionClosure" (id, position_id, closed_count, closure_date, closure_details, remarks, closed_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, closureId, id, parseInt(closed_count), new Date(closure_date), closure_details, remarks || null, user.id);

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          entity_type: "Position",
          entity_id: id,
          action: "Close Resources",
          old_values: position as any,
          new_values: updatedPosition as any,
          reason: `Closed ${closed_count} resource(s): ${closure_details}`,
          modified_by: user.id
        }
      });

      return { position: updatedPosition, closureId };
    });

    // Send email alert asynchronously
    sendResourceClosedAlert(result.position, parseInt(closed_count), closure_details, user.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to close position:", error);
    return NextResponse.json({ error: "Failed to close position" }, { status: 500 });
  }
}
