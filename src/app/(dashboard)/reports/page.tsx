import { ReportsCenter } from "./_components/ReportsCenter";

export const metadata = {
  title: "Reports Center | RecruitPulse",
};

export default function ReportsPage() {
  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <div className="flex flex-col mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports Center</h1>
        <p className="text-slate-500 mt-1">Generate, filter, and export detailed reports across all modules.</p>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <ReportsCenter />
      </div>
    </div>
  );
}
