import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPositionModifiedAlert, sendPositionDeletedAlert } from "@/lib/email";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const position = await prisma.position.findUnique({
      where: { id: params.id },
      include: { client: true }
    });

    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error("Failed to fetch position:", error);
    return NextResponse.json({ error: "Failed to fetch position" }, { status: 500 });
  }
}

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
    const { client_id, role_name, department, requested_count, per_resource_cost, billing_slab, priority, expected_joining_date, status, remarks, modification_reason, location, locations } = body;

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

    const isMultiLocation = Array.isArray(locations) && locations.length > 0;
    
    let finalLocations = locations;
    if (isMultiLocation) {
      finalLocations = locations.map((loc: any) => {
        const existingLoc = (existingPosition.locations as any[])?.find((l: any) => l.name === loc.name);
        const closedForLoc = existingLoc ? (existingLoc.closed_count || 0) : 0;
        return {
          ...loc,
          closed_count: closedForLoc
        };
      });

      for (const loc of finalLocations) {
        if (parseInt(loc.count) < loc.closed_count) {
          return NextResponse.json({ error: `Cannot reduce requested count for ${loc.name} below its currently closed count (${loc.closed_count}).` }, { status: 400 });
        }
      }
    }

    const totalRequestedCount = isMultiLocation 
      ? finalLocations.reduce((sum: number, loc: any) => sum + parseInt(loc.count || 0), 0)
      : parseInt(requested_count);

    if (totalRequestedCount < existingPosition.closed_count) {
      return NextResponse.json({ error: `Cannot reduce overall requested count below the currently closed count (${existingPosition.closed_count}).` }, { status: 400 });
    }

    const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

    const updatedPosition = await prisma.$transaction(async (tx) => {
      const primaryLocation = isMultiLocation ? finalLocations[0].name : (location || null);

      const updateData: any = {
        client_id,
        role_name,
        department,
        location: primaryLocation,
        locations: isMultiLocation ? finalLocations : undefined,
        requested_count: totalRequestedCount,
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
        include: { client: true }
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

      let changes = [];
      if (existingPosition.requested_count !== totalRequestedCount) {
        changes.push(`Count changed from ${existingPosition.requested_count} to ${totalRequestedCount}`);
      }
      if (existingPosition.status !== status) {
        changes.push(`Status changed to ${status}`);
      }
      if (existingPosition.priority !== priority) {
        changes.push(`Priority changed to ${priority}`);
      }
      
      const changeText = changes.length > 0 ? `[${changes.join(', ')}] ` : '';

      await tx.auditLog.create({
        data: {
          entity_type: "Position",
          entity_id: id,
          action: "Update",
          old_values: existingPosition as any,
          new_values: updated as any,
          reason: `${changeText}${modification_reason}`,
          modified_by: user.id,
        }
      });

      return updated;
    });

    // Send email alert asynchronously
    sendPositionModifiedAlert(updatedPosition, existingPosition, modification_reason, existingPosition.client.company_name, user?.name || "System").catch(e => console.error("Email failed:", e));

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
