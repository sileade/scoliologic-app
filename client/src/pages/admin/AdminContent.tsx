import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Plus, Search, Edit, Trash2, Eye, FileText, Video, Image,
  Calendar, Tag, MoreVertical, ChevronRight, Filter, Download
} from "lucide-react";

interface Article {
  id: number;
  title: { ru: string; en: string };
  category: string;
  type: 'article' | 'video' | 'exercise';
  status: 'published' | 'draft';
  views: number;
  createdAt: string;
  updatedAt: string;
}

const initialArticles: Article[] = [
  { id: 1, title: { ru: "Уход за протезом зимой", en: "Winter Prosthesis Care" }, category: "care", type: "article", status: "published", views: 1250, createdAt: "2024-11-15", updatedAt: "2024-12-01" },
  { id: 2, title: { ru: "Упражнения для укрепления мышц", en: "Muscle Strengthening Exercises" }, category: "exercises", type: "video", status: "published", views: 3420, createdAt: "2024-10-20", updatedAt: "2024-11-28" },
  { id: 3, title: { ru: "Как правильно надевать протез", en: "How to Properly Wear Prosthesis" }, category: "guide", type: "video", status: "published", views: 5670, createdAt: "2024-09-10", updatedAt: "2024-10-15" },
  { id: 4, title: { ru: "Психологическая адаптация", en: "Psychological Adaptation" }, category: "psychology", type: "article", status: "draft", views: 0, createdAt: "2024-12-05", updatedAt: "2024-12-05" },
  { id: 5, title: { ru: "Растяжка для начинающих", en: "Stretching for Beginners" }, category: "exercises", type: "exercise", status: "published", views: 2100, createdAt: "2024-08-22", updatedAt: "2024-09-30" },
];

const categories = [
  { id: "all", label: { ru: "Все", en: "All" } },
  { id: "care", label: { ru: "Уход", en: "Care" } },
  { id: "exercises", label: { ru: "Упражнения", en: "Exercises" } },
  { id: "guide", label: { ru: "Руководства", en: "Guides" } },
  { id: "psychology", label: { ru: "Психология", en: "Psychology" } },
];

