import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sendClosureDeletedAlert } from "@/lib/email";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingClosure = await prisma.positionClosure.findUnique({
      where: { id },
      include: { 
        position: {
          include: { client: true }
        }
      }
    });

    if (!existingClosure) {
      return NextResponse.json({ error: "Closure not found" }, { status: 404 });
    }

    // Delete closure and update position in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete the closure record
      await tx.positionClosure.delete({
        where: { id }
      });

      // 2. Decrement the closed_count on the position
      const newClosedCount = Math.max(0, existingClosure.position.closed_count - existingClosure.closed_count);
      
      // 3. Determine the new status
      let newStatus = existingClosure.position.status;
      if (newClosedCount === 0) {
        newStatus = "Open";
      } else if (newClosedCount < existingClosure.position.requested_count) {
        newStatus = "Partially Closed";
      }

      const updatedPosition = await tx.position.update({
        where: { id: existingClosure.position_id },
        data: {
          closed_count: newClosedCount,
          status: newStatus,
          updated_by: user.id
        }
      });

      // 4. Log the deletion
      await tx.auditLog.create({
        data: {
          entity_type: "Position",
          entity_id: existingClosure.position_id,
          action: "Delete Closure",
          old_values: existingClosure as any,
          reason: `Deleted a closure of ${existingClosure.closed_count} resource(s) for ${existingClosure.position.role_name}`,
          modified_by: user.id,
        }
      });

      return updatedPosition;
    });

    // Send email alert asynchronously
    sendClosureDeletedAlert(
      existingClosure.position.role_name, 
      (existingClosure.position as any).client.company_name, 
      existingClosure.closed_count, 
      user?.name || "System"
    ).catch(e => console.error("Email failed:", e));

    return NextResponse.json({ message: "Closure deleted successfully", position: result });
  } catch (error) {
    console.error("Failed to delete closure:", error);
    return NextResponse.json({ error: "Failed to delete closure" }, { status: 500 });
  }
}
