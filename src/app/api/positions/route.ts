import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sendPositionCreatedAlert } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json(positions);
  } catch (error) {
    console.error("Failed to fetch positions:", error);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, role_name, department, requested_count, per_resource_cost, billing_slab, priority, expected_joining_date, status, remarks } = body;

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

    // Create the position and the audit log in a transaction
    const position = await prisma.$transaction(async (tx) => {
      const newPosition = await tx.position.create({
        data: {
          client_id,
          role_name,
          department,
          requested_count: parseInt(requested_count),
          per_resource_cost: parseFloat(per_resource_cost),
          billing_slab,
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
          reason: `Created Position: ${role_name} for ${client.company_name}`,
          modified_by: user.id,
        }
      });

      return newPosition;
    });

    // Send email alert asynchronously
    sendPositionCreatedAlert(position, client.company_name, user.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error("Failed to create position:", error);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}
