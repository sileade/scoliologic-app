import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CorsetIcon, CalendarIcon, RefreshIcon, ShieldIcon } from "@/components/NotionIcons";
import { AlertTriangle, Calendar, Wrench } from "lucide-react";

type DeviceCategory = 'all' | 'corsets' | 'orthoses';

interface Device {
  id: string;
  type: 'corset' | 'orthosis';
  name: string;
  model?: string;
  serialNumber?: string;
  status: 'in_use' | 'manufacturing' | 'ready' | 'replaced';
  issueDate?: string;
  warrantyEndDate?: string;
  nextServiceDate?: string;
}

const mockDevices: Device[] = [
  {
    id: '1',
    type: 'corset',
    name: 'Корсет Шено',
    model: 'Cheneau Classic',
    serialNumber: 'SCL-2025-001234',
    status: 'in_use',
    issueDate: '2025-10-15',
    warrantyEndDate: '2026-10-15',
    nextServiceDate: '2026-02-15',
  },
  {
    id: '2',
    type: 'corset',
    name: 'Новый корсет',
    model: 'Cheneau 3D',
    status: 'manufacturing',
  },
  {
    id: '3',
    type: 'orthosis',
    name: 'Ортез голеностопный',
    model: 'AFO-Light',
    serialNumber: 'OB-2025-005678',
    status: 'in_use',
    issueDate: '2025-11-20',
    warrantyEndDate: '2026-11-20',
  },
];

export default function Devices() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DeviceCategory>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = [
    { id: 'all' as const, label: language === 'ru' ? 'Все' : 'All' },
    { id: 'corsets' as const, label: language === 'ru' ? 'Корсеты' : 'Corsets' },
    { id: 'orthoses' as const, label: language === 'ru' ? 'Ортезы' : 'Orthoses' },
  ];

  const filteredDevices = mockDevices.filter(device => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'corsets') return device.type === 'corset';
    return device.type === 'orthosis';
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const getStatusBadge = (status: Device['status']) => {
    const config = {
      in_use: { label: language === 'ru' ? 'Используется' : 'In Use', color: 'bg-green-100 text-green-700' },
      manufacturing: { label: language === 'ru' ? 'Изготовление' : 'Manufacturing', color: 'bg-purple-100 text-purple-700' },
      ready: { label: language === 'ru' ? 'Готов' : 'Ready', color: 'bg-accent/20 text-accent' },
      replaced: { label: language === 'ru' ? 'Заменён' : 'Replaced', color: 'bg-gray-100 text-gray-600' },
    };
    const c = config[status];
    return <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", c.color)}>{c.label}</span>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const isServiceSoon = (date?: string) => {
    if (!date) return false;
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 14;
  };

  return (
    <AppLayout title={t("devices.title")}>
      <div className="px-4 py-6 lg:px-8 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("devices.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("devices.subtitle")}</p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn("btn-scolio-outline flex items-center gap-2 text-sm py-2 px-3", isRefreshing && "opacity-50")}
          >
            <RefreshIcon size={16} className={cn(isRefreshing && "animate-spin")} />
            {language === 'ru' ? 'Обновить' : 'Refresh'}
          </button>
        </div>

        {/* MIS Status */}
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <ShieldIcon size={16} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t("devices.fromMIS")}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ru' ? 'Синхронизировано' : 'Synced'}: {new Date().toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeCategory === cat.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Devices List */}
        <div className="space-y-3">
          {filteredDevices.map((device) => (
            <Card key={device.id} className="card-interactive">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <CorsetIcon size={24} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold">{device.name}</h3>
                        {device.model && <p className="text-sm text-muted-foreground">{device.model}</p>}
                      </div>
                      {getStatusBadge(device.status)}
                    </div>
                    
                    {device.status === 'in_use' && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                        {device.serialNumber && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.serialNumber")}</p>
                            <p className="text-sm font-medium">{device.serialNumber}</p>
                          </div>
                        )}
                        {device.issueDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.issueDate")}</p>
                            <p className="text-sm font-medium">{formatDate(device.issueDate)}</p>
                          </div>
                        )}
                        {device.warrantyEndDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.warranty")}</p>
                            <p className="text-sm font-medium">{formatDate(device.warrantyEndDate)}</p>
                          </div>
                        )}
                        {device.nextServiceDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("devices.nextService")}</p>
                            <div className="flex items-center gap-1">
                              {isServiceSoon(device.nextServiceDate) && (
                                <AlertTriangle size={12} className="text-orange-500" />
                              )}
                              <p className={cn("text-sm font-medium", isServiceSoon(device.nextServiceDate) && "text-orange-600")}>
                                {formatDate(device.nextServiceDate)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {device.status === 'manufacturing' && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-purple-600">
                          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">{language === 'ru' ? 'В процессе изготовления' : 'Being manufactured'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
