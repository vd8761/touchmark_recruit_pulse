"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Mail, Phone, IndianRupee, Users, Clock, CalendarDays, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EmployeeProfileClient({ 
  employee,
  payslips,
  attendance,
  holidays = []
}: { 
  employee: any,
  payslips: any[],
  attendance: any[],
  holidays?: any[]
}) {

  const currentMonth = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [activeTab, setActiveTab] = useState("overview");

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    attendance.forEach(att => {
      if (att.attendance_checkin_date) {
        const d = new Date(att.attendance_checkin_date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
      }
    });
    months.add(currentMonth);
    return Array.from(months).sort().reverse();
  }, [attendance, currentMonth]);

  // Generate full month calendar days
  const calendarDays = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    
    // Get number of days in the selected month
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const generatedDays = [];
    
    // Create a lookup for fast access
    const attendanceLookup = new Map();
    attendance.forEach(att => {
      if (att.attendance_checkin_date) {
        const d = new Date(att.attendance_checkin_date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        attendanceLookup.set(dateStr, att);
      }
    });

    const holidayLookup = new Map();
    holidays.forEach(h => {
      if (h.holiday_date) {
        const d = new Date(h.holiday_date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        holidayLookup.set(dateStr, h);
      }
    });

    // Start from the last day of the month down to the 1st (descending order)
    for (let day = daysInMonth; day >= 1; day--) {
      const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
      const d = new Date(Number(year), Number(month) - 1, day);
      
      const attRecord = attendanceLookup.get(dateStr);
      const isHoliday = holidayLookup.has(dateStr);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFuture = d > today;

      let statusType = 'normal';
      let record = attRecord || null;

      if (isHoliday) {
        statusType = 'holiday';
      } else if (isWeekend) {
        statusType = 'weekoff';
      } else if (!attRecord && !isFuture) {
        // Missing record on a past weekday
        statusType = 'absent';
      } else if (!attRecord && isFuture) {
        statusType = 'future';
      }

      generatedDays.push({
        dateStr,
        dateObj: d,
        record,
        statusType,
        holidayInfo: isHoliday ? holidayLookup.get(dateStr) : null
      });
    }

    return generatedDays;
  }, [attendance, selectedMonth, holidays]);

  const estimatedPayroll = useMemo(() => {
    if (!selectedMonth || !employee.emp_fixed_gross) return null;
    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
    
    let lopDays = 0;
    
    calendarDays.forEach(day => {
      if (day.statusType === 'absent') {
        // Absent day (missing record on past weekday)
        lopDays += 1;
      } else if (day.record) {
        // Look at the DB attendance_status
        const attStatus = Number(day.record.attendance_status);
        if (attStatus === 2 || attStatus === 3) { // 3 in gs_daily_actual_attendance means Absent based on previous logic (Wait, let's use the UI badge logic: 2 is Absent, 3 is Half Day)
           // Let's rely on the previous mapping we established: 
           // 1=Full Day, 2=Half Day, 3=Absent, 4=Week Off, 5=Holiday, 6=On Duty
           if (attStatus === 3) {
             lopDays += 1;
           } else if (attStatus === 2) {
             lopDays += 0.5;
           }
        }
      }
    });

    const perDaySalary = employee.emp_fixed_gross / daysInMonth;
    const estimatedDeduction = lopDays * perDaySalary;
    const estimatedNet = employee.emp_fixed_gross - estimatedDeduction;

    return {
      daysInMonth,
      lopDays,
      paidDays: daysInMonth - lopDays,
      perDaySalary,
      estimatedDeduction,
      estimatedNet,
      gross: employee.emp_fixed_gross
    };
  }, [calendarDays, employee.emp_fixed_gross, selectedMonth]);

  const getStatusBadge = (status: number) => {
    switch(status) {
      case 1: return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">New Joined</Badge>;
      case 2: return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none">Regular/Provisional</Badge>;
      case 3: return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Regular/Confirmed</Badge>;
      case 4: return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">Suspension</Badge>;
      case 5: return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">Long Absent</Badge>;
      case 6: return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">Resigned</Badge>;
      case 7: return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">Terminated</Badge>;
      default: return <Badge variant="outline" className="px-3 py-1">Unknown</Badge>;
    }
  };

  const formatCurrency = (val: number | string | null) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val));
  };

  const getAttendanceStatusBadge = (dayData: any) => {
    if (dayData.statusType === 'holiday') {
      return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Holiday</Badge>;
    }
    
    if (dayData.statusType === 'weekoff') return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-100">Week Off</Badge>;
    if (dayData.statusType === 'future') return <Badge variant="outline" className="text-slate-300 border-slate-100 bg-transparent">-</Badge>;
    if (dayData.statusType === 'absent') return <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">Absent</Badge>;
    
    const att = dayData.record;
    if (!att) return <Badge variant="outline">Unknown</Badge>;

    switch(Number(att.attendance_status)) {
      case 1: return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Present</Badge>;
      case 2: return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Half Day</Badge>;
      case 3: return <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">Absent</Badge>;
      case 4: return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">Week Off</Badge>;
      case 5: return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Holiday</Badge>;
      case 6: return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">On Duty</Badge>;
      case 0: return <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50">Not Marked</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
        {/* Header Banner */}
        <div className="bg-slate-900 px-6 py-5 md:py-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Briefcase className="w-48 h-48 text-white transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-[3px] border-slate-800 shrink-0">
              {employee.emp_name?.charAt(0)?.toUpperCase()}
            </div>
            
            <div className="flex flex-col text-center md:text-left mt-1 md:mt-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                {employee.emp_name}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1">
                <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded text-sm border border-indigo-900 shadow-inner">
                  {employee.emp_code}
                </span>
                <div className="w-1 h-1 rounded-full bg-slate-700 hidden md:block"></div>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium text-sm">
                  <Briefcase className="w-4 h-4 text-indigo-400" /> 
                  {employee.emp_designation || 'No Designation'}
                </span>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                {getStatusBadge(employee.emp_status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Custom Tab Nav */}
        <div className="grid grid-cols-3 w-full bg-slate-100/80 border border-slate-200 p-1 rounded-[14px] gap-1 mb-5">
          {[
            { key: 'overview', icon: Users, label: 'Employee Information' },
            { key: 'payroll', icon: FileText, label: 'Month-wise Payroll' },
            { key: 'attendance', icon: Clock, label: 'Attendance & Timesheet' },
          ].map(({ key, icon: Icon, label }) => (
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
            </button>
          ))}
        </div>

        <TabsContent value="overview" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
            <div className="p-6 md:p-8 flex flex-col gap-8">
              
              {/* Top Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Department</span>
                  <span className="text-slate-900 font-semibold text-lg">{employee.emp_department || 'Unassigned'}</span>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Date of Join</span>
                  <span className="text-slate-900 font-semibold text-lg">
                    {employee.emp_doj ? new Date(employee.emp_doj).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Specified'}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" /> Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100/50">
                    <div className="bg-indigo-50 p-2 rounded-lg">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</div>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5">{employee.emp_emailid || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100/50">
                    <div className="bg-indigo-50 p-2 rounded-lg">
                      <Phone className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</div>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5">{employee.emp_phoneno || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-500" /> Financial & Banking Details
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/50 border-b border-slate-100">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Fixed Gross</div>
                      <div className="text-xl font-bold text-slate-900 tracking-tight mt-1">{formatCurrency(employee.emp_fixed_gross)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Annual Fixed Gross</div>
                      <div className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                        {formatCurrency(employee.emp_fixed_gross_annual || (employee.emp_fixed_gross ? employee.emp_fixed_gross * 12 : 0))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 p-5">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bank Account Number</div>
                      <div className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                        {employee.emp_bank_acc_no || 'Not Provided'}
                    </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bank IFSC Code</div>
                      <div className="text-sm font-bold text-slate-800">{employee.emp_bank_ifsc_code || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">PF Applicable</div>
                      <div className="text-sm font-bold text-slate-800">{employee.emp_pf_applicable === 1 ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">PF Account Number</div>
                      <div className="text-sm font-bold text-slate-800">{employee.emp_pf_no || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Balances */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3">Leave Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/60 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{employee.total_el_available || 0}</div>
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest text-center">Earned Leaves</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/60 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-amber-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <div className="text-3xl font-bold text-amber-600 mb-1">{employee.total_cl_available || 0}</div>
                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest text-center">Casual Leaves</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200/60 p-5 rounded-2xl flex flex-col items-center justify-center shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rose-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <div className="text-3xl font-bold text-rose-600 mb-1">{employee.total_sl_available || 0}</div>
                    <div className="text-[10px] font-bold text-rose-700 uppercase tracking-widest text-center">Sick Leaves</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Historical Payslips
            </h3>
            
            {payslips && payslips.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Month</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">Working Days</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">Paid Days</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">LOP Days</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-right">Gross Earnings</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-right">Deductions</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-right">Net Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((ps: any, idx: number) => {
                      const formattedMonth = ps.payslip_month instanceof Date 
                        ? ps.payslip_month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                        : (ps.payslip_month ? String(ps.payslip_month) : '-');
                        
                      return (
                      <TableRow key={ps.actual_payslip_id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">{formattedMonth}</TableCell>
                        <TableCell className="text-center">{ps.total_no_of_working_days || 0}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">{ps.total_paid_days || 0}</TableCell>
                        <TableCell className="text-center text-rose-500 font-medium">{ps.total_lop_days || 0}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(ps.total_gross_monthly)}</TableCell>
                        <TableCell className="text-right text-rose-500">{formatCurrency(ps.total_deductions)}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(ps.net_payable)}</TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <FileText className="w-10 h-10 mb-3 text-slate-300" />
                <p>No payslips found for this employee.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> Recent Attendance
              </h3>
              
              <div className="w-full sm:w-48">
                <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-sm font-semibold text-slate-700">
                    <SelectValue>
                      {new Date(`${selectedMonth}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(m => (
                      <SelectItem key={m} value={m}>
                        {new Date(`${m}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {estimatedPayroll && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg mt-0.5">
                    <IndianRupee className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Estimated Payroll for {new Date(`${selectedMonth}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Based on marked attendance and fixed gross of {formatCurrency(estimatedPayroll.gross)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-6 bg-white py-2 px-4 rounded-lg shadow-sm border border-slate-100 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paid Days</span>
                    <span className="text-sm font-bold text-emerald-600">{estimatedPayroll.paidDays} <span className="text-slate-400 font-normal text-xs">/ {estimatedPayroll.daysInMonth}</span></span>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">LOP</span>
                    <span className="text-sm font-bold text-rose-500">{estimatedPayroll.lopDays}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Est. Net</span>
                    <span className="text-base font-bold text-indigo-700">{formatCurrency(estimatedPayroll.estimatedNet)}</span>
                  </div>
                </div>
              </div>
            )}

            {calendarDays && calendarDays.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Date</TableHead>
                      <TableHead className="font-semibold text-slate-600">Check In</TableHead>
                      <TableHead className="font-semibold text-slate-600">Check Out</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">Work Duration</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-center">Late/Early</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calendarDays.map((dayData: any) => {
                      const shortWeekday = dayData.dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
                      const dayNum = String(dayData.dateObj.getDate()).padStart(2, '0');
                      const shortMonth = dayData.dateObj.toLocaleDateString('en-GB', { month: 'short' });
                      
                      const formattedDate = (
                        <div className="flex items-center gap-1.5 font-mono text-sm tracking-tight">
                          <span className="w-8 text-slate-500 font-medium">{shortWeekday}</span>
                          <span className="w-5 text-slate-900 font-semibold text-right">{dayNum}</span>
                          <span className="w-9 text-slate-600">{shortMonth}</span>
                        </div>
                      );

                      const att = dayData.record || {};
                      
                      return (
                        <TableRow key={dayData.dateStr} className="hover:bg-slate-50/50">
                          <TableCell>{formattedDate}</TableCell>
                          
                          {dayData.statusType === 'holiday' ? (
                            <TableCell colSpan={4} className="text-center text-purple-600/80 font-medium tracking-wide text-sm">
                              {dayData.holidayInfo?.holiday_title || 'HOLIDAY'}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell>{att.checkin_time || '-'}</TableCell>
                              <TableCell>{att.checkout_time || '-'}</TableCell>
                              <TableCell className="text-center font-medium text-slate-700">{att.total_work_duration || '-'}</TableCell>
                              <TableCell className="text-center">
                                {att.late_time && att.late_time !== '00:00:00' ? (
                                  <span className="text-rose-500 text-xs font-semibold bg-rose-50 px-2 py-0.5 rounded">Late: {att.late_time}</span>
                                ) : att.early_time && att.early_time !== '00:00:00' ? (
                                  <span className="text-amber-500 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded">Early: {att.early_time}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </TableCell>
                            </>
                          )}

                          <TableCell className="text-right">
                            {getAttendanceStatusBadge(dayData)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <CalendarDays className="w-10 h-10 mb-3 text-slate-300" />
                <p>No attendance records found for this employee.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
