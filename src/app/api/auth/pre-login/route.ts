import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { send2FAEmail } from "@/lib/email";

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

    if (user.status !== "Active") {
      return NextResponse.json({ error: "Your account has been deactivated" }, { status: 403 });
    }

    if (user.two_fa_method === "NONE") {
      return NextResponse.json({ requires2fa: false });
    }

    if (user.two_fa_method === "EMAIL") {
      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10); // 10 mins valid

      await prisma.user.update({
        where: { id: user.id },
        data: { email_otp: otp, email_otp_expiry: expiry }
      });

      await send2FAEmail(user.email, user.name, otp);

      return NextResponse.json({ requires2fa: true, method: "EMAIL" });
    }

    if (user.two_fa_method === "AUTHENTICATOR") {
      // If user hasn't set up the authenticator yet
      if (!user.two_fa_secret) {
        return NextResponse.json({ requires2fa: true, method: "AUTHENTICATOR", setupRequired: true });
      }
      return NextResponse.json({ requires2fa: true, method: "AUTHENTICATOR", setupRequired: false });
    }

    return NextResponse.json({ error: "Invalid 2FA state" }, { status: 500 });
  } catch (error: any) {
    console.error("Pre-login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
