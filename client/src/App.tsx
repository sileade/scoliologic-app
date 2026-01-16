import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { lazy, Suspense, useEffect } from "react";
import { LoadingBar } from "./components/LoadingBar";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { analytics } from "./lib/analytics";
import { useNativePlatform } from "./hooks/useNativePlatform";
import { cn } from "./lib/utils";

// Loading component for lazy loaded pages - Scoliologic themed
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 relative">
        <div className="absolute inset-0 border-4 border-accent/30 rounded-full" />
        <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-muted-foreground text-sm font-medium">Загрузка...</p>
    </div>
  </div>
);

// Lazy load patient pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Rehabilitation = lazy(() => import("./pages/Rehabilitation"));
const Documents = lazy(() => import("./pages/Documents"));
const Messages = lazy(() => import("./pages/Messages"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const Prosthesis = lazy(() => import("./pages/Prosthesis"));
const Devices = lazy(() => import("./pages/Devices"));
const Service = lazy(() => import("./pages/Service"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));

// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminPatients = lazy(() => import("./pages/admin/AdminPatients"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCalendar = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminRehabilitation = lazy(() => import("./pages/admin/AdminRehabilitation"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPatientDetails = lazy(() => import("./pages/admin/AdminPatientDetails"));

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Patient App Routes */}
        <Route path={"/"} component={Dashboard} />
        <Route path={"/rehabilitation"} component={Rehabilitation} />
        <Route path={"/rehab/current"} component={Rehabilitation} />
        <Route path={"/documents"} component={Documents} />
        <Route path={"/messages"} component={Messages} />
        <Route path={"/knowledge"} component={Knowledge} />
        <Route path={"/knowledge/exercises"} component={Knowledge} />
        <Route path={"/prosthesis"} component={Prosthesis} />
        <Route path={"/devices"} component={Devices} />
        <Route path={"/service"} component={Service} />
        <Route path={"/profile"} component={Profile} />
        <Route path={"/settings"} component={Settings} />
        <Route path={"/notifications"} component={Settings} />
        <Route path={"/auth"} component={Auth} />
        <Route path={"/login"} component={Auth} />
        
        {/* Admin Panel Routes */}
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/admin/patients"} component={AdminPatients} />
        <Route path={"/admin/patients/:id"} component={AdminPatientDetails} />
        <Route path={"/admin/rehabilitation"} component={AdminRehabilitation} />
        <Route path={"/admin/content"} component={AdminContent} />
        <Route path={"/admin/orders"} component={AdminOrders} />
        <Route path={"/admin/calendar"} component={AdminCalendar} />
        <Route path={"/admin/notifications"} component={AdminNotifications} />
        <Route path={"/admin/analytics"} component={AdminAnalytics} />
        <Route path={"/admin/settings"} component={AdminSettings} />
        
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Native platform wrapper component
function NativeWrapper({ children }: { children: React.ReactNode }) {
  const { isNative, isIOS, isAndroid, setStatusBarStyle, hideSplashScreen } = useNativePlatform();

  useEffect(() => {
    if (isNative) {
      // Set status bar style
      setStatusBarStyle('light');
      
      // Hide splash screen after a short delay
      const timer = setTimeout(() => {
        hideSplashScreen();
      }, 500);

      // Add platform-specific class to body
      document.body.classList.add('native-app');
      if (isIOS) {
        document.body.classList.add('ios-app');
      }
      if (isAndroid) {
        document.body.classList.add('android-app');
      }

      return () => {
        clearTimeout(timer);
        document.body.classList.remove('native-app', 'ios-app', 'android-app');
      };
    }
  }, [isNative, isIOS, isAndroid, setStatusBarStyle, hideSplashScreen]);

  return (
    <div className={cn(
      "min-h-screen",
      isNative && "pt-safe pb-safe"
    )}>
      {children}
    </div>
  );
}

function App() {
  // Инициализация аналитики
  useEffect(() => {
    analytics.init();
  }, []);

  return (
    <ErrorBoundary level="critical">
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <NativeWrapper>
              <LoadingBar />
              <OfflineIndicator />
              <Toaster />
              <Router />
            </NativeWrapper>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
