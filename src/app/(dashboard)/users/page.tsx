import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserList } from "./_components/UserList";

export const metadata = {
  title: "Users & Roles | RecruitPulse",
};

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "Super Admin") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system access, assign roles, and configure 2FA settings.</p>
        </div>
      </div>

      <UserList currentUserRole={session.user.role} />
    </div>
  );
}
