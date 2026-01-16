import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 md:p-12 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
