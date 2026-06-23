import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "Super Admin") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
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
