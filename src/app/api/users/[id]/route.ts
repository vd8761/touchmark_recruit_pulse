import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["Super Admin", "Admin"].includes(session.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await props.params;
    const body = await req.json();
    const { name, email, password, role_id, status, two_fa_method } = body;

    const dataToUpdate: any = {
      name,
      email,
      status,
      two_fa_method
    };

    if (role_id) {
      dataToUpdate.role = { connect: { id: role_id } };
    }

    if (password) {
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: { role: true }
    });

    const { password_hash: _ph, two_fa_secret: _ts, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["Super Admin", "Admin"].includes(session.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await props.params;
    
    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deleted_at: new Date(), status: "Inactive" }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
