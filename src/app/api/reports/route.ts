import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType');
    const clientId = searchParams.get('clientId');
    const roleName = searchParams.get('roleName');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build common filter for positions
    const positionWhere: any = { deleted_at: null };
    if (clientId) positionWhere.client_id = clientId;
    if (roleName) positionWhere.role_name = roleName;
    if (status) positionWhere.status = status;
    if (startDate || endDate) {
      positionWhere.expected_joining_date = {};
      if (startDate) positionWhere.expected_joining_date.gte = new Date(startDate);
      if (endDate) positionWhere.expected_joining_date.lte = new Date(endDate);
    }

    switch (reportType) {
      case 'client_positions':
      case 'role_requirements':
      case 'open_vs_closed':
      case 'revenue_projection': {
        const positions = await prisma.position.findMany({
          where: positionWhere,
          include: {
            client: { select: { company_name: true } }
          },
          orderBy: { created_at: "desc" }
        });
        return NextResponse.json(positions);
      }
      
      case 'monthly_closures': {
        // For monthly closures, filter the closures instead of the positions
        const closureWhere: any = {};
        if (startDate || endDate) {
          closureWhere.closure_date = {};
          if (startDate) closureWhere.closure_date.gte = new Date(startDate);
          if (endDate) closureWhere.closure_date.lte = new Date(endDate);
        }
        if (clientId || roleName || status) {
          closureWhere.position = { deleted_at: null };
          if (clientId) closureWhere.position.client_id = clientId;
          if (roleName) closureWhere.position.role_name = roleName;
          if (status) closureWhere.position.status = status;
        }

        const closures = await prisma.positionClosure.findMany({
          where: closureWhere,
          include: {
            position: {
              include: {
                client: { select: { company_name: true } }
              }
            },
            closer: { select: { name: true } }
          },
          orderBy: { closure_date: "asc" }
        });
        return NextResponse.json(closures);
      }

      case 'audit_logs': {
        const auditWhere: any = {};
        if (startDate || endDate) {
          auditWhere.timestamp = {};
          if (startDate) auditWhere.timestamp.gte = new Date(startDate);
          if (endDate) auditWhere.timestamp.lte = new Date(endDate);
        }
        const logs = await prisma.auditLog.findMany({
          where: auditWhere,
          include: {
            modifier: { select: { name: true, email: true } }
          },
          orderBy: { timestamp: "desc" }
        });
        return NextResponse.json(logs);
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
