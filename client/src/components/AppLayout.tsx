import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { SwipeNavigation } from "./SwipeNavigation";
import { ProfileSummary } from "./ProfileSummary";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Globe, Moon, Sun, User, Bell } from "lucide-react";
import { useLocation, Link } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  
  // Don't show back button on home page
  const isHomePage = location === "/" || location === "";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <DesktopSidebar />
      </div>

      {/* Mobile Header - hidden on desktop */}
      <header className="lg:hidden sticky top-0 z-40 bg-background border-b border-accent/20">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            {/* Scoliologic Logo */}
            <div className="flex items-center gap-1">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="hsl(var(--accent))"/>
                <path d="M12 28C12 28 14 20 20 20C26 20 28 12 28 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="12" cy="28" r="3" fill="hsl(var(--primary))"/>
                <circle cx="28" cy="12" r="3" fill="hsl(var(--primary))"/>
              </svg>
              <span className="font-bold text-lg text-foreground">
                Scoliologic
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link href="/notifications">
              <button
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 transition-colors hover:bg-accent/20"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-accent" />
                <span className="notification-dot" />
              </button>
            </Link>
            
            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted transition-colors hover:bg-muted/80"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-foreground" />
              )}
            </button>
            
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:opacity-90"
            >
              <Globe className="w-4 h-4" />
              {language.toUpperCase()}
            </button>
            
            {/* Profile Button */}
            <ProfileSummary>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent transition-colors hover:opacity-90"
                aria-label="Profile"
              >
                <User className="w-5 h-5 text-accent-foreground" />
              </button>
            </ProfileSummary>
          </div>
        </div>
      </header>

      {/* Main Content with Swipe Navigation */}
      <main className="lg:ml-72 page-with-nav lg:pb-8">
        <SwipeNavigation showBackButton={!isHomePage} title={title}>
          {children}
        </SwipeNavigation>
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
