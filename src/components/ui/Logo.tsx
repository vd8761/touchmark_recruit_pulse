import React from 'react';
import { Fingerprint, Activity } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className = "", iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Clean Icon - No Box */}
      <div className="relative flex items-center justify-center shrink-0 w-9 h-9">
        <Fingerprint className="w-9 h-9 text-amber-500 absolute opacity-20" strokeWidth={1.5} />
        <Activity className="w-6 h-6 text-amber-500 relative z-10" strokeWidth={3} />
      </div>

      {/* Typography Stack */}
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <span className="text-[9px] font-extrabold tracking-[0.25em] text-slate-700 uppercase leading-none mb-1 ml-[1px]">
            Touchmark
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
            Recruit<span className="text-amber-500">Pulse</span>
          </span>
        </div>
      )}
    </div>
  );
}
