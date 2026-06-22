"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Building2, Mail, Phone, MapPin, MoreHorizontal } from "lucide-react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ClientForm } from "./ClientForm";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  industry: string;
  status: string;
}

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const router = useRouter();

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleView = (client: Client) => {
    router.push(`/clients/${client.id}`);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Clients</h2>
          <p className="text-[14px] text-slate-500 mt-1">Manage your recruiting clients and companies.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-bold px-4 py-2.5 rounded-[10px] transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto border border-amber-500/50"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Add Client
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Company</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell">Industry</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                    <p className="text-slate-500 mt-2 text-sm font-medium">Loading clients...</p>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Building2 className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg mb-1.5">No clients found</h3>
                    <p className="text-slate-500 text-[15px] mb-6 max-w-sm mx-auto leading-relaxed">
                      Get started by adding your first client to start tracking their open positions and placements.
                    </p>
                    <button 
                      onClick={handleAddNew} 
                      className="text-amber-600 hover:text-amber-700 font-semibold text-[15px] flex items-center gap-1.5 mx-auto transition-colors group"
                    >
                      <Plus className="w-4 h-4 transition-transform group-hover:scale-110" strokeWidth={2.5} />
                      <span className="hover:underline underline-offset-4">Add your first client</span>
                    </button>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{client.company_name}</div>

                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-slate-600">
                      {client.industry}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="text-slate-900 font-medium">{client.contact_person}</div>
                      <div className="text-slate-500 text-[12px] flex flex-col gap-0.5 mt-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {client.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {client.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        client.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleView(client)} className="relative group/btn flex items-center justify-center w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition-colors cursor-pointer">
                          <Eye className="w-[18px] h-[18px]" strokeWidth={2.5} />
                          <div className="absolute bottom-full mb-1.5 opacity-0 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 pointer-events-none transition-all duration-200 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-[6px] shadow-lg whitespace-nowrap z-10 hidden sm:block">
                            View Details
                          </div>
                        </button>
                        <button onClick={() => handleEdit(client)} className="relative group/btn flex items-center justify-center w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-amber-600 rounded-md transition-colors cursor-pointer">
                          <FiEdit2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                          <div className="absolute bottom-full mb-1.5 opacity-0 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 pointer-events-none transition-all duration-200 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-[6px] shadow-lg whitespace-nowrap z-10 hidden sm:block">
                            Edit
                          </div>
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="relative group/btn flex items-center justify-center w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-red-600 rounded-md transition-colors cursor-pointer">
                          <FiTrash2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                          <div className="absolute bottom-full mb-1.5 opacity-0 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 pointer-events-none transition-all duration-200 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-[6px] shadow-lg whitespace-nowrap z-10 hidden sm:block">
                            Delete
                          </div>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        onSuccess={fetchClients} 
        initialData={editingClient} 
      />
    </div>
  );
}
