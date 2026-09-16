"use server";

import { payrollDb } from "@/lib/mysql";

export async function getTimesheetMaster(month: string) {
  try {
    // month is expected to be 'YYYY-MM'
    
    // Fetch all attendance records for all active employees for the given month
    const [rows] = await payrollDb.query(`
      SELECT 
        a.employee_ID,
        DATE_FORMAT(a.attendance_checkin_date, '%Y-%m-%d') as date_str,
        a.checkin_time,
        a.checkout_time,
        a.total_work_duration,
        a.late_time,
        a.early_time,
        a.attendance_status,
        a.emp_day_status
      FROM gs_daily_actual_attendance a
      INNER JOIN gs_employee e ON a.employee_ID = e.employee_ID
      WHERE e.deleted = 0
        AND a.attendance_checkin_date LIKE CONCAT(?, '%')
      ORDER BY a.employee_ID, a.attendance_checkin_date ASC
    `, [month]);

    return {
      success: true,
      data: rows as any[],
    };
  } catch (error: any) {
    console.error("Error fetching timesheet master:", error);
    return {
      success: false,
      error: "Failed to fetch timesheet master data.",
      details: error.message
    };
  }
}
