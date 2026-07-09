import { Activity, Home, LayoutDashboard, LogOut, Monitor, User } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useAuth } from "~/lib/auth";
import { cn } from "~/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sessions", label: "Sessions", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: Activity },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-4">
        <Monitor className="h-5 w-5" />
        <span className="font-semibold tracking-tight">God Console</span>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user?.username?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{user?.username || "User"}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {user?.role || "user"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 mt-1" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
