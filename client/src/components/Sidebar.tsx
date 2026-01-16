import { cn } from "@/lib/utils";
import { BookOpen, Calendar, Home, Settings, Shield, Stethoscope, User } from "lucide-react";
import { Link, useLocation } from "wouter";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Calendar, label: "Rehabilitation", href: "/rehab" },
  { icon: BookOpen, label: "Knowledge Base", href: "/knowledge" },
  { icon: Shield, label: "My Prosthesis", href: "/prosthesis" },
  { icon: Stethoscope, label: "Service", href: "/service" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
      <div className="p-4 h-14 flex items-center border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 font-serif font-semibold text-lg text-sidebar-foreground">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs">
            O
          </div>
          Ortho Patient
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-2">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 px-3">
          <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">
            Favorites
          </div>
          <div className="space-y-1">
            <Link
              href="/rehab/current"
              className="flex items-center gap-3 px-3 py-1.5 rounded-sm text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center text-xs">📄</span>
              Current Plan
            </Link>
            <Link
              href="/knowledge/exercises"
              className="flex items-center gap-3 px-3 py-1.5 rounded-sm text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center text-xs">🎥</span>
              Daily Exercises
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border/50">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
