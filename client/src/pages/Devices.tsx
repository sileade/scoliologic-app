import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ChevronRight, Shield, AlertTriangle, CheckCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { CorsetIcon } from '@/components/NotionIcons';

type DeviceCategory = 'all' | 'corsets' | 'orthoses';

interface Device {
  id: string;
  type: 'corset' | 'orthosis';
  name: string;
  model?: string;
  serialNumber?: string;
  status: 'in_use' | 'manufacturing' | 'ready' | 'warranty_ending';
  issueDate?: string;
  warrantyEndDate?: string;
  nextServiceDate?: string;
  image: string;
}

export default function Devices() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DeviceCategory>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Fetch devices from API
  const { 
    data: devicesData, 
    isLoading, 
    error,
    refetch 
  } = trpc.mis.getDevices.useQuery(undefined, {
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Transform API data to component format
  const rawDevices = Array.isArray(devicesData) ? devicesData : (devicesData as any)?.data || [];
  const devices: Device[] = rawDevices.map((device: any) => ({
    id: device.id || device.deviceId,
    type: device.type || (device.category === 'corset' ? 'corset' : 'orthosis'),
    name: device.name || device.deviceName || 'Изделие',
    model: device.model || device.modelName,
    serialNumber: device.serialNumber || device.serial,
    status: mapDeviceStatus(device.status),
    issueDate: device.issueDate || device.issuedAt,
    warrantyEndDate: device.warrantyEndDate || device.warrantyUntil,
    nextServiceDate: device.nextServiceDate || device.nextService,
    image: getDeviceEmoji(device.type || device.category),
  }));

  // Haptic feedback
  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const categories = [
    { id: 'all' as const, label: language === 'ru' ? 'Все' : 'All' },
    { id: 'corsets' as const, label: language === 'ru' ? 'Корсеты' : 'Corsets' },
    { id: 'orthoses' as const, label: language === 'ru' ? 'Ортезы' : 'Orthoses' },
  ];

  const filteredDevices = devices.filter(device => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'corsets') return device.type === 'corset';
    return device.type === 'orthosis';
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const getStatusInfo = (status: Device['status']) => {
    switch (status) {
      case 'in_use':
        return {
          label: language === 'ru' ? 'Используется' : 'In Use',
          color: 'bg-green-100 text-green-700',
          icon: CheckCircle
        };
      case 'manufacturing':
        return {
          label: language === 'ru' ? 'Изготовление' : 'Manufacturing',
          color: 'bg-teal-100 text-teal-700',
          icon: null
        };
      case 'ready':
        return {
          label: language === 'ru' ? 'Готов' : 'Ready',
          color: 'bg-teal-100 text-teal-700',
          icon: CheckCircle
        };
      case 'warranty_ending':
        return {
          label: language === 'ru' ? 'Гарантия заканчивается' : 'Warranty ending',
          color: 'bg-orange-100 text-orange-700',
          icon: AlertTriangle
        };
    }
  };

  // Device detail view
  if (selectedDevice) {
    const statusInfo = getStatusInfo(selectedDevice.status);
    const StatusIcon = statusInfo.icon;

    return (
      <div className="mobile-page">
        {/* Header */}
        <header className="mobile-header">
          <button 
            className="btn-icon -ml-2"
            onClick={() => {
              haptic();
              setSelectedDevice(null);
            }}
            aria-label="Назад"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="mobile-header-title ml-2">{selectedDevice.name}</h1>
        </header>

        <div className="mobile-content">
          {/* Device Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-teal-100 flex items-center justify-center text-4xl">
                {selectedDevice.image}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedDevice.name}</h2>
                {selectedDevice.model && (
                  <p className="text-sm text-muted-foreground">{selectedDevice.model}</p>
                )}
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2",
                  statusInfo.color
                )}>
                  {StatusIcon && <StatusIcon size={12} />}
                  {statusInfo.label}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            {selectedDevice.status !== 'manufacturing' && (
              <div className="space-y-4">
                {selectedDevice.serialNumber && (
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="text-lg">📋</span>
                      <span className="text-sm">{language === 'ru' ? 'Серийный номер' : 'Serial'}</span>
                    </div>
                    <span className="font-mono text-sm">{selectedDevice.serialNumber}</span>
                  </div>
                )}

                {selectedDevice.issueDate && (
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="text-lg">📅</span>
                      <span className="text-sm">{language === 'ru' ? 'Дата выдачи' : 'Issue date'}</span>
                    </div>
                    <span className="text-sm font-medium">{formatDate(selectedDevice.issueDate)}</span>
                  </div>
                )}

                {selectedDevice.warrantyEndDate && (
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Shield size={18} />
                      <span className="text-sm">{language === 'ru' ? 'Гарантия до' : 'Warranty until'}</span>
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      selectedDevice.status === 'warranty_ending' && "text-orange-600"
                    )}>
                      {formatDate(selectedDevice.warrantyEndDate)}
                    </span>
                  </div>
                )}

                {selectedDevice.nextServiceDate && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="text-lg">🔧</span>
                      <span className="text-sm">{language === 'ru' ? 'Следующее ТО' : 'Next service'}</span>
                    </div>
                    <span className="text-sm font-medium">{formatDate(selectedDevice.nextServiceDate)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Manufacturing Progress */}
            {selectedDevice.status === 'manufacturing' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Прогресс изготовления' : 'Manufacturing progress'}
                  </span>
                  <span className="text-sm font-medium text-teal-600">60%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full w-[60%]" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'ru' ? 'Ожидаемая дата готовности: ' : 'Expected ready date: '}
                  <span className="font-medium">15 февраля 2026</span>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button 
              className="w-full mobile-card card-interactive flex items-center justify-between"
              onClick={haptic}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <span className="font-medium">{language === 'ru' ? 'Связаться с мастером' : 'Contact technician'}</span>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </button>

            <button 
              className="w-full mobile-card card-interactive flex items-center justify-between"
              onClick={haptic}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <span className="font-medium">{language === 'ru' ? 'Документы' : 'Documents'}</span>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  // Device list view
  return (
    <div className="mobile-page bg-gray-50">
      {/* Header */}
      <header className="mobile-header bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-foreground">
          {language === 'ru' ? 'Мои изделия' : 'My Devices'}
        </h1>
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <CorsetIcon size={20} className="text-teal-600" />
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="mobile-content has-bottom-nav">
        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                haptic();
                setActiveCategory(cat.id);
              }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-teal-500 text-white"
                  : "bg-white text-muted-foreground border border-gray-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="text-teal-500 animate-spin mb-4" />
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Загрузка...' : 'Loading...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 rounded-2xl p-6 text-center">
            <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-2">
              {language === 'ru' ? 'Ошибка загрузки' : 'Loading error'}
            </p>
            <p className="text-sm text-red-600 mb-4">
              {language === 'ru' ? 'Не удалось загрузить список изделий' : 'Failed to load devices'}
            </p>
            <button 
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium"
            >
              {language === 'ru' ? 'Повторить' : 'Retry'}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredDevices.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <CorsetIcon size={32} className="text-gray-400" />
            </div>
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Нет изделий' : 'No devices'}
            </p>
          </div>
        )}

        {/* Device List */}
        {!isLoading && !error && filteredDevices.length > 0 && (
          <div className="space-y-3">
            {filteredDevices.map(device => {
              const statusInfo = getStatusInfo(device.status);
              const StatusIcon = statusInfo.icon;

              return (
                <button
                  key={device.id}
                  onClick={() => {
                    haptic();
                    setSelectedDevice(device);
                  }}
                  className="w-full mobile-card card-interactive"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {device.image}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-semibold text-foreground truncate">{device.name}</h3>
                      {device.model && (
                        <p className="text-sm text-muted-foreground truncate">{device.model}</p>
                      )}
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                        statusInfo.color
                      )}>
                        {StatusIcon && <StatusIcon size={10} />}
                        {statusInfo.label}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PullToRefresh>

      <MobileBottomNav />
    </div>
  );
}

// Helper functions
function mapDeviceStatus(status: string): Device['status'] {
  const statusMap: Record<string, Device['status']> = {
    'active': 'in_use',
    'in_use': 'in_use',
    'used': 'in_use',
    'manufacturing': 'manufacturing',
    'in_production': 'manufacturing',
    'ready': 'ready',
    'completed': 'ready',
    'warranty_ending': 'warranty_ending',
    'warranty_soon': 'warranty_ending',
  };
  return statusMap[status?.toLowerCase()] || 'in_use';
}

function getDeviceEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    'corset': '🦴',
    'orthosis': '👟',
    'prosthesis': '🦿',
    'brace': '🦴',
  };
  return emojiMap[type?.toLowerCase()] || '📦';
}
