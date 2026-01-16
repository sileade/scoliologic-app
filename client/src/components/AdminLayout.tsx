import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Globe, Moon, Sun, LogOut } from "lucide-react";
import { 
  HomeIcon, 
  UsersIcon, 
  FileIcon, 
  CalendarIcon,
  BellIcon,
  ChartIcon,
  SettingsIcon,
  ServiceIcon,
  RehabIcon
} from "./NotionIcons";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const navItems = [
  { href: "/admin", icon: HomeIcon, labelKey: "admin.nav.dashboard" },
  { href: "/admin/patients", icon: UsersIcon, labelKey: "admin.nav.patients" },
  { href: "/admin/rehabilitation", icon: RehabIcon, labelKey: "admin.nav.rehabilitation" },
  { href: "/admin/content", icon: FileIcon, labelKey: "admin.nav.content" },
  { href: "/admin/orders", icon: ServiceIcon, labelKey: "admin.nav.orders" },
  { href: "/admin/calendar", icon: CalendarIcon, labelKey: "admin.nav.calendar" },
  { href: "/admin/notifications", icon: BellIcon, labelKey: "admin.nav.notifications" },
  { href: "/admin/analytics", icon: ChartIcon, labelKey: "admin.nav.analytics" },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground">
              OI
            </div>
            <div>
              <h1 className="font-bold text-lg">Ortho Admin</h1>
              <p className="text-xs text-muted-foreground">{t("admin.doctorPanel")}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/admin" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={20} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border space-y-2">
          {/* Settings Link */}
          <Link
            href="/admin/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              location === "/admin/settings"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <SettingsIcon size={20} />
            {t("nav.settings")}
          </Link>

          {/* Back to Patient App */}
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <LogOut size={20} />
            {t("admin.backToPatient")}
          </Link>

          {/* Theme & Language Controls */}
          <div className="flex items-center gap-2 px-2 pt-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              {language === "ru" ? "RU" : "EN"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        {title && (
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-8 py-4">
            <h1 className="text-2xl font-bold">{title}</h1>
          </header>
        )}
        
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