export default function AdminContent() {
  const { language } = useLanguage();
  // Fetch articles from API
  const { data: apiArticles, isLoading, refetch } = trpc.admin.getContent.useQuery();
  const createArticleMutation = trpc.admin.createContent.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      toast.success(language === 'ru' ? 'Статья создана' : 'Article created');
    }
  });
  const updateArticleMutation = trpc.admin.updateContent.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
      toast.success(language === 'ru' ? 'Статья обновлена' : 'Article updated');
    }
  });
  const deleteArticleMutation = trpc.admin.deleteContent.useMutation({
    onSuccess: () => {
      refetch();
      setShowDeleteModal(false);
      toast.success(language === 'ru' ? 'Статья удалена' : 'Article deleted');
    }
  });

  // Use API data or fallback to initial data
  const articles = apiArticles || initialArticles;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    titleRu: "",
    titleEn: "",
    category: "care",
    type: "article" as 'article' | 'video' | 'exercise',
    content: "",
  });

  const filteredArticles = (articles || []).filter((article: any) => {
    const matchesSearch = article.title.ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.title.en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesType = !selectedType || article.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4" />;
      case "exercise": return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video": return language === 'ru' ? "Видео" : "Video";
      case "exercise": return language === 'ru' ? "Упражнение" : "Exercise";
      default: return language === 'ru' ? "Статья" : "Article";
    }
  };

  const handleCreate = () => {
    const newArticle: Article = {
      id: Math.max(...articles.map(a => a.id)) + 1,
      title: { ru: formData.titleRu, en: formData.titleEn },
      category: formData.category,
      type: formData.type,
      status: "draft",
      views: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    // Use mutation to create
    createArticleMutation.mutate({
      titleRu: formData.titleRu,
      titleEn: formData.titleEn,
      type: formData.type as any,
      category: formData.category,
      content: formData.content,
    });
    setShowCreateModal(false);
    setFormData({ titleRu: "", titleEn: "", category: "care", type: "article", content: "" });
    toast.success(language === 'ru' ? "Контент создан" : "Content created");
  };

  const handleEdit = () => {
    if (!selectedArticle) return;
    // Use mutation to update
    updateArticleMutation.mutate({
      id: selectedArticle.id,
      titleRu: formData.titleRu,
      titleEn: formData.titleEn,
      category: formData.category,
    });
    setShowEditModal(false);
  };

  const handleDelete = () => {
    if (!selectedArticle) return;
    // Use mutation to delete
    deleteArticleMutation.mutate({ id: selectedArticle.id });
    setShowDeleteModal(false);
  };

  const handlePublish = (article: any) => {
    // Toggle publish status via mutation
    updateArticleMutation.mutate({
      id: article.id,
      status: article.status === 'published' ? 'draft' : 'published',
    });
    toast.success(
      article.published
        ? (language === 'ru' ? "Снято с публикации" : "Unpublished")
        : (language === 'ru' ? "Опубликовано" : "Published")
    );
  };

  const openEditModal = (article: Article) => {
    setSelectedArticle(article);
    setFormData({
      titleRu: article.title.ru,
      titleEn: article.title.en,
      category: article.category,
      type: article.type,
      content: "",
    });
    setShowEditModal(true);
  };

  const stats = {
    total: (articles || []).length,
    published: (articles || []).filter((a: any) => a.published).length,
    draft: (articles || []).filter((a: any) => !a.published).length,
    totalViews: (articles || []).reduce((sum: number, a: any) => sum + (a.views || 0), 0),
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {language === 'ru' ? 'Управление контентом' : 'Content Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Статьи, видео и упражнения' : 'Articles, videos and exercises'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ru' ? 'Создать' : 'Create'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Всего' : 'Total'}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Опубликовано' : 'Published'}</p>
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Черновики' : 'Drafts'}</p>
              <p className="text-2xl font-bold text-orange-600">{stats.draft}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Просмотры' : 'Views'}</p>
              <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ru' ? "Поиск контента..." : "Search content..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label[language]}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {['article', 'video', 'exercise'].map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(selectedType === type ? null : type)}
              >
                {getTypeIcon(type)}
              </Button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">{language === 'ru' ? 'Название' : 'Title'}</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">{language === 'ru' ? 'Тип' : 'Type'}</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">{language === 'ru' ? 'Категория' : 'Category'}</th>
                    <th className="text-left p-4 font-medium">{language === 'ru' ? 'Статус' : 'Status'}</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">{language === 'ru' ? 'Просмотры' : 'Views'}</th>
                    <th className="text-right p-4 font-medium">{language === 'ru' ? 'Действия' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article: any) => (
                    <tr key={article.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            article.type === 'video' ? 'bg-purple-100 text-purple-600' :
                            article.type === 'exercise' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {getTypeIcon(article.type)}
                          </div>
                          <div>
                            <p className="font-medium">{typeof article.title === 'object' ? article.title[language] : (article.titleRu || article.title || '')}</p>
                            <p className="text-xs text-muted-foreground lg:hidden">
                              {getTypeLabel(article.type)} • {categories.find(c => c.id === article.category)?.label[language]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-sm">{getTypeLabel(article.type)}</span>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-sm">{categories.find(c => c.id === article.category)?.label[language]}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          article.status === 'published' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {article.status === 'published' 
                            ? (language === 'ru' ? 'Опубликовано' : 'Published')
                            : (language === 'ru' ? 'Черновик' : 'Draft')
                          }
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-sm">{article.views.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handlePublish(article)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(article)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => { setSelectedArticle(article); setShowDeleteModal(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Создать контент' : 'Create Content'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Название (RU)' : 'Title (RU)'}</label>
              <Input
                value={formData.titleRu}
                onChange={(e) => setFormData({ ...formData, titleRu: e.target.value })}
                placeholder={language === 'ru' ? "Введите название" : "Enter title"}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Название (EN)' : 'Title (EN)'}</label>
              <Input
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                placeholder="Enter title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Тип' : 'Type'}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="article">{language === 'ru' ? 'Статья' : 'Article'}</option>
                  <option value="video">{language === 'ru' ? 'Видео' : 'Video'}</option>
                  <option value="exercise">{language === 'ru' ? 'Упражнение' : 'Exercise'}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Категория' : 'Category'}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  {categories.filter(c => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label[language]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Содержание' : 'Content'}</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={language === 'ru' ? "Введите содержание..." : "Enter content..."}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleCreate} disabled={!formData.titleRu || !formData.titleEn}>
              {language === 'ru' ? 'Создать' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Редактировать контент' : 'Edit Content'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Название (RU)' : 'Title (RU)'}</label>
              <Input
                value={formData.titleRu}
                onChange={(e) => setFormData({ ...formData, titleRu: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Название (EN)' : 'Title (EN)'}</label>
              <Input
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Тип' : 'Type'}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="article">{language === 'ru' ? 'Статья' : 'Article'}</option>
                  <option value="video">{language === 'ru' ? 'Видео' : 'Video'}</option>
                  <option value="exercise">{language === 'ru' ? 'Упражнение' : 'Exercise'}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Категория' : 'Category'}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  {categories.filter(c => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label[language]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleEdit}>
              {language === 'ru' ? 'Сохранить' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Удалить контент?' : 'Delete Content?'}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {language === 'ru' 
              ? `Вы уверены, что хотите удалить "${selectedArticle?.title[language]}"?`
              : `Are you sure you want to delete "${selectedArticle?.title[language]}"?`
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {language === 'ru' ? 'Удалить' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
