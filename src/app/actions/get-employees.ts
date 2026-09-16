"use server";

import { payrollDb } from "@/lib/mysql";

export async function getPayrollEmployees() {
  try {
    const [rows] = await payrollDb.query(`
      SELECT 
        e.employee_ID,
        e.emp_code,
        e.emp_name,
        dep.department_name as emp_department,
        des.designation_title as emp_designation,
        e.emp_emailid,
        e.emp_phoneno,
        e.emp_doj,
        e.emp_status,
        e.emp_fixed_gross,
        e.emp_fixed_gross_annual,
        e.emp_hourly_rate,
        e.emp_bank_acc_no,
        e.emp_bank_ifsc_code,
        e.emp_pf_applicable,
        e.emp_pf_no,
        e.total_el_available,
        e.total_cl_available,
        e.total_sl_available
      FROM gs_employee e
      LEFT JOIN gs_department dep ON e.emp_department = dep.department_ID
      LEFT JOIN gs_designation des ON e.emp_designation = des.designation_ID
      WHERE e.deleted = 0
      ORDER BY e.emp_name ASC
    `);

    return {
      success: true,
      data: rows as any[],
    };
  } catch (error: any) {
    console.error("Error fetching payroll employees:", error);
    return {
      success: false,
      error: "Failed to fetch employee details from the payroll database.",
      details: error.message
    };
  }
}
