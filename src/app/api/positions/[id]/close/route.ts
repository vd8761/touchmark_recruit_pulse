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
    const { closed_count, closure_date, closure_details, remarks, location } = body;

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

    const isMultiLocation = Array.isArray(position.locations) && position.locations.length > 0;
    let resolvedLocation = location;
    if (!isMultiLocation && !location && position.location) {
      resolvedLocation = position.location;
    }

    let newLocationsJson = position.locations as any[];
    if (isMultiLocation && resolvedLocation) {
      const locIndex = newLocationsJson.findIndex((l: any) => l.name === resolvedLocation);
      if (locIndex !== -1) {
        const locData = newLocationsJson[locIndex];
        const currentClosedForLoc = locData.closed_count || 0;
        if (currentClosedForLoc + parseInt(closed_count) > locData.count) {
          return NextResponse.json({ error: `Cannot close more resources than requested for location ${resolvedLocation}` }, { status: 400 });
        }
        newLocationsJson[locIndex].closed_count = currentClosedForLoc + parseInt(closed_count);
      } else {
        return NextResponse.json({ error: "Location not found in position" }, { status: 400 });
      }
    } else if (resolvedLocation && !isMultiLocation) {
      if (resolvedLocation !== position.location) {
        return NextResponse.json({ error: "Location does not match" }, { status: 400 });
      }
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
          updated_by: user.id,
          ...(newLocationsJson ? { locations: newLocationsJson } : {})
        },
        include: { client: true }
      });

      // 2. Create PositionClosure record 
      const closure = await tx.positionClosure.create({
        data: {
          position_id: id,
          closed_count: parseInt(closed_count),
          location: resolvedLocation || null,
          closure_date: new Date(closure_date),
          closure_details: closure_details,
          remarks: remarks || null,
          closed_by: user.id
        }
      });

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          entity_type: "Position",
          entity_id: id,
          action: "Close Resources",
          old_values: position as any,
          new_values: updatedPosition as any,
          reason: `Closed ${closed_count} resource(s)${resolvedLocation ? ` at ${resolvedLocation}` : ''}: ${closure_details}`,
          modified_by: user.id
        }
      });

      return { position: updatedPosition, closureId: closure.id };
    });

    // Send email alert asynchronously
    sendResourceClosedAlert(result.position, parseInt(closed_count), closure_details, user.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to close position:", error);
    return NextResponse.json({ error: "Failed to close position" }, { status: 500 });
  }
}
