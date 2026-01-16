import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DocumentIcon, CalendarIcon } from "@/components/NotionIcons";
import { Download, Eye, Search, Upload } from "lucide-react";

type DocumentCategory = 'all' | 'medical' | 'ipr' | 'certificates' | 'contracts';

interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  date: string;
  size: string;
  type: 'pdf' | 'jpg' | 'doc';
}

const mockDocuments: Document[] = [
  { id: '1', name: 'Выписка из истории болезни', category: 'medical', date: '2026-01-10', size: '2.4 MB', type: 'pdf' },
  { id: '2', name: 'Рентген позвоночника', category: 'medical', date: '2026-01-08', size: '5.1 MB', type: 'jpg' },
  { id: '3', name: 'ИПР (программа реабилитации)', category: 'ipr', date: '2025-12-15', size: '1.2 MB', type: 'pdf' },
  { id: '4', name: 'Справка МСЭ', category: 'certificates', date: '2025-11-20', size: '0.8 MB', type: 'pdf' },
  { id: '5', name: 'Договор на изготовление корсета', category: 'contracts', date: '2025-10-15', size: '1.5 MB', type: 'pdf' },
  { id: '6', name: 'Заключение ортопеда', category: 'medical', date: '2025-10-10', size: '0.9 MB', type: 'pdf' },
];

export default function Documents() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all' as const, label: language === 'ru' ? 'Все' : 'All' },
    { id: 'medical' as const, label: language === 'ru' ? 'Медицинские' : 'Medical' },
    { id: 'ipr' as const, label: 'ИПР' },
    { id: 'certificates' as const, label: language === 'ru' ? 'Справки' : 'Certificates' },
    { id: 'contracts' as const, label: language === 'ru' ? 'Договоры' : 'Contracts' },
  ];

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const getTypeColor = (type: Document['type']) => {
    const colors = { pdf: 'bg-red-100 text-red-600', jpg: 'bg-blue-100 text-blue-600', doc: 'bg-blue-100 text-blue-700' };
    return colors[type];
  };

  return (
    <AppLayout title={t("documents.title")}>
      <div className="px-4 py-6 lg:px-8 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("documents.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'ru' ? `${mockDocuments.length} документов` : `${mockDocuments.length} documents`}
            </p>
          </div>
          <button className="btn-scolio-primary flex items-center gap-2 text-sm py-2 px-4">
            <Upload size={16} />
            {language === 'ru' ? 'Загрузить' : 'Upload'}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ru' ? 'Поиск документов...' : 'Search documents...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Documents List */}
        <div className="space-y-2">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => (
              <Card key={doc.id} className="card-interactive">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs", getTypeColor(doc.type))}>
                    {doc.type.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.date)} • {doc.size}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                      <Eye size={16} className="text-muted-foreground" />
                    </button>
                    <button className="w-8 h-8 rounded-lg hover:bg-accent/10 flex items-center justify-center transition-colors">
                      <Download size={16} className="text-accent" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <DocumentIcon size={24} className="text-muted-foreground" />
              </div>
              <p className="font-medium">{language === 'ru' ? 'Документы не найдены' : 'No documents found'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ru' ? 'Попробуйте изменить фильтры' : 'Try changing filters'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
