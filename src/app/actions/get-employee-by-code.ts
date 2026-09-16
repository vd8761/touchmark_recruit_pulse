"use server";

import { payrollDb } from "@/lib/mysql";

export async function getEmployeeByCode(empCode: string) {
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
      WHERE e.emp_code = ? AND e.deleted = 0
      LIMIT 1
    `, [empCode]);

    const data = rows as any[];
    if (data.length === 0) {
      return { success: false, error: "Employee not found." };
    }

    return {
      success: true,
      data: data[0],
    };
  } catch (error: any) {
    console.error("Error fetching employee by code:", error);
    return {
      success: false,
      error: "Failed to fetch employee details.",
      details: error.message
    };
  }
}
