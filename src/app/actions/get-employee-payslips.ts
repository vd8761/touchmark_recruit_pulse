"use server";

import { payrollDb } from "@/lib/mysql";

export async function getEmployeePayslips(employeeId: string | number) {
  try {
    const [rows] = await payrollDb.query(`
      SELECT 
        actual_payslip_id,
        payslip_month,
        total_no_of_working_days,
        total_paid_days,
        total_lop_days,
        total_gross_monthly,
        total_deductions,
        net_payable,
        generated_on
      FROM gs_payslip_actual
      WHERE employee_id = ? AND deleted = 0
      ORDER BY payslip_month DESC
      LIMIT 12
    `, [employeeId]);

    return {
      success: true,
      data: rows as any[],
    };
  } catch (error: any) {
    console.error("Error fetching employee payslips:", error);
    return {
      success: false,
      error: "Failed to fetch employee payslips.",
      details: error.message
    };
  }
}
