import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const id = params.id;

    // Fetch audit logs for this position
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity_type: "Position",
        entity_id: id,
      },
      include: {
        modifier: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: "desc" }
    });

    // Fetch position closures for this position
    const closures = await prisma.positionClosure.findMany({
      where: { position_id: id },
      include: {
        closer: { select: { name: true, email: true } }
      },
      orderBy: { created_at: "desc" }
    });

    // We can map these into a unified timeline on the client,
    // or just return both arrays. We will return both for flexibility.
    return NextResponse.json({
      auditLogs,
      closures
    });
  } catch (error) {
    console.error("Failed to fetch position history:", error);
    return NextResponse.json({ error: "Failed to fetch position history" }, { status: 500 });
  }
}
