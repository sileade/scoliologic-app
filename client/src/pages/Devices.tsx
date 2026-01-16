import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CorsetIcon, 
  CalendarIcon, 
  ChevronRightIcon,
  CheckIcon,
  ClockIcon,
  WarningIcon,
  RefreshIcon,
  ShieldIcon
} from "@/components/NotionIcons";
import { AlertTriangle, Calendar, Clock, FileText, Settings, Wrench } from "lucide-react";

type DeviceCategory = 'all' | 'corsets' | 'orthoses' | 'prostheses';
type DeviceStatus = 'active' | 'history';

interface Device {
  id: string;
  type: 'corset' | 'orthosis' | 'prosthesis';
  name: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  status: 'in_use' | 'service' | 'replaced' | 'ordered' | 'manufacturing' | 'ready';
  issueDate?: string;
  warrantyEndDate?: string;
  nextServiceDate?: string;
  wearSchedule?: string;
  cobbAngle?: number;
  fromMIS: boolean;
  lastSyncAt?: string;
}

// Mock data - в реальном приложении данные из МИС
const mockDevices: Device[] = [
  {
    id: '1',
    type: 'corset',
    name: 'Корсет Шено',
    model: 'Cheneau Classic',
    manufacturer: 'Scoliologic',
    serialNumber: 'SCL-2025-001234',
    status: 'in_use',
    issueDate: '2025-10-15',
    warrantyEndDate: '2026-10-15',
    nextServiceDate: '2026-02-15',
    wearSchedule: '20 часов в сутки',
    cobbAngle: 25,
    fromMIS: true,
    lastSyncAt: '2026-01-16T10:30:00',
  },
  {
    id: '2',
    type: 'orthosis',
    name: 'Ортез голеностопный',
    model: 'AFO-Light',
    manufacturer: 'Otto Bock',
    serialNumber: 'OB-2025-005678',
    status: 'in_use',
    issueDate: '2025-11-20',
    warrantyEndDate: '2026-11-20',
    nextServiceDate: '2026-05-20',
    fromMIS: true,
    lastSyncAt: '2026-01-16T10:30:00',
  },
  {
    id: '3',
    type: 'corset',
    name: 'Корсет Шено (предыдущий)',
    model: 'Cheneau Classic',
    manufacturer: 'Scoliologic',
    serialNumber: 'SCL-2024-000987',
    status: 'replaced',
    issueDate: '2024-06-10',
    warrantyEndDate: '2025-06-10',
    cobbAngle: 32,
    fromMIS: true,
    lastSyncAt: '2026-01-16T10:30:00',
  },
  {
    id: '4',
    type: 'corset',
    name: 'Новый корсет',
    model: 'Cheneau 3D',
    manufacturer: 'Scoliologic',
    status: 'manufacturing',
    fromMIS: true,
    lastSyncAt: '2026-01-16T10:30:00',
  },
];

