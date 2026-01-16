import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ProfileSummary } from "./ProfileSummary";
import { 
  HomeIcon, 
  RehabIcon, 
  BookIcon, 
  ProsthesisIcon, 
  ServiceIcon, 
  ProfileIcon 
} from "./NotionIcons";

const navItems = [
  { href: "/", icon: HomeIcon, labelKey: "nav.dashboard" },
  { href: "/rehabilitation", icon: RehabIcon, labelKey: "nav.rehabilitation" },
  { href: "/knowledge", icon: BookIcon, labelKey: "nav.knowledge" },
  { href: "/prosthesis", icon: ProsthesisIcon, labelKey: "nav.prosthesis" },
  { href: "/service", icon: ServiceIcon, labelKey: "nav.service" },
];

export function MobileNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-3 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 touch-target",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "mb-1 transition-transform duration-200",
                  isActive && "scale-115"
                )} 
                size={22}
              />
              <span className={cn(
                "text-[11px] tracking-wide",
                isActive ? "font-bold text-primary" : "font-semibold"
              )}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
        
        {/* Profile button with summary popup */}
        <ProfileSummary>
          <button
            className={cn(
              "flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 touch-target",
              location === "/profile" || location.startsWith("/profile")
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ProfileIcon 
              className={cn(
                "mb-1 transition-transform duration-200",
                (location === "/profile" || location.startsWith("/profile")) && "scale-115"
              )} 
              size={22}
            />
            <span className={cn(
              "text-[11px] tracking-wide",
              (location === "/profile" || location.startsWith("/profile")) ? "font-bold text-primary" : "font-semibold"
            )}>
              {t("nav.profile")}
            </span>
          </button>
        </ProfileSummary>
      </div>
    </nav>
  );
}
