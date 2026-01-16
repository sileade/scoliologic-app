import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  DocumentIcon, 
  SearchIcon, 
  ChevronRightIcon,
  FileIcon,
  CalendarIcon,
  PlusIcon
} from "@/components/NotionIcons";
import { Download, Eye, Upload, Filter } from "lucide-react";

type DocumentCategory = 'all' | 'medical' | 'ipr' | 'contracts' | 'certificates';

interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  date: string;
  size: string;
  type: 'pdf' | 'doc' | 'image';
}

// Mock data
const mockDocuments: Document[] = [
  { id: '1', name: 'Выписка из истории болезни', category: 'medical', date: '2025-12-15', size: '2.4 MB', type: 'pdf' },
  { id: '2', name: 'ИПР/ИПРА', category: 'ipr', date: '2025-11-20', size: '1.8 MB', type: 'pdf' },
  { id: '3', name: 'Договор на изготовление корсета', category: 'contracts', date: '2025-10-05', size: '540 KB', type: 'pdf' },
  { id: '4', name: 'Справка МСЭ', category: 'certificates', date: '2025-09-12', size: '320 KB', type: 'pdf' },
  { id: '5', name: 'Рентген позвоночника', category: 'medical', date: '2025-12-01', size: '5.2 MB', type: 'image' },
  { id: '6', name: 'Заключение ортопеда', category: 'medical', date: '2025-11-28', size: '890 KB', type: 'pdf' },
  { id: '7', name: 'Документы для СФР', category: 'ipr', date: '2025-10-15', size: '1.2 MB', type: 'pdf' },
];

export default function Documents() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all' as const, label: language === 'ru' ? 'Все' : 'All' },
    { id: 'medical' as const, label: language === 'ru' ? 'Медицинские' : 'Medical' },
    { id: 'ipr' as const, label: language === 'ru' ? 'ИПР/СФР' : 'IPR/SFR' },
    { id: 'contracts' as const, label: language === 'ru' ? 'Договоры' : 'Contracts' },
    { id: 'certificates' as const, label: language === 'ru' ? 'Справки' : 'Certificates' },
  ];

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">PDF</div>;
      case 'doc':
        return <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">DOC</div>;
      case 'image':
        return <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">IMG</div>;
      default:
        return <FileIcon size={24} />;
    }
  };

  return (
    <AppLayout title={t("documents.title")}>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {t("documents.title")}
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {t("documents.subtitle")}
          </p>
        </div>

        {/* Search and Upload */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={language === 'ru' ? 'Поиск документов...' : 'Search documents...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-scolio pl-12"
            />
          </div>
          <button className="btn-scolio-primary flex items-center justify-center gap-2">
            <Upload size={20} />
            {t("documents.upload")}
          </button>
        </div>

        {/* Category Tabs */}
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

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc, index) => (
              <Card 
                key={doc.id} 
                className="scolio-feature-card card-interactive animate-fade-in stagger-item"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getFileIcon(doc.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon size={14} />
                          {new Date(doc.date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                        </span>
                        <span>{doc.size}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        title={t("documents.view")}
                      >
                        <Eye size={18} className="text-muted-foreground" />
                      </button>
                      <button 
                        className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center hover:bg-accent/20 transition-colors"
                        title={t("documents.download")}
                      >
                        <Download size={18} className="text-accent" />
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
                  <DocumentIcon className="empty-state-icon" size={48} />
                  <p className="empty-state-title">{t("documents.empty")}</p>
                  <p className="empty-state-description">
                    {language === 'ru' 
                      ? 'Загрузите документы или измените фильтры' 
                      : 'Upload documents or change filters'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Card */}
        <Card className="scolio-card scolio-card-mint">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center flex-shrink-0">
                <DocumentIcon size={24} />
              </div>
              <div>
                <p className="font-bold mb-1">
                  {language === 'ru' ? 'Подготовка документов для СФР' : 'SFR Document Preparation'}
                </p>
                <p className="text-sm opacity-80 mb-3">
                  {language === 'ru' 
                    ? 'Мы поможем подготовить все необходимые документы для получения компенсации' 
                    : 'We will help prepare all necessary documents for compensation'}
                </p>
                <button className="btn-scolio-primary text-sm py-2 px-4">
                  {language === 'ru' ? 'Узнать подробнее' : 'Learn More'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
