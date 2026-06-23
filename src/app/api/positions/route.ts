import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPositionCreatedAlert } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user?.role || "Viewer";
    const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');

    const positions = await prisma.position.findMany({
      where: { 
        deleted_at: null,
        ...(clientId ? { client_id: clientId } : {})
      },
      include: {
        client: {
          select: { company_name: true, contact_person: true }
        }
      },
      orderBy: { created_at: "desc" },
    });

    const result = positions.map(p => {
      if (!canViewFinancials) {
        const { per_resource_cost, billing_slab, ...rest } = p;
        return { ...rest, per_resource_cost: 0, billing_slab: "" };
      }
      return p;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch positions:", error);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user?.role || "Viewer";
    if (!["Super Admin", "Admin", "Business Development"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient role" }, { status: 403 });
    }

    const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

    const body = await req.json();
    const { client_id, role_name, department, requested_count, per_resource_cost, billing_slab, priority, expected_joining_date, status, remarks, location, locations } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await prisma.client.findUnique({
      where: { id: client_id }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Create the positions and the audit logs in a transaction
    const positionsCreated = await prisma.$transaction(async (tx) => {
      const created = [];
      const isMultiLocation = Array.isArray(locations) && locations.length > 0;
      const locList = isMultiLocation ? locations : [{ name: location || null, count: parseInt(requested_count) }];

      for (const loc of locList) {
        const newPosition = await tx.position.create({
          data: {
            client_id,
            role_name,
            department,
            location: loc.name || null,
            requested_count: parseInt(loc.count),
            per_resource_cost: canViewFinancials ? parseFloat(per_resource_cost) : 0,
            billing_slab: canViewFinancials ? billing_slab : "",
            priority,
            expected_joining_date: new Date(expected_joining_date),
            status: status || "Open",
            remarks,
            created_by: user.id,
          },
        });

        // Upsert JobRole and Department dictionaries for autocomplete
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
            entity_id: newPosition.id,
            action: "Create",
            new_values: newPosition as any,
            reason: `Created Position: ${role_name} for ${client.company_name} (Location: ${loc.name || 'Not Specified'})`,
            modified_by: user.id,
          }
        });
        
        created.push(newPosition);
      }
      return created;
    });

    // Send email alert asynchronously for each created position
    for (const pos of positionsCreated) {
      sendPositionCreatedAlert(pos, client.company_name, user.name || "System").catch(e => console.error("Email failed:", e));
    }

    return NextResponse.json(positionsCreated[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create position:", error);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}
