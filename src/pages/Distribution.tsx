import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useArticles } from "@/hooks/useArticles";
import { Loader2, Share2, Globe, CheckCircle, ExternalLink, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export default function Distribution() {
  const { toast } = useToast();
  const { articles, isLoading } = useArticles();
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedLinks, setPublishedLinks] = useState<Record<string, string>>({});

  const extractTitle = (content: string) => {
    const lines = content.split('\n');
    const titleLine = lines.find(line => line.trim().startsWith('#'));
    return titleLine ? titleLine.replace(/^#+\s*/, '').trim() : "Judul Artikel";
  };

  const extractSummary = (content: string) => {
    const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '');
    return lines.slice(0, 2).join(' ').slice(0, 150) + '...';
  };

  const handlePublishToWP = async (article: any) => {
    if (publishingId) return;
    setPublishingId(article.id);
    
    try {
      // Alamat Webhook Make.com kamu
      const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/ojvye7z3j7zo6pfh4xnodczj3vbr2uey"; 
  
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: extractTitle(article.content),
          content: article.content,
          id: article.id
        }),
      });
  
      if (!response.ok) throw new Error("Gagal mengirim data ke Make.com");
  
      toast({
        title: "Berhasil!",
        description: "Data sedang diproses oleh Make.com ke WordPress Deanna Day Spa.",
      });
  
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleCopyForSocial = (platform: string, article: any) => {
    const title = extractTitle(article.content);
    const text = `📝 ${title}\n\nBaca selengkapnya di Deanna Day Spa!`;
    navigator.clipboard.writeText(text);
    setCopiedId(`${article.id}-${platform}`);
    toast({ title: "Tersalin!", description: `Draft untuk ${platform} sudah di clipboard.` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Share2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Content Distribution</h1>
              <p className="text-muted-foreground mt-1">Kirim artikel ke WordPress & Sosial Media.</p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles?.map((article) => (
              <Card key={article.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(article.created_at), "d MMM yyyy", { locale: idLocale })}
                    </div>
                  </div>
                  <CardTitle className="text-lg line-clamp-2 leading-tight">{extractTitle(article.content)}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 text-sm text-muted-foreground">
                  <p className="line-clamp-3 leading-relaxed">{extractSummary(article.content)}</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-4 border-t bg-muted/20">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <Button variant="outline" size="sm" onClick={() => handleCopyForSocial('LinkedIn', article)} className="flex-col h-auto py-2">
                      {copiedId === `${article.id}-LinkedIn` ? <CheckCircle className="h-4 w-4 text-green-500" /> : <LinkedinIcon className="h-4 w-4 text-[#0A66C2]" />}
                      <span className="text-[10px] mt-1">LinkedIn</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCopyForSocial('Twitter', article)} className="flex-col h-auto py-2">
                      <TwitterIcon className="h-4 w-4 text-[#1DA1F2]" />
                      <span className="text-[10px] mt-1">Twitter</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCopyForSocial('Email', article)} className="flex-col h-auto py-2">
                      <Mail className="h-4 w-4 text-orange-500" />
                      <span className="text-[10px] mt-1">Email</span>
                    </Button>
                  </div>

                  {publishedLinks[article.id] ? (
                    <Button variant="secondary" className="w-full bg-green-50 text-green-700 border-green-200" onClick={() => window.open(publishedLinks[article.id], '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Buka Draft WP
                    </Button>
                  ) : (
                    <Button variant="default" className="w-full" onClick={() => handlePublishToWP(article)} disabled={publishingId === article.id}>
                      {publishingId === article.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                      Publish ke WordPress
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Ikon sederhana
const LinkedinIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
const TwitterIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5 1.3 13.4 1 11c1 .1 2 .1 3-.2C1.8 10.1.5 7.6 1 5c.9 1.4 2.1 2.2 4 2.3-1.4-5.7 5.6-8.7 9.4-5.2 1.4-.3 2.8-.9 4-1.7-.5 1.5-1.5 2.6-3 3.2 1.3-.1 2.6-.4 4-.8-.8 1.1-1.7 2-3 2.8z"/></svg>
const Mail = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>