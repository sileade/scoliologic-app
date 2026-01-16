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
  ProfileIcon,
  DocumentIcon,
  MessageIcon
} from "./NotionIcons";

const navItems = [
  { href: "/", icon: HomeIcon, labelKey: "nav.dashboard" },
  { href: "/rehabilitation", icon: RehabIcon, labelKey: "nav.rehabilitation" },
  { href: "/documents", icon: DocumentIcon, labelKey: "nav.documents" },
  { href: "/prosthesis", icon: ProsthesisIcon, labelKey: "nav.prosthesis" },
  { href: "/messages", icon: MessageIcon, labelKey: "nav.messages" },
];

export function MobileNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-item",
                isActive && "active"
              )}
            >
              <Icon 
                className={cn(
                  "nav-item-icon transition-transform duration-200",
                  isActive && "scale-110"
                )} 
                size={24}
              />
              <span className="nav-item-label">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
        
        {/* Profile button with summary popup */}
        <ProfileSummary>
          <button
            className={cn(
              "nav-item",
              (location === "/profile" || location.startsWith("/profile")) && "active"
            )}
          >
            <ProfileIcon 
              className={cn(
                "nav-item-icon transition-transform duration-200",
                (location === "/profile" || location.startsWith("/profile")) && "scale-110"
              )} 
              size={24}
            />
            <span className="nav-item-label">
              {t("nav.profile")}
            </span>
          </button>
        </ProfileSummary>
      </div>
    </nav>
  );
}
