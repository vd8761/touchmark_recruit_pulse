import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    console.log("Autocomplete API triggered");
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    if (!type || !q) {
      return NextResponse.json([]);
    }

    if (type === "role") {
      const roles = await prisma.$queryRawUnsafe<{name: string}[]>(
        `SELECT name FROM "JobRole" WHERE name ILIKE $1 ORDER BY name ASC LIMIT 5`,
        `%${q}%`
      );
      return NextResponse.json(roles.map(r => r.name));
    }

    if (type === "department") {
      const depts = await prisma.$queryRawUnsafe<{name: string}[]>(
        `SELECT name FROM "Department" WHERE name ILIKE $1 ORDER BY name ASC LIMIT 5`,
        `%${q}%`
      );
      return NextResponse.json(depts.map(d => d.name));
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Error in autocomplete API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
