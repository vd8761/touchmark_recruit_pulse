import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { sendUserInviteEmail } from "@/lib/email";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "Super Admin") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { deleted_at: null },
      include: { role: true },
      orderBy: { created_at: "desc" }
    });
    
    // Remove password hash from response
    const safeUsers = users.map(user => {
      const { password_hash, two_fa_secret, ...rest } = user;
      return rest;
    });

    return NextResponse.json(safeUsers);
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "Super Admin") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role_id, two_fa_method } = body;

    if (!name || !email || !password || !role_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role_id,
        two_fa_method: two_fa_method || "NONE",
        status: "Active"
      },
      include: { role: true }
    });

    // Send the invite email in the background
    sendUserInviteEmail(email, name, password).catch((e) => console.error("Email send error:", e));

    const { password_hash: _ph, two_fa_secret: _ts, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
