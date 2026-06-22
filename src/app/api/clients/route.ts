import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { sendClientCreatedAlert } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { client_name, company_name, contact_person, touchmark_poc, email, country_code, phone, industry, address, notes, status } = body;

    // Get the user to record the creator
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await prisma.client.create({
      data: {
        client_name,
        company_name,
        contact_person,
        touchmark_poc,
        email,
        country_code,
        phone,
        industry,
        address,
        notes,
        status: status || "Active",
        created_by: user.id,
      },
    });

    // Send email alert asynchronously (no await to avoid blocking response)
    sendClientCreatedAlert(client_name, company_name, user.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
