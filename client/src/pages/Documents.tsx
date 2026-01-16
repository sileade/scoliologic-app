import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SwipeableCard } from '@/components/SwipeableCard';
import { cn } from '@/lib/utils';
import { Download, Eye, Search, ChevronRight, FileText, Shield, Calendar, Activity } from 'lucide-react';

type DocumentCategory = 'all' | 'medical' | 'ipr' | 'certificates';

interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  date: string;
  size: string;
  type: 'pdf' | 'jpg' | 'doc';
  icon: string;
}

const mockDocuments: Document[] = [
  { id: '1', name: 'Выписка из истории болезни', category: 'medical', date: '2026-01-10', size: '2.4 MB', type: 'pdf', icon: '📋' },
  { id: '2', name: 'Рентген позвоночника', category: 'medical', date: '2026-01-08', size: '5.1 MB', type: 'jpg', icon: '🩻' },
  { id: '3', name: 'ИПР (программа реабилитации)', category: 'ipr', date: '2025-12-15', size: '1.2 MB', type: 'pdf', icon: '📑' },
  { id: '4', name: 'Справка МСЭ', category: 'certificates', date: '2025-11-20', size: '0.8 MB', type: 'pdf', icon: '📄' },
  { id: '5', name: 'Заключение ортопеда', category: 'medical', date: '2025-10-10', size: '0.9 MB', type: 'pdf', icon: '👨‍⚕️' },
];

export default function Documents() {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Haptic feedback
  const haptic = (intensity: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(intensity);
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }, []);

  const categories = [
    { id: 'all' as const, label: language === 'ru' ? 'Все' : 'All', icon: FileText },
    { id: 'medical' as const, label: language === 'ru' ? 'Медицинские' : 'Medical', icon: Activity },
    { id: 'ipr' as const, label: 'ИПР', icon: Shield },
    { id: 'certificates' as const, label: language === 'ru' ? 'Справки' : 'Certificates', icon: Calendar },
  ];

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short'
    });
  };

  const handleView = (doc: Document) => {
    haptic(25);
    console.log('View:', doc.name);
  };

  const handleDownload = (doc: Document) => {
    haptic(25);
    console.log('Download:', doc.name);
  };

  return (
    <div className="mobile-page">
      {/* Header */}
      <header className="mobile-header">
        <h1 className="mobile-header-title">
          {language === 'ru' ? 'Документы' : 'Documents'}
        </h1>
        <button className="btn-icon" onClick={() => haptic()}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ru' ? 'Поиск...' : 'Search...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 bg-white border-b overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  haptic();
                  setActiveCategory(cat.id);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  isActive 
                    ? "bg-teal-500 text-white" 
                    : "bg-gray-100 text-gray-600 active:bg-gray-200"
                )}
              >
                <Icon size={16} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh} className="mobile-content has-bottom-nav">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-teal-600">{mockDocuments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ru' ? 'Всего' : 'Total'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-500">2</p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ru' ? 'Новых' : 'New'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-500">1</p>
            <p className="text-xs text-muted-foreground mt-1">ИПР</p>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-gray-400" />
              </div>
              <p className="font-medium">
                {language === 'ru' ? 'Документы не найдены' : 'No documents found'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ru' ? 'Попробуйте изменить фильтры' : 'Try changing filters'}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc, index) => (
              <SwipeableCard
                key={doc.id}
                onSwipeLeft={() => handleDownload(doc)}
                onSwipeRight={() => handleView(doc)}
                leftAction={<Download size={20} />}
                rightAction={<Eye size={20} />}
                leftColor="bg-teal-500"
                rightColor="bg-purple-500"
              >
                <div
                  className={cn(
                    "mobile-list-item",
                    index === filteredDocuments.length - 1 && "border-b-0"
                  )}
                  onClick={() => handleView(doc)}
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {doc.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 ml-3">
                    <h3 className="font-medium text-foreground truncate">{doc.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded font-medium uppercase",
                        doc.type === 'pdf' && "bg-red-100 text-red-600",
                        doc.type === 'jpg' && "bg-blue-100 text-blue-600",
                        doc.type === 'doc' && "bg-indigo-100 text-indigo-600"
                      )}>
                        {doc.type}
                      </span>
                      <span>{formatDate(doc.date)}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
                </div>
              </SwipeableCard>
            ))
          )}
        </div>

        {/* Hint */}
        {filteredDocuments.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4 mb-20">
            {language === 'ru' 
              ? '← Свайп для скачивания | Свайп для просмотра →' 
              : '← Swipe to download | Swipe to view →'}
          </p>
        )}
      </PullToRefresh>

      <MobileBottomNav />
    </div>
  );
}
