import { getEmployeeByCode } from "@/app/actions/get-employee-by-code";
import { getEmployeePayslips } from "@/app/actions/get-employee-payslips";
import { getEmployeeAttendance } from "@/app/actions/get-employee-attendance";
import { getHolidays } from "@/app/actions/get-holidays";
import { notFound } from "next/navigation";
import EmployeeProfileClient from "./EmployeeProfileClient";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EmployeeProfilePage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const empCode = decodeURIComponent(params.code);
  
  const response = await getEmployeeByCode(empCode);

  if (!response.success || !response.data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-xl font-semibold text-slate-700">Employee Not Found</h2>
        <p className="text-slate-500">Could not find any employee matching code "{empCode}"</p>
        <Link href="/employees">
          <Button>Back to Directory</Button>
        </Link>
      </div>
    );
  }

  const employeeId = response.data.employee_ID;
  
  // Fetch payslips, attendance, and holidays in parallel
  const [payslipsRes, attendanceRes, holidaysRes] = await Promise.all([
    getEmployeePayslips(employeeId),
    getEmployeeAttendance(employeeId),
    getHolidays()
  ]);

  return (
    <div className="px-6 py-4 md:px-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-6">
        <Link 
          href="/employees" 
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Employees
        </Link>
      </div>
      
      <EmployeeProfileClient 
        employee={response.data} 
        payslips={payslipsRes.data || []}
        attendance={attendanceRes.data || []}
        holidays={holidaysRes.data || []}
      />
    </div>
  );
}
