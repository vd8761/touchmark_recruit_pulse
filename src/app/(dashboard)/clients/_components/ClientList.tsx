"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Building2, Mail, Phone, MoreVertical, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ClientForm } from "./ClientForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const userRole = session?.user?.role || "Viewer";
  const canAddClient = ["Super Admin", "Admin", "Business Development"].includes(userRole);
  const canEditClient = ["Super Admin", "Admin", "Business Development"].includes(userRole);
  const canDeleteClient = ["Super Admin", "Admin"].includes(userRole);

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
    setClientToDelete(id);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    const id = clientToDelete;
    
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Clients</h2>
          <p className="text-[14px] text-slate-500 mt-1">Manage your recruiting clients and companies.</p>
        </div>
        {canAddClient && (
          <button
            onClick={handleAddNew}
            className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-bold px-4 py-2.5 rounded-[10px] transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto border border-amber-500/50"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Add Client
          </button>
        )}
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
                    {canAddClient && (
                      <button 
                        onClick={handleAddNew} 
                        className="text-amber-600 hover:text-amber-700 font-semibold text-[15px] flex items-center gap-1.5 mx-auto transition-colors group"
                      >
                        <Plus className="w-4 h-4 transition-transform group-hover:scale-110" strokeWidth={2.5} />
                        <span className="hover:underline underline-offset-4">Add your first client</span>
                      </button>
                    )}
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
                      <div className="flex items-center justify-end opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors cursor-pointer outline-none">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-[12px] shadow-lg border-slate-200">
                            <DropdownMenuItem onClick={() => handleView(client)} className="cursor-pointer py-2 text-[13px] font-medium text-slate-700">
                              <Eye className="w-4 h-4 mr-2 text-indigo-600" /> View Details
                            </DropdownMenuItem>
                            {canEditClient && (
                              <DropdownMenuItem onClick={() => handleEdit(client)} className="cursor-pointer py-2 text-[13px] font-medium text-slate-700">
                                <FiEdit2 className="w-4 h-4 mr-2 text-amber-600" /> Edit
                              </DropdownMenuItem>
                            )}
                            {canDeleteClient && (
                              <DropdownMenuItem onClick={() => handleDelete(client.id)} className="cursor-pointer py-2 text-[13px] font-medium text-red-600 focus:text-red-700 focus:bg-red-50">
                                <FiTrash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <ConfirmDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
        title="Delete Client"
        description="Are you sure you want to delete this client? All associated positions and history will be permanently removed."
        onConfirm={confirmDelete}
        confirmText="Delete Client"
      />
    </div>
  );
}
