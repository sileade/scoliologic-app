import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Search, Play, BookOpen, Clock, ChevronRight, Star, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { id: "all", labelKey: "knowledge.all" },
  { id: "exercises", labelKey: "knowledge.exercises" },
  { id: "nutrition", labelKey: "knowledge.nutrition" },
  { id: "recovery", labelKey: "knowledge.recovery" },
  { id: "faq", labelKey: "knowledge.faq" },
];

export default function Knowledge() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  // Fetch articles from API with caching
  const queryOptions = { staleTime: 60000, refetchOnWindowFocus: false, retry: 1 };
  const { data: articles, isLoading } = trpc.knowledge.getArticles.useQuery({
    category: activeCategory === "all" ? undefined : activeCategory,
    search: searchQuery || undefined,
  }, queryOptions);

  // Fetch single article when selected
  const { data: articleDetail, isLoading: articleLoading } = trpc.knowledge.getArticle.useQuery(
    { id: selectedArticleId! },
    { enabled: !!selectedArticleId, ...queryOptions }
  );

  // Increment views mutation
  const incrementViewsMutation = trpc.knowledge.incrementViews.useMutation();

  const handleArticleClick = (articleId: number) => {
    setSelectedArticleId(articleId);
    incrementViewsMutation.mutate({ id: articleId });
  };

  const filteredArticles = articles || [];
  const featuredArticles = filteredArticles.filter(a => a.featured);

  // Article detail view
  if (selectedArticleId && articleDetail) {
    return (
      <AppLayout>
        <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto">
          <button 
            onClick={() => setSelectedArticleId(null)}
            className="flex items-center gap-2 text-primary mb-6 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ru' ? 'Назад к статьям' : 'Back to articles'}
          </button>
          
          {articleLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <article className="prose dark:prose-invert max-w-none">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                {language === 'ru' ? articleDetail.title : (articleDetail.titleEn || articleDetail.title)}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="px-2 py-1 bg-muted rounded capitalize">{articleDetail.category}</span>
                <span>{articleDetail.views || 0} {language === 'ru' ? 'просмотров' : 'views'}</span>
                {(articleDetail as any).readTime && (
                  <span>{(articleDetail as any).readTime} {language === 'ru' ? 'мин чтения' : 'min read'}</span>
                )}
              </div>
              {(articleDetail as any).imageUrl && (
                <img 
                  src={(articleDetail as any).imageUrl} 
                  alt={articleDetail.title}
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
              )}
              <div className="text-foreground whitespace-pre-wrap">
                {articleDetail.content || articleDetail.description || ''}
              </div>
              {articleDetail.videoUrl && (
                <div className="mt-6">
                  <h3 className="font-bold mb-3">{language === 'ru' ? 'Видео' : 'Video'}</h3>
                  <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                    <a 
                      href={articleDetail.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Play className="w-6 h-6" />
                      {language === 'ru' ? 'Смотреть видео' : 'Watch video'}
                    </a>
                  </div>
                </div>
              )}
            </article>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-6xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">{t("knowledge.title")}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">{t("knowledge.subtitle")}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder={t("knowledge.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {activeCategory === "all" && searchQuery === "" && featuredArticles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <h2 className="font-bold text-lg">{t("knowledge.featured")}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {featuredArticles.map((article) => (
                <Card 
                  key={article.id} 
                  className="border-none shadow-sm card-interactive overflow-hidden cursor-pointer"
                  onClick={() => handleArticleClick(article.id)}
                >
                  <div className="aspect-video relative">
                    {(article as any).imageUrl ? (
                      <img src={(article as any).imageUrl} alt={language === 'ru' ? article.title : (article.titleEn || article.title)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    )}
                    {article.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-6 h-6 text-primary ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{language === 'ru' ? article.title : (article.titleEn || article.title)}</h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{article.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {(article as any).readTime || '5'} {t("knowledge.min")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="font-bold text-lg">{t("knowledge.allResources")}</h2>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-none shadow-sm">
                  <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                    <Skeleton className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredArticles.length > 0 ? (
              filteredArticles.map((article: any) => (
                <Card 
                  key={article.id} 
                  className="border-none shadow-sm card-interactive cursor-pointer"
                  onClick={() => handleArticleClick(article.id)}
                >
                  <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden flex-shrink-0">
                      {(article as any).imageUrl ? (
                        <img src={(article as any).imageUrl} alt={language === 'ru' ? article.title : (article.titleEn || article.title)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          {article.type === "video" ? (
                            <Play className="w-6 h-6 text-muted-foreground/50" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${article.type === "video" ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
                        {article.type === "video" ? t("knowledge.video") : t("knowledge.article")}
                      </span>
                      <h3 className="font-medium text-sm lg:text-base line-clamp-1 mt-1">
                        {language === 'ru' ? article.title : (article.titleEn || article.title)}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {(article as any).readTime || '5'} {t("knowledge.min")}
                        <span>•</span>
                        <span>{article.views || 0} {language === 'ru' ? 'просм.' : 'views'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("knowledge.noResults")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
