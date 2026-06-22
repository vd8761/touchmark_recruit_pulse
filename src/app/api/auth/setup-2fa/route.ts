import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
const { generateSecret, generateURI } = require("otplib");
import qrcode from "qrcode";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.two_fa_method !== "AUTHENTICATOR") {
      return NextResponse.json({ error: "Authenticator not required for this user" }, { status: 400 });
    }

    // Generate new secret
    const secret = generateSecret();
    const service = "Touchmark RecruitPulse";
    const otpauth = generateURI({ issuer: service, label: user.email, secret });
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    // Persist secret directly (since they must complete this to login anyway)
    await prisma.user.update({
      where: { id: user.id },
      data: { two_fa_secret: secret }
    });

    return NextResponse.json({ qrCodeUrl, secret });
  } catch (error: any) {
    console.error("Setup 2FA error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
