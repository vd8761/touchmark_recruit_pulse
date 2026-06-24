"use client";

import { useState, useEffect } from "react";
import { Plus, Search, ShieldCheck, ShieldAlert, Mail, Lock, Unlock, Edit, Trash2, Loader2, KeyRound, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { UserFormModal } from "./UserFormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
  two_fa_method: string;
  last_login: string | null;
  role: {
    id: string;
    role_name: string;
  };
};

export function UserList({ currentUserRole }: { currentUserRole: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{id: string, role_name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles")
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    setUserToDelete(id);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const id = userToDelete;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete user.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.role_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400 text-slate-700"
          />
        </div>
        
        <button
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm ring-1 ring-slate-100">
            <tr>
              <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">User</th>
              <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Role</th>
              <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">2FA Method</th>
              <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-sm">Loading users...</p>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 mb-4 opacity-50" />
                    <p className="text-sm">No users found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                      user.role.role_name === 'Super Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      user.role.role_name === 'Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {user.role.role_name === 'Super Admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                      {user.role.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Active' ? 'text-emerald-700 bg-emerald-50' : 
                      user.status === 'Locked' ? 'text-red-700 bg-red-50' :
                      'text-slate-700 bg-slate-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : user.status === 'Locked' ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {user.two_fa_method === 'NONE' ? (
                        <span className="text-slate-400 flex items-center gap-1 text-xs"><Unlock className="w-3 h-3" /> Disabled</span>
                      ) : (
                        <span className="text-emerald-600 font-medium flex items-center gap-1 text-xs"><Lock className="w-3 h-3" /> {user.two_fa_method}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {user.last_login ? format(new Date(user.last_login), 'PP p') : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors cursor-pointer outline-none">
                          <MoreVertical className="w-5 h-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-[12px] shadow-lg border-slate-200">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} className="cursor-pointer py-2 text-[13px] font-medium text-slate-700">
                            <Edit className="w-4 h-4 mr-2 text-amber-600" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(user.id)} className="cursor-pointer py-2 text-[13px] font-medium text-red-600 focus:text-red-700 focus:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
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

      {isModalOpen && (
        <UserFormModal 
          user={selectedUser} 
          roles={roles}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => { setIsModalOpen(false); fetchData(); }} 
        />
      )}

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
      />
    </div>
  );
}
