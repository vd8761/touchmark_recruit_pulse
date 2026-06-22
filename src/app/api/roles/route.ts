import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["Super Admin", "Admin"].includes(session.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const roles = await prisma.role.findMany({
      orderBy: { role_name: "asc" }
    });
    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
