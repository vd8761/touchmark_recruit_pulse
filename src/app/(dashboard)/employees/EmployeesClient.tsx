"use client";

import { useState, useMemo } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Eye, Users, Briefcase, Mail, Phone, 
  Calendar as CalendarIcon, FileText, IndianRupee, 
  TrendingUp, TrendingDown, WifiOff, UserCheck
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function EmployeesClient({ 
  initialData, 
  payrollMaster = [],
  timesheetMaster = [], 
  holidays = [], 
  selectedMonth = "",
  dbOnline = true,
  dbError
}: { 
  initialData: any[],
  payrollMaster?: any[],
  timesheetMaster?: any[],
  holidays?: any[],
  selectedMonth?: string,
  dbOnline?: boolean,
  dbError?: string
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const [empFilter, setEmpFilter] = useState<"active" | "others">("active");
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const filteredData = initialData.filter(emp => 
    emp.emp_name?.toLowerCase().includes(search.toLowerCase()) || 
    emp.emp_code?.toLowerCase().includes(search.toLowerCase()) ||
    emp.emp_emailid?.toLowerCase().includes(search.toLowerCase())
  );

  // Active = New Joined (1), Provisional (2), Regular/Confirmed (3)
  // Others = Suspension (4), Long Absent (5), Resigned (6), Terminated (7)
  const activeData = filteredData.filter(emp => [1, 2, 3].includes(Number(emp.emp_status)));
  const inactiveData = filteredData.filter(emp => ![1, 2, 3].includes(Number(emp.emp_status)));

  // Month helpers
  const [yearStr, monthStr] = (selectedMonth || "2026-09").split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const handleMonthChange = (newMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    router.push(pathname + '?' + params.toString());
    setIsMonthPickerOpen(false);
  };

  const getStatusBadge = (status: number) => {
    switch(status) {
      case 1: return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 font-medium">New Joined</Badge>;
      case 2: return <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100 font-medium">Provisional</Badge>;
      case 3: return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 font-medium">Regular/Confirmed</Badge>;
      case 4: return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100 font-medium">Suspension</Badge>;
      case 5: return <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100 font-medium">Long Absent</Badge>;
      case 6: return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 font-medium">Resigned</Badge>;
      case 7: return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100 font-medium">Terminated</Badge>;
      default: return <Badge variant="outline" className="text-slate-400">Status {status}</Badge>;
    }
  };

  const formatCurrency = (val: number | string | null | undefined) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val));
  };

  // --- Directory Tab ---
  const renderDirectoryTable = (data: any[]) => (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
              <TableHead className="font-semibold text-slate-600 text-[13px] py-3">Code</TableHead>
              <TableHead className="font-semibold text-slate-600 text-[13px]">Employee</TableHead>
              <TableHead className="font-semibold text-slate-600 text-[13px]">Contact</TableHead>
              <TableHead className="font-semibold text-slate-600 text-[13px]">Joined</TableHead>
              <TableHead className="font-semibold text-slate-600 text-[13px]">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 text-[13px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((emp) => (
              <TableRow key={emp.employee_ID} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
                <TableCell className="font-mono text-[13px] font-medium text-slate-500 py-3">{emp.emp_code}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-[14px]">{emp.emp_name}</span>
                    <span className="text-[12px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" /> {emp.emp_designation || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-300" /> {emp.emp_emailid || '-'}
                    </span>
                    <span className="text-[12px] text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-300" /> {emp.emp_phoneno || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-slate-500">
                  {emp.emp_doj ? new Date(emp.emp_doj).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </TableCell>
                <TableCell>{getStatusBadge(emp.emp_status)}</TableCell>
                <TableCell className="text-right">
                  <Link 
                    href={`/employees/${emp.emp_code}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-sm">
                  No employees found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // --- Timesheet Tab ---
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayAttendance = (empId: number | string, day: number) => {
    const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return timesheetMaster.find(t => 
      String(t.employee_ID) === String(empId) && t.date_str === targetDate
    );
  };

  // Debug: log first record to see actual field values
  if (timesheetMaster.length > 0) {
    console.log('[Timesheet Debug] Sample record:', JSON.stringify(timesheetMaster[0]));
    console.log('[Timesheet Debug] First employee_ID in grid:', initialData[0]?.employee_ID);
  }

  const isHoliday = (day: number) => {
    const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => {
      if (!h.holiday_date) return false;
      const d = new Date(h.holiday_date);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return ds === targetDate;
    });
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const renderTimesheetTab = () => (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-[15px]">Monthly Attendance Grid</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
            {' · '}
            <span className={timesheetMaster.length > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
              {timesheetMaster.length} attendance records loaded
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-[12px] font-medium text-slate-600 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-sm"></span>Present</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block shadow-sm"></span>Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block shadow-sm"></span>Half Day</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block shadow-sm"></span>Week Off</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500 inline-block shadow-sm"></span>Holiday</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="sticky left-0 z-20 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] font-semibold text-slate-600 text-[13px] w-48">Employee</TableHead>
              {daysArray.map(day => {
                const h = isHoliday(day);
                const w = isWeekend(day);
                const date = new Date(year, month, day);
                const dayName = date.toLocaleDateString('en', { weekday: 'narrow' });
                return (
                  <TableHead key={day} className={`text-center font-medium min-w-[40px] p-1 text-[11px] border-l border-slate-100 ${h ? 'bg-violet-50 text-violet-600' : w ? 'bg-slate-100 text-slate-400' : 'text-slate-500'}`}>
                    <div className="font-bold">{day}</div>
                    <div className="text-[10px] font-normal opacity-70">{dayName}</div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.filter(e => [1,2,3].includes(e.emp_status)).map(emp => (
              <TableRow key={emp.employee_ID} className="hover:bg-slate-50/50 border-b border-slate-50">
                <TableCell className="font-medium text-slate-800 text-[13px] whitespace-nowrap sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e2e8f0] py-2">
                  {emp.emp_name}
                  <div className="text-[10px] text-slate-400 font-normal">{emp.emp_code}</div>
                </TableCell>
                {daysArray.map(day => {
                  const h = isHoliday(day);
                  const w = isWeekend(day);
                  const att = getDayAttendance(emp.employee_ID, day);
                  
                  let content = <span className="text-slate-300">-</span>;
                  let cellClass = "";
                  
                  if (h) {
                    content = <span className="text-violet-600 font-bold text-[11px]">H</span>;
                    cellClass = "bg-violet-50/60";
                  } else if (w) {
                    content = <span className="text-slate-400 text-[11px]">W</span>;
                    cellClass = "bg-slate-50";
                  } else if (att) {
                    const attStatus = Number(att.attendance_status);
                    // attendance_status: 1=Full Day, 2=Half Day, 3=Absent, 4=Week Off, 5=Holiday, 6=On Duty
                    if (attStatus === 1 || attStatus === 6) {
                      // Present / On Duty
                      if (att.total_work_duration && att.total_work_duration !== '00:00:00') {
                        const [hrs, mins] = att.total_work_duration.split(':');
                        content = <span className="text-emerald-700 font-semibold text-[10px]">{hrs}:{mins}</span>;
                      } else {
                        content = <span className="text-emerald-700 font-bold text-[11px]">P</span>;
                      }
                      cellClass = "bg-emerald-50/60";
                    } else if (attStatus === 2) {
                      // Half Day
                      content = <span className="text-amber-600 font-bold text-[11px]">HD</span>;
                      cellClass = "bg-amber-50/60";
                    } else if (attStatus === 3) {
                      // Absent
                      content = <span className="text-rose-500 font-bold text-[11px]">A</span>;
                      cellClass = "bg-rose-50/60";
                    } else if (attStatus === 4) {
                      // Week Off (from attendance record)
                      content = <span className="text-slate-400 text-[11px]">W</span>;
                      cellClass = "bg-slate-50";
                    } else if (attStatus === 5) {
                      // Holiday (from attendance record)
                      content = <span className="text-violet-600 font-bold text-[11px]">H</span>;
                      cellClass = "bg-violet-50/60";
                    } else {
                      // Checkin exists but unknown status
                      content = <span className="text-emerald-700 font-bold text-[11px]">P</span>;
                      cellClass = "bg-emerald-50/60";
                    }
                  } else {
                    const date = new Date(year, month, day);
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (date < today) {
                      content = <span className="text-rose-400 font-bold text-[11px]">A</span>;
                      cellClass = "bg-rose-50/40";
                    }
                  }

                  return (
                    <TableCell key={day} className={`text-center p-1 border-l border-slate-50 ${cellClass}`}>
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {initialData.filter(e => [1,2,3].includes(e.emp_status)).length === 0 && (
              <TableRow>
                <TableCell colSpan={daysInMonth + 1} className="h-32 text-center text-slate-400 text-sm">
                  No active employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // --- Payroll Tab ---
  const actualTotalGross = payrollMaster.reduce((sum, p) => sum + (Number(p.gross_salary) || 0), 0);
  const actualTotalDed = payrollMaster.reduce((sum, p) => sum + (Number(p.total_deductions) || 0), 0);
  const actualTotalNet = payrollMaster.reduce((sum, p) => sum + (Number(p.net_payable) || 0), 0);

  const estimatedCompanyPayroll = useMemo(() => {
    if (!activeData.length || !selectedMonth) return null;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    
    // Create holiday lookup
    const holidayLookup = new Set<number>();
    holidays.forEach(h => {
      const d = new Date(h.holiday_date);
      if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
        holidayLookup.add(d.getDate());
      }
    });

    let totalEstGross = 0;
    let totalEstDed = 0;
    let totalEstNet = 0;

    activeData.forEach(emp => {
      const fixedGross = Number(emp.emp_fixed_gross) || 0;
      if (fixedGross === 0) return;

      const empAtt = timesheetMaster.filter(a => a.employee_ID === emp.employee_ID);
      const attLookup = new Map();
      empAtt.forEach(a => {
        const d = new Date(a.date_str).getDate();
        attLookup.set(d, a);
      });

      let lopDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        const isHoliday = holidayLookup.has(day);
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isFuture = d > today;
        
        const record = attLookup.get(day);

        if (!record) {
          if (!isHoliday && !isWeekend && !isFuture) {
            lopDays += 1;
          }
        } else {
          const attStatus = Number(record.attendance_status);
          if (attStatus === 3) lopDays += 1;
          else if (attStatus === 2) lopDays += 0.5;
        }
      }

      const perDay = fixedGross / daysInMonth;
      const ded = lopDays * perDay;
      const net = fixedGross - ded;

      totalEstGross += fixedGross;
      totalEstDed += ded;
      totalEstNet += net;
    });

    return { totalEstGross, totalEstDed, totalEstNet };
  }, [activeData, timesheetMaster, holidays, selectedMonth]);

  const renderPayrollTab = () => (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Actual Payroll (Processed) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" /> Processed Payroll
            </h3>
            <Badge variant="outline" className="bg-white">{payrollMaster.length > 0 ? 'Generated' : 'Not Generated'}</Badge>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="p-4 flex flex-col items-center text-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gross</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(actualTotalGross)}</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deductions</p>
              <p className="text-lg font-bold text-rose-500">{formatCurrency(actualTotalDed)}</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center bg-slate-50/50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Pay</p>
              <p className="text-xl font-bold text-indigo-700">{formatCurrency(actualTotalNet)}</p>
            </div>
          </div>
        </div>

        {/* Estimated Payroll */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
          <div className="bg-white/40 border-b border-indigo-100/50 px-5 py-3 flex items-center justify-between">
            <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-indigo-500" /> Estimated Payroll Cost
            </h3>
            <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-200">Based on Attendance</Badge>
          </div>
          <div className="grid grid-cols-3 divide-x divide-indigo-100/50">
            <div className="p-4 flex flex-col items-center text-center">
              <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-widest mb-1">Est. Gross</p>
              <p className="text-lg font-bold text-indigo-950">{formatCurrency(estimatedCompanyPayroll?.totalEstGross)}</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
              <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-widest mb-1">Est. LOP Deduct</p>
              <p className="text-lg font-bold text-rose-500">{formatCurrency(estimatedCompanyPayroll?.totalEstDed)}</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center bg-white/30">
              <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-widest mb-1">Est. Net</p>
              <p className="text-xl font-bold text-indigo-700">{formatCurrency(estimatedCompanyPayroll?.totalEstNet)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Register */}
      <div className="rounded-[16px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-[15px]">Employee-Wise Payroll Register</h3>
            <p className="text-xs text-slate-400 mt-0.5">{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>
          <Badge variant="outline" className="text-slate-500">{payrollMaster.length} employees</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                <TableHead className="font-semibold text-slate-600 text-[13px] sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">Employee</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[13px]">Designation</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[13px]">PF / UAN</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[13px]">ESI No</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[13px]">Bank A/C</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[13px]">Bank</TableHead>
                <TableHead className="text-center font-semibold text-slate-600 text-[13px]">Paid Days</TableHead>
                <TableHead className="text-center font-semibold text-slate-600 text-[13px]">LOP</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 text-[13px]">Gross</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 text-[13px]">Deduction</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 text-[13px] sticky right-0 bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0]">Net Pay</TableHead>
                <TableHead className="text-center font-semibold text-slate-600 text-[13px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollMaster.map((emp) => (
                <TableRow key={emp.employee_ID} className="hover:bg-slate-50/70 border-b border-slate-100 last:border-0">
                  <TableCell className="sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e2e8f0] py-3">
                    <span className="font-semibold text-slate-900 text-[13px] block">{emp.emp_name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{emp.emp_code}</span>
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-500">{emp.designation_title || '-'}</TableCell>
                  <TableCell className="text-[12px] text-slate-500">{emp.uan_no || '-'}</TableCell>
                  <TableCell className="text-[12px] text-slate-500">{emp.esi_no || '-'}</TableCell>
                  <TableCell className="text-[12px] text-slate-500 font-mono">{emp.emp_bank_acc_no || '-'}</TableCell>
                  <TableCell className="text-[12px] text-slate-500">{emp.bank_name || '-'}</TableCell>
                  <TableCell className="text-center text-[13px] font-semibold text-emerald-600">{emp.total_paid_days || 0}</TableCell>
                  <TableCell className="text-center text-[13px] font-semibold text-rose-500">{emp.total_lop_days || 0}</TableCell>
                  <TableCell className="text-right text-[13px] text-slate-700 font-medium">{formatCurrency(emp.gross_salary)}</TableCell>
                  <TableCell className="text-right text-[13px] text-rose-600">{formatCurrency(emp.total_deductions)}</TableCell>
                  <TableCell className="text-right font-bold text-[13px] text-slate-900 sticky right-0 bg-white shadow-[-1px_0_0_0_#e2e8f0]">
                    {formatCurrency(emp.net_payable)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link 
                      href={`/employees/${emp.emp_code}`}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Eye className="w-3 h-3" /> View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {payrollMaster.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center text-slate-400 text-sm">
                    No payroll data available for {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">

      {/* DB Offline Banner */}
      {!dbOnline && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 shadow-sm flex items-start gap-3">
          <WifiOff className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h4 className="font-bold text-[14px]">Payroll Database Unreachable</h4>
            <p className="text-sm mt-0.5 text-amber-700">Timesheet and payroll data will be empty until the connection is restored. Check your firewall / VPN settings.</p>
            {dbError && <code className="mt-1.5 block rounded bg-amber-100 px-2 py-1 font-mono text-[11px] text-amber-700">{dbError}</code>}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 sm:p-6 rounded-[16px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">HR & Payroll Dashboard</h1>
          <p className="mt-1 text-[14px] font-medium text-slate-500">
            Employee directory, monthly timesheets, and payroll registers
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search employees..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56 bg-slate-50 border-slate-200 focus:bg-white rounded-lg text-[13px]"
            />
          </div>
          {/* Month Picker */}
          <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
            <PopoverTrigger className="inline-flex h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </PopoverTrigger>
            <PopoverContent className="w-[268px] p-3 rounded-2xl shadow-lg border-slate-200" align="end">
              <div className="flex items-center justify-between mb-3 px-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500"
                  onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set('month', `${year - 1}-${monthStr}`); router.push(pathname + '?' + p.toString()); }}>
                  ‹
                </Button>
                <span className="font-semibold text-slate-800 text-sm">{year}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500"
                  onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set('month', `${year + 1}-${monthStr}`); router.push(pathname + '?' + p.toString()); }}>
                  ›
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((mName, i) => (
                  <Button key={mName} variant={i === month ? "default" : "ghost"}
                    className={`h-8 rounded-lg text-sm ${i === month ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    onClick={() => handleMonthChange(`${year}-${String(i + 1).padStart(2, '0')}`)}>
                    {mName}
                  </Button>
                ))}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-semibold h-7 px-2"
                  onClick={() => { const n = new Date(); handleMonthChange(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`); }}>
                  This Month
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-60 z-0"></div>
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-amber-50 rounded-full blur-3xl opacity-60 z-0"></div>
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Custom Tab Nav */}
        <div className="grid grid-cols-3 w-full bg-slate-100/80 border border-slate-200 p-1 rounded-[14px] gap-1 mb-5">
          {[
            { key: 'directory', icon: Users, label: 'Employee Directory', count: initialData.length },
            { key: 'timesheet', icon: CalendarIcon, label: 'Timesheet View', count: null },
            { key: 'payroll',   icon: FileText,    label: 'Payroll Overview', count: null },
          ].map(({ key, icon: Icon, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-2 rounded-[10px] py-3 text-[13px] font-semibold transition-all duration-200 ${
                activeTab === key
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${activeTab === key ? 'text-amber-500' : ''}`} />
              {label}
              {count !== null && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  activeTab === key ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-slate-400'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <TabsContent value="directory" className="mt-0">
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => setEmpFilter('active')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${
                empFilter === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Active Employees
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                empFilter === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{activeData.length}</span>
            </button>
            <button
              onClick={() => setEmpFilter('others')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${
                empFilter === 'others'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Others
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                empFilter === 'others' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{inactiveData.length}</span>
            </button>
          </div>
          {renderDirectoryTable(empFilter === 'active' ? activeData : inactiveData)}
        </TabsContent>

        <TabsContent value="timesheet" className="mt-0">
          {renderTimesheetTab()}
        </TabsContent>

        <TabsContent value="payroll" className="mt-0">
          {renderPayrollTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
