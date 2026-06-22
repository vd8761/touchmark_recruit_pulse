"use server";

import { prisma } from "@/lib/prisma";

export async function getRecentNotifications() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: { modifier: true }
    });

    return logs.map(log => {
      let message = "";
      if (log.action === "Create") {
        message = `New ${log.entity_type} created`;
      } else if (log.action === "Update") {
        message = `${log.entity_type} was modified: ${log.reason || 'No reason provided'}`;
      } else if (log.action === "Delete") {
        message = `${log.entity_type} was deleted: ${log.reason || 'No reason provided'}`;
      } else {
        message = `${log.action} ${log.entity_type}${log.reason ? `: ${log.reason}` : ''}`;
      }

      return {
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        message,
        timestamp: log.timestamp,
        modifier_name: log.modifier?.name || 'System'
      };
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}
