import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";


interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
      redirect("/dashboard");
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent min-h-screen">
          {children}
    </div>
  );
}
