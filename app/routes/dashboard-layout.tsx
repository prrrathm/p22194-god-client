import { Navigate, Outlet } from "react-router";

import { Sidebar } from "~/components/sidebar";
import { useAuth } from "~/lib/auth";

export default function DashboardLayout() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto md:pl-60 pt-14 md:pt-0">
        <div className="p-6 space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
