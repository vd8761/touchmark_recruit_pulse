import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // Restrict to Admin, Super Admin, and Finance
  const allowedRoles = ["Super Admin", "Admin", "Finance"];
  const userRole = (session.user as any).role;

  if (!allowedRoles.includes(userRole)) {
    redirect("/"); // Or to an unauthorized page
  }

  return <>{children}</>;
}
