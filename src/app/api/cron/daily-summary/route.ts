import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailySummaryAlert } from "@/lib/email";

// Vercel Cron will hit this endpoint securely if we configure it
export async function GET(req: Request) {
  try {
    // Optional: Protect this route if you only want Vercel Cron or specific auth to hit it
    // For Vercel Cron, you check the Authorization header against a CRON_SECRET
    /*
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    */

    const clients = await prisma.client.findMany({
      where: { deleted_at: null },
      include: {
        positions: {
          where: { deleted_at: null }
        }
      }
    });

    const summaryData = clients.map(client => {
      let openPositions = 0;
      let closedPositions = 0;
      let activeResources = 0;
      let fulfilledResources = 0;

      client.positions.forEach(pos => {
        if (pos.status === "Closed") {
          closedPositions++;
        } else {
          openPositions++;
        }

        activeResources += (pos.requested_count - pos.closed_count);
        fulfilledResources += pos.closed_count;
      });

      return {
        clientName: client.company_name,
        openPositions,
        closedPositions,
        activeResources,
        fulfilledResources
      };
    });

    // Only send if there's actually data
    if (summaryData.length > 0) {
      await sendDailySummaryAlert(summaryData);
    }

    return NextResponse.json({ message: "Daily summary sent successfully", data: summaryData });
  } catch (error) {
    console.error("Failed to generate daily summary:", error);
    return NextResponse.json({ error: "Failed to generate daily summary" }, { status: 500 });
  }
}
