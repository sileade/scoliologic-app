import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

// Notion-style hand-drawn icons with slightly imperfect, organic lines
export const HomeIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 10.5L12 3L21 10.5V20C21 20.5 20.5 21 20 21H4C3.5 21 3 20.5 3 20V10.5Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V14C9 13.5 9.5 13 10 13H14C14.5 13 15 13.5 15 14V21" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RehabIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12C4 12 5.5 7 12 7C18.5 7 20 12 20 12" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M4 12C4 12 5.5 17 12 17C18.5 17 20 12 20 12" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 4V7M12 17V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const BookIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 4.5C4 3.67 4.67 3 5.5 3H9C10.1 3 11.1 3.5 12 4.2C12.9 3.5 13.9 3 15 3H18.5C19.33 3 20 3.67 20 4.5V17.5C20 18.33 19.33 19 18.5 19H15C13.9 19 12.9 19.5 12 20.2C11.1 19.5 10.1 19 9 19H5.5C4.67 19 4 18.33 4 17.5V4.5Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 4.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const ProsthesisIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 11V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 14H16C16 14 17 14 17 15V18C17 19 16 20 15 20H9C8 20 7 19 7 18V15C7 14 8 14 8 14Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 17H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const ServiceIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M14.7 6.3C14.3 5.9 13.7 5.9 13.3 6.3L6.3 13.3C5.9 13.7 5.9 14.3 6.3 14.7L9.3 17.7C9.7 18.1 10.3 18.1 10.7 17.7L17.7 10.7C18.1 10.3 18.1 9.7 17.7 9.3L14.7 6.3Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 21L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M18 3L21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M19.5 4.5L15 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M3 9H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 2V5M16 2V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="8" cy="14" r="1" fill="currentColor"/>
    <circle cx="12" cy="14" r="1" fill="currentColor"/>
    <circle cx="16" cy="14" r="1" fill="currentColor"/>
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M10 8.5L16 12L10 15.5V8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 3L4 7V11C4 15.4 7.4 19.5 12 21C16.6 19.5 20 15.4 20 11V7L12 3Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15.1 2.6 13.6 2 12 2C10.4 2 8.9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.7 21C13.5 21.3 13.3 21.5 13 21.7C12.7 21.9 12.4 22 12 22C11.6 22 11.3 21.9 11 21.7C10.7 21.5 10.5 21.3 10.3 21" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const QRCodeIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="14" width="3" height="3" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="18" y="18" width="3" height="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M14 18H17M18 14V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 9H4C3.4 9 3 8.6 3 8V5C3 4.4 3.4 4 4 4H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M18 9H20C20.6 9 21 8.6 21 8V5C21 4.4 20.6 4 20 4H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M6 4H18V10C18 13.3 15.3 16 12 16C8.7 16 6 13.3 6 10V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 21H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 6V12L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FireIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C12 2 8 6 8 10C8 12 9 14 10 15C9 14 8 12.5 8 11C8 9 10 7 10 7C10 7 9 10 10 12C11 14 12 15 12 17C12 15 13 14 14 12C15 10 14 7 14 7C14 7 16 9 16 11C16 12.5 15 14 14 15C15 14 16 12 16 10C16 6 12 2 12 2Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 22C15 22 17 20 17 17C17 15 16 14 15 13C15 15 14 16 12 16C10 16 9 15 9 13C8 14 7 15 7 17C7 20 9 22 12 22Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChartIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 3V21H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 14L11 10L15 14L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7" cy="14" r="1.5" fill="currentColor"/>
    <circle cx="11" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="14" r="1.5" fill="currentColor"/>
    <circle cx="21" cy="8" r="1.5" fill="currentColor"/>
  </svg>
);

export const UsersIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M2 20C2 17 5 15 9 15C13 15 16 17 16 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M17 13C19.5 13 22 14.5 22 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const FileIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M14 2H6C5.4 2 5 2.4 5 3V21C5 21.6 5.4 22 6 22H18C18.6 22 19 21.6 19 21V7L14 2Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 13H15M9 17H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M22 16.9V19.9C22 20.5 21.5 21 20.9 21C10.5 21 3 13.5 3 3.1C3 2.5 3.5 2 4.1 2H7.1C7.6 2 8 2.4 8.1 2.9C8.4 4.5 8.9 6 9.6 7.4C9.8 7.8 9.7 8.3 9.4 8.6L7.6 10.4C9.1 13.3 11.7 15.9 14.6 17.4L16.4 15.6C16.7 15.3 17.2 15.2 17.6 15.4C19 16.1 20.5 16.6 22.1 16.9C22.6 17 23 17.4 23 17.9L22 16.9Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 21C12 21 19 14 19 9C19 5.1 15.9 2 12 2C8.1 2 5 5.1 5 9C5 14 12 21 12 21Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const StarIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L14.4 8.6L21.5 9.2L16.2 13.9L17.8 21L12 17.3L6.2 21L7.8 13.9L2.5 9.2L9.6 8.6L12 2Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const HeartIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 21C12 21 3 14 3 8.5C3 5.4 5.4 3 8.5 3C10.2 3 11.8 3.8 12 5C12.2 3.8 13.8 3 15.5 3C18.6 3 21 5.4 21 8.5C21 14 12 21 12 21Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MessageIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M21 11.5C21 16.2 16.9 20 12 20C10.5 20 9.1 19.7 7.8 19.1L3 20L4.3 16.4C3.5 15 3 13.3 3 11.5C3 6.8 7.1 3 12 3C16.9 3 21 6.8 21 11.5Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 11H8.01M12 11H12.01M16 11H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


export const TargetIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M14 2H6C5.4 2 5 2.4 5 3V21C5 21.6 5.4 22 6 22H18C18.6 22 19 21.6 19 21V7L14 2Z" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 9H10M9 13H15M9 17H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const CorsetIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 4C8 4 6 6 6 12C6 18 8 20 8 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M16 4C16 4 18 6 18 12C18 18 16 20 16 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 4H16M8 20H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M10 8H14M10 12H14M10 16H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const SpineIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C12 2 14 4 14 6C14 8 12 8 12 8C12 8 10 8 10 6C10 4 12 2 12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8C12 8 15 10 15 12C15 14 12 14 12 14C12 14 9 14 9 12C9 10 12 8 12 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 14C12 14 15 16 15 18C15 20 12 22 12 22C12 22 9 20 9 18C9 16 12 14 12 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const GosuslugiIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M7 12H17M12 7V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const AttachIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M21.4 11.6L12.2 20.8C10.4 22.6 7.5 22.6 5.7 20.8C3.9 19 3.9 16.1 5.7 14.3L14.9 5.1C16 4 17.8 4 18.9 5.1C20 6.2 20 8 18.9 9.1L10.5 17.5C10 18 9.1 18 8.6 17.5C8.1 17 8.1 16.1 8.6 15.6L16.2 8" 
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
