import { Activity, Globe, Monitor, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Route } from "./+types/home";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Sidebar } from "~/components/sidebar";
import { useAuth } from "~/lib/auth";
import { Navigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "God Console" },
    { name: "description", content: "P22194 management dashboard" },
  ];
}

export default function Home() {
  const { user, accessToken, isLoading } = useAuth();
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    (async () => {
      try {
        const { fetchSessions } = await import("~/lib/api");
        const result = await fetchSessions({ page: 1, limit: 1 }, accessToken);
        setSessionCount(result.total);
      } catch {
        setSessionCount(null);
      } finally {
        setLoadingCount(false);
      }
    })();
  }, [accessToken, isLoading]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const stats = [
    {
      title: "Total Sessions",
      value: loadingCount ? <Skeleton className="h-8 w-16" /> : sessionCount?.toLocaleString() ?? "N/A",
      icon: Activity,
    },
    {
      title: "Active Sessions",
      value: loadingCount ? <Skeleton className="h-8 w-16" /> : "—",
      icon: Globe,
    },
    {
      title: "Users",
      value: "—",
      icon: Users,
    },
    {
      title: "Services",
      value: "3",
      icon: Monitor,
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pl-60">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {user.username}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
