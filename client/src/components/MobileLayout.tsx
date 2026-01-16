import { MobileNav } from "./MobileNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
}

export function MobileLayout({ children, title, showHeader = true }: MobileLayoutProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                OI
              </div>
              {title && <h1 className="font-semibold text-lg">{title}</h1>}
            </div>
            
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium transition-colors hover:bg-white/30"
            >
              <Globe className="w-4 h-4" />
              {language.toUpperCase()}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="page-with-nav">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
