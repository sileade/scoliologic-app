import { Globe, Moon, Sun, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ProfileSummary } from "./ProfileSummary";
import { 
  HomeIcon, 
  RehabIcon, 
  DocumentIcon, 
  ProsthesisIcon, 
  MessageIcon, 
  ProfileIcon,
  SettingsIcon 
} from "./NotionIcons";

const navItems = [
  { href: "/", icon: HomeIcon, labelKey: "nav.dashboard" },
  { href: "/rehabilitation", icon: RehabIcon, labelKey: "nav.rehabilitation" },
  { href: "/documents", icon: DocumentIcon, labelKey: "nav.documents" },
  { href: "/prosthesis", icon: ProsthesisIcon, labelKey: "nav.prosthesis" },
  { href: "/messages", icon: MessageIcon, labelKey: "nav.messages" },
];

export function DesktopSidebar() {
  const [location] = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[hsl(174,56%,46%)] to-[hsl(174,56%,40%)] text-white flex flex-col z-50 shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-white/15">
        <Link href="/" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg overflow-hidden">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30C10 30 13 20 20 20C27 20 30 10 30 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="10" cy="30" r="4" fill="hsl(75, 100%, 50%)"/>
              <circle cx="30" cy="10" r="4" fill="hsl(75, 100%, 50%)"/>
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight">Scoliologic</h1>
            <p className="text-sm text-white/80 font-medium">Личный кабинет</p>
          </div>
        </Link>
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
                  ? "bg-white/25 text-white font-bold shadow-lg"
                  : "text-white/85 hover:bg-white/15 hover:text-white font-semibold"
              )}
            >
              <Icon size={24} />
              <span className="text-[15px] tracking-wide">{t(item.labelKey)}</span>
              {item.href === "/messages" && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[hsl(75,100%,50%)] text-[hsl(220,20%,15%)] text-xs font-bold flex items-center justify-center">
                  3
                </span>
              )}
            </Link>
          );
        })}
        
        {/* Profile with Summary Popup */}
        <ProfileSummary>
          <button
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-left",
              location === "/profile" || location.startsWith("/profile")
                ? "bg-white/25 text-white font-bold shadow-lg"
                : "text-white/85 hover:bg-white/15 hover:text-white font-semibold"
            )}
          >
            <ProfileIcon size={24} />
            <span className="text-[15px] tracking-wide">{t("nav.profile")}</span>
          </button>
        </ProfileSummary>
      </nav>

      {/* Bottom Section */}
      <div className="p-5 border-t border-white/15 space-y-3">
        {/* Notifications */}
        <Link
          href="/notifications"
          className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-white/85 hover:bg-white/15 hover:text-white font-semibold"
        >
          <div className="relative">
            <Bell size={24} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[hsl(75,100%,50%)] text-[hsl(220,20%,15%)] text-[10px] font-bold flex items-center justify-center">
              2
            </span>
          </div>
          <span className="text-[15px] tracking-wide">Уведомления</span>
        </Link>

        {/* Settings Link */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200",
            location === "/settings"
              ? "bg-white/25 text-white font-bold shadow-lg"
              : "text-white/85 hover:bg-white/15 hover:text-white font-semibold"
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
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[hsl(75,100%,50%)] text-[hsl(220,20%,15%)] hover:opacity-90 transition-all duration-200 text-[15px] font-bold shadow-md hover:shadow-lg"
          >
            <Globe className="w-5 h-5" />
            {language === "ru" ? "RU" : "EN"}
          </button>
        </div>
      </div>
    </aside>
  );
}
