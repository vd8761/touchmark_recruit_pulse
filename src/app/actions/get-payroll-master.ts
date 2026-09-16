"use server";

import { payrollDb } from "@/lib/mysql";

export async function getPayrollMaster(month: string) {
  try {
    // month is expected to be 'YYYY-MM'
    
    // We join the employee with their payslip for this exact month
    const [rows] = await payrollDb.query(`
      SELECT 
        e.employee_ID,
        e.emp_code,
        e.emp_name,
        des.designation_title,
        e.emp_pf_no as uan_no,
        NULL as esi_no, 
        e.emp_bank_acc_no,
        b.bank_name,
        p.total_no_of_working_days,
        p.total_paid_days,
        p.total_lop_days,
        p.total_gross_monthly as gross_salary,
        p.net_payable,
        p.total_deductions
      FROM gs_employee e
      LEFT JOIN gs_designation des ON e.emp_designation = des.designation_ID
      LEFT JOIN gs_bank b ON e.emp_bank_id = b.bank_id
      LEFT JOIN gs_payslip_actual p ON e.employee_ID = p.employee_ID AND p.payslip_month = ?
      WHERE e.deleted = 0 AND e.status = 1
      ORDER BY e.emp_name ASC
    `, [month]);

    // Format the response
    return {
      success: true,
      data: rows as any[],
    };
  } catch (error: any) {
    console.error("Error fetching payroll master:", error);
    return {
      success: false,
      error: "Failed to fetch payroll master data.",
      details: error.message
    };
  }
}
