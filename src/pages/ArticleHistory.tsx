import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useArticles } from "@/hooks/useArticles";
import { ArrowLeft, FileText, Trash2, Loader2, Clock, ExternalLink, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useSEO, SEO_CONFIG } from "@/hooks/useSEO";

const ArticleHistory = () => {
  // SEO Configuration
  useSEO(SEO_CONFIG.articleHistory);
  const navigate = useNavigate();

  const { articles, isLoading, deleteArticle } = useArticles();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAuditSeo = (article: typeof articles[0]) => {
    navigate('/seo-audit', { state: { article } });
  };

  const extractTitle = (content: string) => {
    const lines = content.split('\n');
    const titleLine = lines.find(line => line.trim().startsWith('#'));
    if (titleLine) {
      return titleLine.replace(/^#+\s*/, '').trim();
    }
    return content.slice(0, 50) + '...';
  };

  const getPreview = (content: string) => {
    const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim());
    return lines.slice(0, 3).join(' ').slice(0, 200) + '...';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8" role="main">
        <nav className="mb-6" aria-label="Breadcrumb">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daily Digest
          </Link>
        </nav>

        <section className="max-w-4xl mx-auto" aria-label="Article history list">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">History Artikel</h1>
            <p className="text-muted-foreground">
              Semua artikel yang telah di-generate tersimpan di sini
            </p>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Memuat artikel...</p>
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Belum ada artikel yang tersimpan</p>
                <Link to="/create-article">
                  <Button>Buat Artikel Baru</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Card key={article.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {extractTitle(article.content)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(article.created_at), "d MMMM yyyy, HH:mm", { locale: idLocale })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {expandedId === article.id ? "Tutup" : "Lihat"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAuditSeo(article)}
                          className="text-primary hover:text-primary"
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Audit SEO
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Artikel?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Artikel ini akan dihapus permanen dan tidak dapat dikembalikan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteArticle(article.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {expandedId === article.id ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                          {article.content}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {getPreview(article.content)}
                      </p>
                    )}
                    
                    {article.source_links && article.source_links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {article.source_links.slice(0, 3).map((link, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Sumber {i + 1}
                          </span>
                        ))}
                        {article.source_links.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{article.source_links.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12" role="contentinfo">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Daily Digest • Executive Intelligence Tool</p>
        </div>
      </footer>
    </div>
  );
};

export default ArticleHistory;
