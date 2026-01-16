import { Globe, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ProfileSummary } from "./ProfileSummary";
import { 
  HomeIcon, 
  RehabIcon, 
  BookIcon, 
  ProsthesisIcon, 
  ServiceIcon, 
  ProfileIcon,
  SettingsIcon 
} from "./NotionIcons";

const navItems = [
  { href: "/", icon: HomeIcon, labelKey: "nav.dashboard" },
  { href: "/rehabilitation", icon: RehabIcon, labelKey: "nav.rehabilitation" },
  { href: "/knowledge", icon: BookIcon, labelKey: "nav.knowledge" },
  { href: "/prosthesis", icon: ProsthesisIcon, labelKey: "nav.prosthesis" },
  { href: "/service", icon: ServiceIcon, labelKey: "nav.service" },
];

export function DesktopSidebar() {
  const [location] = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-primary text-primary-foreground flex flex-col z-50 shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-white/15">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center font-black text-xl tracking-tight shadow-lg">
            OI
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight">Ortho Innovations</h1>
            <p className="text-sm text-white/80 font-medium">Patient Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200",
                isActive
                  ? "bg-white/25 text-white font-bold shadow-lg scale-[1.02]"
                  : "text-white/85 hover:bg-white/15 hover:text-white hover:scale-[1.01] font-semibold"
              )}
            >
              <Icon size={24} />
              <span className="text-[15px] tracking-wide">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        
        {/* Profile with Summary Popup */}
        <ProfileSummary>
          <button
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-left",
              location === "/profile" || location.startsWith("/profile")
                ? "bg-white/25 text-white font-bold shadow-lg scale-[1.02]"
                : "text-white/85 hover:bg-white/15 hover:text-white hover:scale-[1.01] font-semibold"
            )}
          >
            <ProfileIcon size={24} />
            <span className="text-[15px] tracking-wide">{t("nav.profile")}</span>
          </button>
        </ProfileSummary>
      </nav>

      {/* Bottom Section */}
      <div className="p-5 border-t border-white/15 space-y-3">
        {/* Settings Link */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200",
            location === "/settings"
              ? "bg-white/25 text-white font-bold shadow-lg scale-[1.02]"
              : "text-white/85 hover:bg-white/15 hover:text-white hover:scale-[1.01] font-semibold"
          )}
        >
          <SettingsIcon size={24} />
          <span className="text-[15px] tracking-wide">{t("nav.settings")}</span>
        </Link>

        {/* Theme & Language Controls */}
        <div className="flex items-center gap-3 px-2 pt-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 transition-all duration-200 shadow-md hover:shadow-lg"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 transition-all duration-200 text-[15px] font-bold shadow-md hover:shadow-lg"
          >
            <Globe className="w-5 h-5" />
            {language === "ru" ? "Русский" : "English"}
          </button>
        </div>
      </div>
    </aside>
  );
}