export default function Devices() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DeviceCategory>('all');
  const [activeStatus, setActiveStatus] = useState<DeviceStatus>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = [
    { id: 'all' as const, label: t("devices.all") },
    { id: 'corsets' as const, label: t("devices.corsets") },
    { id: 'orthoses' as const, label: t("devices.orthoses") },
    { id: 'prostheses' as const, label: t("devices.prostheses") },
  ];

  const statusTabs = [
    { id: 'active' as const, label: t("devices.active") },
    { id: 'history' as const, label: t("devices.history") },
  ];

  const filteredDevices = mockDevices.filter(device => {
    const matchesCategory = activeCategory === 'all' || 
      (activeCategory === 'corsets' && device.type === 'corset') ||
      (activeCategory === 'orthoses' && device.type === 'orthosis') ||
      (activeCategory === 'prostheses' && device.type === 'prosthesis');
    
    const matchesStatus = activeStatus === 'active' 
      ? ['in_use', 'service', 'ordered', 'manufacturing', 'ready'].includes(device.status)
      : device.status === 'replaced';
    
    return matchesCategory && matchesStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Здесь будет вызов API для синхронизации с МИС
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const getStatusBadge = (status: Device['status']) => {
    const statusConfig = {
      in_use: { label: language === 'ru' ? 'Используется' : 'In Use', color: 'bg-green-100 text-green-700' },
      service: { label: language === 'ru' ? 'На ТО' : 'Service', color: 'bg-yellow-100 text-yellow-700' },
      replaced: { label: language === 'ru' ? 'Заменён' : 'Replaced', color: 'bg-gray-100 text-gray-600' },
      ordered: { label: language === 'ru' ? 'Заказан' : 'Ordered', color: 'bg-blue-100 text-blue-700' },
      manufacturing: { label: language === 'ru' ? 'Изготовление' : 'Manufacturing', color: 'bg-purple-100 text-purple-700' },
      ready: { label: language === 'ru' ? 'Готов' : 'Ready', color: 'bg-accent/20 text-accent' },
    };
    const config = statusConfig[status];
    return (
      <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", config.color)}>
        {config.label}
      </span>
    );
  };

  const getDeviceIcon = (type: Device['type']) => {
    return <CorsetIcon size={24} className="text-accent" />;
  };

  const isWarrantyExpiringSoon = (date?: string) => {
    if (!date) return false;
    const warrantyDate = new Date(date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const isServiceDueSoon = (date?: string) => {
    if (!date) return false;
    const serviceDate = new Date(date);
    const now = new Date();
    const daysUntilService = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilService > 0 && daysUntilService <= 14;
  };

  return (
    <AppLayout title={t("devices.title")}>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {t("devices.title")}
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              {t("devices.subtitle")}
            </p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "btn-scolio-outline flex items-center gap-2",
              isRefreshing && "opacity-50"
            )}
          >
            <RefreshIcon size={18} className={cn(isRefreshing && "animate-spin")} />
            {language === 'ru' ? 'Обновить' : 'Refresh'}
          </button>
        </div>

        {/* MIS Sync Status */}
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <ShieldIcon size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{t("devices.fromMIS")}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ru' 
                  ? `Последняя синхронизация: ${new Date().toLocaleString('ru-RU')}`
                  : `Last sync: ${new Date().toLocaleString('en-US')}`}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </CardContent>
        </Card>

        {/* Status Tabs */}
        <div className="flex gap-2 border-b">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
                activeStatus === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === category.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Devices List */}
        <div className="space-y-4">
          {filteredDevices.length > 0 ? (
            filteredDevices.map((device, index) => (
              <Card 
                key={device.id} 
                className={cn(
                  "scolio-feature-card card-interactive animate-fade-in stagger-item",
                  device.status === 'replaced' && "opacity-70"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {getDeviceIcon(device.type)}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{device.name}</h3>
                          {device.model && (
                            <p className="text-sm text-muted-foreground">{device.model}</p>
                          )}
                        </div>
                        {getStatusBadge(device.status)}
                      </div>
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                        {device.serialNumber && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.serialNumber")}</p>
                            <p className="text-sm font-medium">{device.serialNumber}</p>
                          </div>
                        )}
                        {device.manufacturer && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.manufacturer")}</p>
                            <p className="text-sm font-medium">{device.manufacturer}</p>
                          </div>
                        )}
                        {device.issueDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.installDate")}</p>
                            <p className="text-sm font-medium">
                              {new Date(device.issueDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                            </p>
                          </div>
                        )}
                        {device.cobbAngle && (
                          <div>
                            <p className="text-xs text-muted-foreground">{language === 'ru' ? 'Угол Кобба' : 'Cobb Angle'}</p>
                            <p className="text-sm font-medium">{device.cobbAngle}°</p>
                          </div>
                        )}
                      </div>

                      {/* Wear Schedule */}
                      {device.wearSchedule && device.status === 'in_use' && (
                        <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-[hsl(75,100%,35%)]" />
                            <span className="text-sm font-medium">{t("devices.wearSchedule")}:</span>
                            <span className="text-sm">{device.wearSchedule}</span>
                          </div>
                        </div>
                      )}

                      {/* Alerts */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {isWarrantyExpiringSoon(device.warrantyEndDate) && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-medium">
                            <AlertTriangle size={14} />
                            {language === 'ru' ? 'Гарантия истекает' : 'Warranty expiring'}
                          </div>
                        )}
                        {isServiceDueSoon(device.nextServiceDate) && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                            <Wrench size={14} />
                            {language === 'ru' ? 'Скоро ТО' : 'Service due'}
                          </div>
                        )}
                        {device.nextServiceDate && !isServiceDueSoon(device.nextServiceDate) && device.status === 'in_use' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs">
                            <Calendar size={14} />
                            {t("devices.nextService")}: {new Date(device.nextServiceDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <FileText size={18} className="text-muted-foreground" />
                      </button>
                      <button className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Settings size={18} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="scolio-feature-card">
              <CardContent className="p-8">
                <div className="empty-state">
                  <CorsetIcon className="empty-state-icon" size={48} />
                  <p className="empty-state-title">
                    {language === 'ru' ? 'Изделия не найдены' : 'No devices found'}
                  </p>
                  <p className="empty-state-description">
                    {language === 'ru' 
                      ? 'Данные о ваших изделиях появятся после синхронизации с МИС' 
                      : 'Your device data will appear after MIS synchronization'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Card */}
        <Card className="scolio-card scolio-card-orange">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center flex-shrink-0">
                <Wrench size={24} />
              </div>
              <div>
                <p className="font-bold mb-1">
                  {language === 'ru' ? 'Техническое обслуживание' : 'Technical Service'}
                </p>
                <p className="text-sm opacity-80 mb-3">
                  {language === 'ru' 
                    ? 'Регулярное ТО продлевает срок службы изделия и обеспечивает его эффективность' 
                    : 'Regular maintenance extends device life and ensures effectiveness'}
                </p>
                <button className="btn-scolio-primary text-sm py-2 px-4">
                  {language === 'ru' ? 'Записаться на ТО' : 'Schedule Service'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
