import { getPayrollEmployees } from "@/app/actions/get-employees";
import { getPayrollMaster } from "@/app/actions/get-payroll-master";
import { getTimesheetMaster } from "@/app/actions/get-timesheet-master";
import { getHolidays } from "@/app/actions/get-holidays";
import EmployeesClient from "./EmployeesClient";

export const metadata = {
  title: "Payroll Employees | Touchmark Recruit Pulse",
  description: "View and manage employees synchronized from the payroll system.",
};

export default async function EmployeesPage(props: { searchParams: Promise<{ month?: string }> }) {
  const searchParams = await props.searchParams;
  
  // Default to current month if not provided
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const selectedMonth = searchParams.month || defaultMonth;

  // Fetch all required data in parallel — gracefully handle DB being offline
  const [
    employeesRes, 
    payrollMasterRes, 
    timesheetMasterRes, 
    holidaysRes
  ] = await Promise.all([
    getPayrollEmployees(),
    getPayrollMaster(selectedMonth),
    getTimesheetMaster(selectedMonth),
    getHolidays()
  ]);

  const dbOnline = employeesRes.success;

  return (
    <EmployeesClient 
      initialData={employeesRes.data || []} 
      payrollMaster={payrollMasterRes.data || []}
      timesheetMaster={timesheetMasterRes.data || []}
      holidays={holidaysRes.data || []}
      selectedMonth={selectedMonth}
      dbOnline={dbOnline}
      dbError={employeesRes.success ? undefined : (employeesRes.details || employeesRes.error)}
    />
  );
}
