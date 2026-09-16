"use server";

import { payrollDb } from "@/lib/mysql";

export async function getHolidays() {
  try {
    const [rows] = await payrollDb.query(`
      SELECT 
        holiday_id,
        holiday_title,
        holiday_type,
        holiday_date
      FROM gs_holiday
      WHERE status = 1 AND deleted = 0
      ORDER BY holiday_date ASC
    `);

    return {
      success: true,
      data: rows as any[],
    };
  } catch (error: any) {
    console.error("Error fetching holidays:", error);
    return {
      success: false,
      error: "Failed to fetch holidays.",
      details: error.message
    };
  }
}
