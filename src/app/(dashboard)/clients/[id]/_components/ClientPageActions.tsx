"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PositionForm } from "@/app/(dashboard)/positions/_components/PositionForm";

export function ClientPageActions({ clientId }: { clientId: string }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsFormOpen(true)}
        className="h-10 px-4 rounded-[12px] bg-slate-900 text-white text-sm font-semibold tracking-tight hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2 shrink-0"
      >
        <Plus className="w-4 h-4" />
        Add Position
      </button>

      <PositionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          setIsFormOpen(false);
          window.location.reload();
        }}
        preselectedClientId={clientId}
      />
    </>
  );
}
