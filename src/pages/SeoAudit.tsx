import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Globe, FileText, Code, Search, Loader2, Tag, Sparkles, Wand2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SeoAuditResult } from "@/components/SeoAuditResult";
import { useSEO, SEO_CONFIG } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useArticles, Article } from "@/hooks/useArticles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import DOMPurify from "dompurify";
 
interface CrawlabilityResult {
  robotsTxt: {
    exists: boolean;
    content?: string;
    error?: string;
  };
  sitemap: {
    exists: boolean;
    url?: string;
    error?: string;
  };
}

interface AuditResult {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    items: {
      label: string;
      status: "pass" | "warning" | "fail";
      message: string;
      recommendation?: string;
      currentContent?: string;
      suggestedContent?: string;
    }[];
  }[];
  pageSpeed?: {
    performanceScore: number;
    metrics: {
      name: string;
      value: string;
      score: number;
      status: "pass" | "warning" | "fail";
    }[];
    opportunities: {
      label: string;
      status: "pass" | "warning" | "fail";
      message: string;
      recommendation?: string;
    }[];
  };
  crawlability?: CrawlabilityResult;
}
 
const SeoAudit = () => {
  useSEO(SEO_CONFIG.seoAudit);
  const location = useLocation();
  const { articles, isLoading: isLoadingArticles } = useArticles();

  const [activeTab, setActiveTab] = useState<"website" | "page" | "text" | "html" | "article">("website");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [articleText, setArticleText] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [mainKeyword, setMainKeyword] = useState("");
  const [relatedKeywords, setRelatedKeywords] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [editedContent, setEditedContent] = useState<string>("");
  const [showEditedDialog, setShowEditedDialog] = useState(false);

  const handleApplyRecommendation = useCallback((currentContent: string, suggestedContent: string, label: string) => {
    const input = getInputContent();
    if (!input) return;

    let content = editedContent || input.content;
    if (currentContent && content.includes(currentContent)) {
      content = content.replace(currentContent, suggestedContent);
    } else {
      content = content + "\n" + suggestedContent;
    }
    setEditedContent(content);

    setAppliedItems(prev => {
      const next = new Set(prev);
      if (auditResult) {
        auditResult.categories.forEach((cat, catIdx) => {
          cat.items.forEach((item, itemIdx) => {
            if (item.label === label && item.suggestedContent === suggestedContent) {
              next.add(`${catIdx}-${itemIdx}`);
            }
          });
        });
      }
      return next;
    });

    toast.success(`Rekomendasi "${label}" berhasil diterapkan`);
  }, [editedContent, auditResult]);

  const handleApplyAll = useCallback(() => {
    if (!auditResult) return;
    const input = getInputContent();
    if (!input) return;

    let content = editedContent || input.content;
    const newApplied = new Set(appliedItems);
    let count = 0;

    auditResult.categories.forEach((cat, catIdx) => {
      cat.items.forEach((item, itemIdx) => {
        const key = `${catIdx}-${itemIdx}`;
        if (item.suggestedContent && !newApplied.has(key)) {
          if (item.currentContent && content.includes(item.currentContent)) {
            content = content.replace(item.currentContent, item.suggestedContent);
          } else {
            content = content + "\n" + item.suggestedContent;
          }
          newApplied.add(key);
          count++;
        }
      });
    });

    setEditedContent(content);
    setAppliedItems(newApplied);
    toast.success(`${count} rekomendasi berhasil diterapkan sekaligus!`);
  }, [editedContent, auditResult, appliedItems]);

  const handleViewEdited = useCallback(() => {
    setShowEditedDialog(true);
  }, []);

  // Handle incoming article from navigation state
  useEffect(() => {
    if (location.state?.article) {
      const article = location.state.article as Article;
      setSelectedArticle(article);
      setActiveTab("article");
      // Extract topic as initial keyword
      if (article.topic) {
        setMainKeyword(article.topic);
      }
    }
  }, [location.state]);
 
  const getInputContent = () => {
    switch (activeTab) {
      case "website":
        return { type: "url", content: websiteUrl };
      case "page":
        return { type: "url", content: pageUrl };
      case "text":
        return { type: "text", content: articleText };
      case "html":
        return { type: "html", content: htmlCode };
      case "article":
        return { type: "text", content: selectedArticle?.content || "" };
      default:
        return null;
    }
  };
 
   const isInputValid = () => {
     const input = getInputContent();
    return input && input.content.trim().length > 0 && mainKeyword.trim().length > 0;
   };
 
   const handleAudit = async () => {
     const input = getInputContent();
     if (!input || !input.content.trim()) {
       toast.error("Mohon masukkan konten untuk diaudit");
       return;
     }
 
      setIsLoading(true);
      setAuditResult(null);
      setAppliedItems(new Set());
      setEditedContent("");
 
     try {
       const { data, error } = await supabase.functions.invoke("seo-audit", {
        body: { 
          inputType: input.type, 
          content: input.content,
          mainKeyword: mainKeyword.trim(),
          relatedKeywords: relatedKeywords.split(",").map(k => k.trim()).filter(Boolean),
        },
       });
 
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const result = data.result;
        if (data.pageSpeed) {
          result.pageSpeed = data.pageSpeed;
        }
        if (data.crawlability) {
          result.crawlability = data.crawlability;
        }
        setAuditResult(result);
       toast.success("Audit SEO selesai!");
     } catch (err: any) {
       console.error("SEO Audit error:", err);
       toast.error(err.message || "Gagal melakukan audit SEO");
     } finally {
       setIsLoading(false);
     }
   };
 
  const handleDetectKeywords = async () => {
    const input = getInputContent();
    if (!input || !input.content.trim()) {
      toast.error("Mohon masukkan konten terlebih dahulu");
      return;
    }

    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-audit", {
        body: { action: "detect", inputType: input.type, content: input.content },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.mainKeyword) {
        setMainKeyword(data.mainKeyword);
      }
      if (data.relatedKeywords?.length > 0) {
        setRelatedKeywords(data.relatedKeywords.join(", "));
      }
      toast.success("Keyword berhasil dideteksi!");
    } catch (err: any) {
      console.error("Detect keywords error:", err);
      toast.error(err.message || "Gagal mendeteksi keyword");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSuggestKeywords = async () => {
    if (!mainKeyword.trim()) {
      toast.error("Mohon masukkan keyword utama terlebih dahulu");
      return;
    }

    setIsSuggesting(true);
    setSuggestedKeywords([]);
    try {
      const { data, error } = await supabase.functions.invoke("seo-audit", {
        body: { action: "suggest", mainKeyword: mainKeyword.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.suggestions?.length > 0) {
        setSuggestedKeywords(data.suggestions);
        toast.success("Saran keyword berhasil dibuat!");
      }
    } catch (err: any) {
      console.error("Suggest keywords error:", err);
      toast.error(err.message || "Gagal membuat saran keyword");
    } finally {
      setIsSuggesting(false);
    }
  };

  const addSuggestedKeyword = (keyword: string) => {
    const current = relatedKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (!current.includes(keyword)) {
      const updated = [...current, keyword].join(", ");
      setRelatedKeywords(updated);
      toast.success(`"${keyword}" ditambahkan`);
    }
  };

   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
         <nav className="container mx-auto px-4 py-4">
           <div className="flex items-center gap-4">
             <Link to="/">
               <Button variant="ghost" size="icon">
                 <ArrowLeft className="w-5 h-5" />
               </Button>
             </Link>
             <div>
               <h1 className="font-display text-xl font-bold text-foreground">SEO On-Page Audit</h1>
               <p className="text-xs text-muted-foreground">Analisis lengkap dengan rekomendasi perbaikan</p>
             </div>
           </div>
         </nav>
       </header>
 
       <main className="container mx-auto px-4 py-8">
         <div className="max-w-4xl mx-auto space-y-8">
           {/* Input Section */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Search className="w-5 h-5 text-primary" />
                 Input Konten untuk Audit
               </CardTitle>
               <CardDescription>
                 Pilih metode input: URL website, URL halaman, teks artikel, atau kode HTML
               </CardDescription>
             </CardHeader>
             <CardContent>
            {/* Keyword Inputs */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Keyword Utama <span className="text-destructive">*</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSuggestKeywords}
                    disabled={isSuggesting || !mainKeyword.trim()}
                    className="h-7 text-xs"
                  >
                    {isSuggesting ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    Saran Keyword
                  </Button>
                </label>
                <Input
                  placeholder="Contoh: jasa seo jakarta"
                  value={mainKeyword}
                  onChange={(e) => setMainKeyword(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kata kunci utama yang ingin ditargetkan
                </p>
                {suggestedKeywords.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-background border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Saran Keyword Terkait:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedKeywords.map((kw, idx) => (
                        <button
                          key={idx}
                          onClick={() => addSuggestedKeyword(kw)}
                          className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Keyword Terkait
                </label>
                <Input
                  placeholder="Contoh: seo murah, optimasi website, jasa backlink"
                  value={relatedKeywords}
                  onChange={(e) => setRelatedKeywords(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pisahkan dengan koma untuk beberapa keyword
                </p>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDetectKeywords}
                  disabled={isDetecting || !getInputContent()?.content.trim()}
                  className="w-full"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mendeteksi Keyword...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Deteksi Keyword Otomatis dari Konten
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  AI akan menganalisis konten dan mengekstrak keyword utama secara otomatis
                </p>
              </div>
            </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span className="hidden sm:inline">Website</span>
                  </TabsTrigger>
                  <TabsTrigger value="page" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Page</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Text</span>
                  </TabsTrigger>
                  <TabsTrigger value="html" className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    <span className="hidden sm:inline">HTML</span>
                  </TabsTrigger>
                  <TabsTrigger value="article" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Artikel</span>
                  </TabsTrigger>
                </TabsList>
 
                 <TabsContent value="website" className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-2 block">
                       URL Website
                     </label>
                     <Input
                       placeholder="https://example.com"
                       value={websiteUrl}
                       onChange={(e) => setWebsiteUrl(e.target.value)}
                     />
                     <p className="text-xs text-muted-foreground mt-1">
                       Masukkan URL lengkap website untuk audit homepage
                     </p>
                   </div>
                 </TabsContent>
 
                 <TabsContent value="page" className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-2 block">
                       URL Halaman
                     </label>
                     <Input
                       placeholder="https://example.com/blog/article-title"
                       value={pageUrl}
                       onChange={(e) => setPageUrl(e.target.value)}
                     />
                     <p className="text-xs text-muted-foreground mt-1">
                       Masukkan URL halaman spesifik untuk audit detail
                     </p>
                   </div>
                 </TabsContent>
 
                 <TabsContent value="text" className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-2 block">
                       Teks Artikel
                     </label>
                     <RichTextEditor
                       content={articleText}
                       onChange={setArticleText}
                       placeholder="Tulis atau paste artikel Anda di sini..."
                     />
                   </div>
                 </TabsContent>
 
                <TabsContent value="html" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Kode HTML
                    </label>
                    <Textarea
                      placeholder="<html><head>...</head><body>...</body></html>"
                      value={htmlCode}
                      onChange={(e) => setHtmlCode(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste kode HTML lengkap halaman untuk audit
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="article" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Pilih Artikel dari History
                    </label>
                    {isLoadingArticles ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Memuat artikel...</span>
                      </div>
                    ) : articles.length === 0 ? (
                      <div className="text-center py-8 border border-dashed rounded-lg">
                        <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground mb-3">Belum ada artikel tersimpan</p>
                        <Link to="/create-article">
                          <Button variant="outline" size="sm">
                            Buat Artikel Baru
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px] border rounded-lg">
                        <div className="p-2 space-y-2">
                          {articles.map((article) => {
                            const title = article.content.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || article.topic;
                            const isSelected = selectedArticle?.id === article.id;
                            return (
                              <button
                                key={article.id}
                                onClick={() => {
                                  setSelectedArticle(article);
                                  if (article.topic && !mainKeyword) {
                                    setMainKeyword(article.topic);
                                  }
                                }}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary' 
                                    : 'bg-muted/50 border-transparent hover:bg-muted'
                                }`}
                              >
                                <p className="font-medium text-foreground line-clamp-1">{title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(article.created_at), "d MMM yyyy, HH:mm", { locale: idLocale })}
                                  {article.topic && ` • ${article.topic.slice(0, 30)}...`}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                    {selectedArticle && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm font-medium text-primary">Artikel terpilih:</p>
                        <p className="text-sm text-foreground line-clamp-2 mt-1">
                          {selectedArticle.content.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || selectedArticle.topic}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
               </Tabs>
 
               <div className="mt-6 flex justify-end">
                 <Button
                   onClick={handleAudit}
                   disabled={!isInputValid() || isLoading}
                   className="px-8"
                 >
                   {isLoading ? (
                     <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       Menganalisis...
                     </>
                   ) : (
                     <>
                       <Search className="w-4 h-4 mr-2" />
                       Mulai Audit SEO
                     </>
                   )}
                 </Button>
               </div>
             </CardContent>
           </Card>
 
           {/* Results Section */}
           {auditResult && (
              <SeoAuditResult
                result={auditResult}
                onApplyRecommendation={handleApplyRecommendation}
                onApplyAll={handleApplyAll}
                onViewEdited={handleViewEdited}
                appliedItems={appliedItems}
              />
           )}

           {/* Edited Content Dialog */}
           <Dialog open={showEditedDialog} onOpenChange={setShowEditedDialog}>
             <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle>Hasil Editan Konten</DialogTitle>
               </DialogHeader>
               <div className="prose prose-sm dark:prose-invert max-w-none">
                 {editedContent ? (
                   <div
                     className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-sm whitespace-pre-wrap"
                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editedContent) }}
                   />
                 ) : (
                   <p className="text-muted-foreground">Belum ada rekomendasi yang diterapkan.</p>
                 )}
               </div>
             </DialogContent>
           </Dialog>
         </div>
       </main>
     </div>
   );
 };
 
 export default SeoAudit;