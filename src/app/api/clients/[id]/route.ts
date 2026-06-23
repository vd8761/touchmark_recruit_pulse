import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendClientModifiedAlert, sendClientDeletedAlert } from "@/lib/email";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role || "Viewer";
    if (!["Super Admin", "Admin", "Business Development"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient role" }, { status: 403 });
    }

    const body = await req.json();
    const { company_name, contact_person, touchmark_poc, email, country_code, phone, industry, address, notes, status } = body;
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    const client = await prisma.client.update({
      where: { id },
      data: {
        company_name,
        contact_person,
        touchmark_poc,
        email,
        country_code,
        phone,
        industry,
        address,
        notes,
        status,
        updated_by: user?.id,
      },
    });

    // Send email alert asynchronously
    sendClientModifiedAlert(company_name, user?.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role || "Viewer";
    if (!["Super Admin", "Admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient role to delete clients" }, { status: 403 });
    }

    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Soft delete with transaction to include audit log
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: { 
          deleted_at: new Date(),
          updated_by: user?.id,
        },
      });

      await tx.auditLog.create({
        data: {
          entity_type: "Client",
          entity_id: id,
          action: "Soft Delete",
          old_values: existingClient as any,
          reason: `Deleted Client: ${existingClient.company_name}`,
          modified_by: user?.id,
        }
      });
    });

    // Send email alert asynchronously
    sendClientDeletedAlert(existingClient.company_name, user?.name || "System").catch(e => console.error("Email failed:", e));

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
