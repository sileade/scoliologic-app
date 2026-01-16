import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { SwipeNavigation } from "./SwipeNavigation";
import { ProfileSummary } from "./ProfileSummary";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Globe, Moon, Sun, User } from "lucide-react";
import { useLocation } from "wouter";

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
      <header className="lg:hidden sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
              OI
            </div>
            {title && <h1 className="font-semibold text-lg">{title}</h1>}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 transition-colors hover:bg-white/30"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium transition-colors hover:bg-white/30"
            >
              <Globe className="w-4 h-4" />
              {language.toUpperCase()}
            </button>
            
            {/* Profile Button */}
            <ProfileSummary>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 transition-colors hover:bg-white/30"
                aria-label="Profile"
              >
                <User className="w-4 h-4" />
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
