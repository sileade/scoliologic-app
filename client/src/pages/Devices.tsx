import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { cn } from '@/lib/utils';
import { ChevronRight, Shield, AlertTriangle, CheckCircle, ChevronLeft } from 'lucide-react';
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
    image: '🦴'
  },
  {
    id: '2',
    type: 'corset',
    name: 'Новый корсет',
    model: 'Cheneau 3D',
    status: 'manufacturing',
    image: '⏳'
  },
  {
    id: '3',
    type: 'orthosis',
    name: 'Ортез голеностопный',
    model: 'AFO-Light',
    serialNumber: 'OB-2025-005678',
    status: 'warranty_ending',
    issueDate: '2025-11-20',
    warrantyEndDate: '2026-02-20',
    image: '👟'
  },
];

export default function Devices() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DeviceCategory>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Haptic feedback
  const haptic = (intensity: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(intensity);
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }, []);

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
                    <span className="text-sm font-medium text-teal-600">{formatDate(selectedDevice.nextServiceDate)}</span>
                  </div>
                )}
              </div>
            )}

            {selectedDevice.status === 'manufacturing' && (
              <div className="flex items-center justify-center gap-3 py-8 text-teal-600">
                <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">{language === 'ru' ? 'В процессе изготовления' : 'Being manufactured'}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button 
              className="w-full mobile-card card-interactive flex items-center justify-between"
              onClick={() => haptic()}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📞</span>
                <span className="font-medium">{language === 'ru' ? 'Связаться с производителем' : 'Contact manufacturer'}</span>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </button>

            <button 
              className="w-full mobile-card card-interactive flex items-center justify-between"
              onClick={() => haptic()}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <span className="font-medium">{language === 'ru' ? 'Инструкция по уходу' : 'Care instructions'}</span>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </button>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  // Device list view
  return (
    <div className="mobile-page">
      {/* Header */}
      <header className="mobile-header">
        <h1 className="mobile-header-title">{t("devices.title")}</h1>
      </header>

      {/* Categories */}
      <div className="px-4 py-3 bg-white border-b overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {categories.map((cat) => (
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
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh} className="mobile-content has-bottom-nav">
        {/* MIS Status */}
        <div className="bg-teal-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Shield size={20} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-800">{t("devices.fromMIS")}</p>
            <p className="text-xs text-teal-600">
              {language === 'ru' ? 'Синхронизировано' : 'Synced'}: {new Date().toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-teal-600">{mockDevices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ru' ? 'Всего' : 'Total'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-500">
              {mockDevices.filter(d => d.status === 'in_use').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ru' ? 'Активных' : 'Active'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-teal-500">
              {mockDevices.filter(d => d.status === 'manufacturing').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ru' ? 'В работе' : 'In progress'}
            </p>
          </div>
        </div>

        {/* Devices List */}
        <div className="space-y-3 mb-20">
          {filteredDevices.map((device) => {
            const statusInfo = getStatusInfo(device.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={device.id}
                className="mobile-card card-interactive"
                onClick={() => {
                  haptic();
                  setSelectedDevice(device);
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-3xl flex-shrink-0">
                    {device.image}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{device.name}</h3>
                        {device.model && (
                          <p className="text-sm text-muted-foreground">{device.model}</p>
                        )}
                      </div>
                      <ChevronRight size={20} className="text-gray-300 flex-shrink-0 mt-1" />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        statusInfo.color
                      )}>
                        {StatusIcon && <StatusIcon size={10} />}
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PullToRefresh>

      <MobileBottomNav />
    </div>
  );
}
