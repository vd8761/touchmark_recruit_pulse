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

    // Fetch audit logs for this client
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity_type: "Client",
        entity_id: id,
      },
      include: {
        modifier: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: "desc" }
    });

    return NextResponse.json(auditLogs);
  } catch (error) {
    console.error("Failed to fetch client history:", error);
    return NextResponse.json({ error: "Failed to fetch client history" }, { status: 500 });
  }
}
