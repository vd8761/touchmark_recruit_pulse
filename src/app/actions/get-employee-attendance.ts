"use server";

import { payrollDb } from "@/lib/mysql";

export async function getEmployeeAttendance(employeeId: string | number) {
  try {
    const [rows] = await payrollDb.query(`
      SELECT 
        daily_actual_attendance_id,
        attendance_checkin_date,
        checkin_time,
        checkout_time,
        total_work_duration,
        total_overtime,
        late_time,
        early_time,
        emp_day_status,
        attendance_status
      FROM gs_daily_actual_attendance
      WHERE employee_id = ? AND deleted = 0
      ORDER BY attendance_checkin_date DESC
      LIMIT 365
    `, [employeeId]);

    return {
      success: true,
      data: rows as any[],
    };
  } catch (error: any) {
    console.error("Error fetching employee attendance:", error);
    return {
      success: false,
      error: "Failed to fetch employee attendance.",
      details: error.message
    };
  }
}
