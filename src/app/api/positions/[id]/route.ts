import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPositionModifiedAlert, sendPositionDeletedAlert } from "@/lib/email";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role || "Viewer";
    if (!["Super Admin", "Admin", "Business Development"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient role" }, { status: 403 });
    }

    const params = await props.params;
    const id = params.id;
    const body = await req.json();
    const { client_id, role_name, department, requested_count, per_resource_cost, billing_slab, priority, expected_joining_date, status, remarks, modification_reason } = body;

    if (!modification_reason) {
      return NextResponse.json({ error: "Modification reason is strictly required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingPosition = await prisma.position.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!existingPosition) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    if (parseInt(requested_count) < existingPosition.closed_count) {
      return NextResponse.json({ error: `Cannot reduce requested count below the currently closed count (${existingPosition.closed_count}).` }, { status: 400 });
    }

    const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

    // Update the position and write the audit log in a transaction
    const updatedPosition = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        client_id,
        role_name,
        department,
        requested_count: parseInt(requested_count),
        priority,
        expected_joining_date: new Date(expected_joining_date),
        status,
        remarks,
        updated_by: user.id,
      };

      if (canViewFinancials) {
        updateData.per_resource_cost = parseFloat(per_resource_cost);
        updateData.billing_slab = billing_slab;
      }

      const updated = await tx.position.update({
        where: { id },
        data: updateData,
      });

      // Upsert JobRole and Department dictionaries
      // Using raw SQL here directly to bypass any Next.js hot-reload cache issues with the newly generated Prisma client models
      await tx.$executeRawUnsafe(`
        INSERT INTO "JobRole" (id, name, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (name) DO NOTHING;
      `, crypto.randomUUID(), role_name);

      await tx.$executeRawUnsafe(`
        INSERT INTO "Department" (id, name, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (name) DO NOTHING;
      `, crypto.randomUUID(), department);

      await tx.auditLog.create({
        data: {
          entity_type: "Position",
          entity_id: id,
          action: "Update",
          old_values: existingPosition as any,
          new_values: updated as any,
          reason: modification_reason,
          modified_by: user.id,
        }
      });

      return updated;
    });

    // Send email alert asynchronously
    sendPositionModifiedAlert(updatedPosition, existingPosition.client.company_name, user?.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json(updatedPosition);
  } catch (error) {
    console.error("Failed to update position:", error);
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role || "Viewer";
    if (!["Super Admin", "Admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient role to delete positions" }, { status: 403 });
    }

    const params = await props.params;
    const id = params.id;
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingPosition = await prisma.position.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!existingPosition) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    // Soft Delete: update deleted_at and record audit log
    const deletedPosition = await prisma.$transaction(async (tx) => {
      const softDeleted = await tx.position.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          updated_by: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          entity_type: "Position",
          entity_id: id,
          action: "Soft Delete",
          old_values: existingPosition as any,
          reason: `Deleted Position: ${existingPosition.role_name} for ${existingPosition.client.company_name}`,
          modified_by: user.id,
        }
      });

      return softDeleted;
    });

    // Send email alert asynchronously
    sendPositionDeletedAlert(existingPosition.role_name, existingPosition.client.company_name, user?.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json({ success: true, id: deletedPosition.id });
  } catch (error) {
    console.error("Failed to delete position:", error);
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}
