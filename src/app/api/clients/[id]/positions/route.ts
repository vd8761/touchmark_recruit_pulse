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

    // Fetch positions for this client
    const positions = await prisma.position.findMany({
      where: {
        client_id: id,
        deleted_at: null
      },
      orderBy: { created_at: "desc" }
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error("Failed to fetch client positions:", error);
    return NextResponse.json({ error: "Failed to fetch client positions" }, { status: 500 });
  }
}
