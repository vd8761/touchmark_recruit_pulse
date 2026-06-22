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
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json(); // Expected format: { currencyCode: "USD", currencySymbol: "$" }
    
    // Save each setting
    const updatePromises = Object.entries(data).map(([key, value]) => {
      if (typeof value !== "string") return Promise.resolve(); // Only string values allowed for now
      return prisma.appSetting.upsert({
        where: { key },
        update: { 
          value,
          updated_by: session.user.id
        },
        create: {
          key,
          value,
          updated_by: session.user.id
        }
      });
    });

    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
