import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany();
    // Convert to a key-value object
    const settingsMap = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    return NextResponse.json(settingsMap);
  } catch (error: any) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = await req.json(); // Expected format: { currencyCode: "USD", currencySymbol: "$" }
    
    // Save each setting
    const updatePromises = Object.entries(data).map(([key, value]) => {
      if (typeof value !== "string") return Promise.resolve(); // Only string values allowed for now
      return prisma.appSetting.upsert({
        where: { key },
        update: { 
          value,
          updated_by: user.id
        },
        create: {
          key,
          value,
          updated_by: user.id
        }
      });
    });

    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
