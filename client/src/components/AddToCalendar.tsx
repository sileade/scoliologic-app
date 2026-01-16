import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon } from "./NotionIcons";
import { CalendarEvent, addToCalendar } from "@/lib/calendar";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddToCalendarProps {
  event: CalendarEvent;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddToCalendar({ 
  event, 
  variant = "outline", 
  size = "default",
  className = "" 
}: AddToCalendarProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleAddToCalendar = (type: 'google' | 'apple' | 'outlook') => {
    addToCalendar(event, type);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarIcon size={18} className="mr-2" />
          {language === 'ru' ? 'В календарь' : 'Add to Calendar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleAddToCalendar('google')}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
          </svg>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar('apple')}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          Apple Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3h-3zm0 4.5v3h3v-3h-3zm0 4.5v1.83l3.05-1.83H18zm-5.25-9v3h3.75v-3h-3.75zm0 4.5v3h3.75v-3h-3.75zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73h-3.75zM9 3.75V6h2l.13.01.12.04v-2.3H9zM3.38 11q0 .42.1.78.1.35.28.64.18.29.46.46.27.17.63.17.36 0 .64-.17.27-.17.45-.45.18-.29.27-.65.1-.36.1-.78 0-.42-.1-.79-.1-.36-.27-.65-.18-.28-.45-.45-.28-.18-.64-.18-.36 0-.63.18-.28.17-.46.45-.18.29-.28.65-.1.37-.1.79zm16.87 9V14.5l-5.25 3.15v2.6h5.25zm0-4.5V12l-5.25 3.15v1.6l5.25-3.25z"/>
          </svg>
          Outlook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
