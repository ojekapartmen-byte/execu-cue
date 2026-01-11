import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Sparkles, FileText, ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type ArticleCategory = "mentor" | "investor" | "leader";

interface SourceLink {
  id: string;
  url: string;
}

const CreateArticle = () => {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<ArticleCategory | "">("");
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([
    { id: crypto.randomUUID(), url: "" }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<string | null>(null);

  const addSourceLink = () => {
    setSourceLinks([...sourceLinks, { id: crypto.randomUUID(), url: "" }]);
  };

  const removeSourceLink = (id: string) => {
    if (sourceLinks.length > 1) {
      setSourceLinks(sourceLinks.filter(link => link.id !== id));
    }
  };

  const updateSourceLink = (id: string, url: string) => {
    setSourceLinks(sourceLinks.map(link => 
      link.id === id ? { ...link, url } : link
    ));
  };

  const getCategoryLabel = (cat: ArticleCategory) => {
    const labels = {
      mentor: "Mentor",
      investor: "Investor", 
      leader: "Leader"
    };
    return labels[cat];
  };

  const getCategoryDescription = (cat: ArticleCategory) => {
    const descriptions = {
      mentor: "Sudut pandang seorang pembimbing yang berbagi pengalaman dan pembelajaran hidup",
      investor: "Sudut pandang seorang investor yang melihat peluang dan strategi bisnis",
      leader: "Sudut pandang seorang pemimpin yang menginspirasi dan memotivasi"
    };
    return descriptions[cat];
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Silakan masukkan ide atau topik artikel",
        variant: "destructive"
      });
      return;
    }

    if (!category) {
      toast({
        title: "Error",
        description: "Silakan pilih kategori artikel",
        variant: "destructive"
      });
      return;
    }

    const validLinks = sourceLinks.filter(link => link.url.trim());
    if (validLinks.length === 0) {
      toast({
        title: "Error",
        description: "Silakan masukkan minimal satu link sumber",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedArticle(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: {
          topic,
          category,
          sourceLinks: validLinks.map(l => l.url)
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedArticle(data.article);
      toast({
        title: "Berhasil!",
        description: "Artikel berhasil di-generate"
      });
    } catch (error) {
      console.error('Error generating article:', error);
      toast({
        title: "Gagal Generate Artikel",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat generate artikel",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedArticle) {
      navigator.clipboard.writeText(generatedArticle);
      toast({
        title: "Tersalin!",
        description: "Artikel berhasil disalin ke clipboard"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daily Digest
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Article</h1>
            <p className="text-muted-foreground">
              Generate artikel profesional dengan sudut pandang orang ketiga
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Input Artikel
                </CardTitle>
                <CardDescription>
                  Masukkan detail untuk generate artikel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Topic Input */}
                <div className="space-y-2">
                  <Label htmlFor="topic">Ide / Topik Artikel</Label>
                  <Textarea
                    id="topic"
                    placeholder="Contoh: Titik terendah dalam hidup bukan akhir, justru awal kebangkitan baru"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                {/* Category Select */}
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={category} onValueChange={(val) => setCategory(val as ArticleCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori artikel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentor">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">Mentor</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="investor">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-700">Investor</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="leader">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">Leader</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {category && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getCategoryDescription(category)}
                    </p>
                  )}
                </div>

                {/* Source Links */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Link Sumber</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSourceLink}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Tambah Link
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {sourceLinks.map((link, index) => (
                      <div key={link.id} className="flex gap-2">
                        <Input
                          placeholder={`https://example.com/article-${index + 1}`}
                          value={link.url}
                          onChange={(e) => updateSourceLink(link.id, e.target.value)}
                          className="flex-1"
                        />
                        {sourceLinks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSourceLink(link.id)}
                            className="h-10 w-10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Masukkan link artikel sumber untuk dijadikan referensi penulisan
                  </p>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Artikel...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Artikel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Article Preview */}
            <Card className="lg:row-span-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Hasil Artikel
                  </span>
                  {generatedArticle && (
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      Copy
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Artikel yang di-generate akan muncul di sini
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Sedang scraping sumber dan menulis artikel...</p>
                    <p className="text-xs mt-1">Proses ini membutuhkan waktu beberapa saat</p>
                  </div>
                ) : generatedArticle ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {generatedArticle}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>Belum ada artikel yang di-generate</p>
                    <p className="text-xs mt-1">Isi form di sebelah kiri untuk memulai</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Daily Digest • Executive Intelligence Tool</p>
        </div>
      </footer>
    </div>
  );
};

export default CreateArticle;
