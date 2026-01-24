import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useArticles } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Sparkles, FileText, ArrowLeft, ImagePlus, X, Download, Save, History, Search, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";

type ArticleCategory = "mentor" | "investor" | "leader";

interface SourceLink {
  id: string;
  url: string;
}

interface SourceImage {
  id: string;
  file: File;
  preview: string;
  base64?: string;
}

interface SEOSettings {
  keywords: string[];
  writingStyle: string[];
  tone: string[];
  audience: string;
}

const CreateArticle = () => {
  const { toast } = useToast();
  const { saveArticle } = useArticles();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<ArticleCategory | "">("");
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([
    { id: crypto.randomUUID(), url: "" }
  ]);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [generatorUsed, setGeneratorUsed] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SEO Settings for api.co.id
  const [useApiCoId, setUseApiCoId] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [writingStyle, setWritingStyle] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [audience, setAudience] = useState("");

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

  // Image handling functions
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: SourceImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "File tidak valid",
          description: `${file.name} bukan file gambar`,
          variant: "destructive"
        });
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File terlalu besar",
          description: `${file.name} melebihi 5MB`,
          variant: "destructive"
        });
        continue;
      }

      // Create preview and convert to base64
      const preview = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      
      newImages.push({
        id: crypto.randomUUID(),
        file,
        preview,
        base64
      });
    }

    setSourceImages(prev => [...prev, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeImage = (id: string) => {
    setSourceImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
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
    if (validLinks.length === 0 && sourceImages.length === 0) {
      toast({
        title: "Error",
        description: "Silakan masukkan minimal satu link sumber atau upload gambar",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedArticle(null);
    setGeneratorUsed(null);

    try {
      // Prepare image data for API
      const imageData = sourceImages.map(img => ({
        name: img.file.name,
        base64: img.base64
      }));

      // Parse keywords from comma-separated input
      const keywords = keywordsInput
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Build SEO settings
      const seoSettings: SEOSettings = {
        keywords,
        writingStyle: writingStyle ? [writingStyle] : [],
        tone: tone ? [tone] : [],
        audience
      };

      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: {
          topic,
          category,
          sourceLinks: validLinks.map(l => l.url),
          sourceImages: imageData,
          useApiCoId,
          seoSettings
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedArticle(data.article);
      setGeneratorUsed(data.generator);
      setIsSaved(false); // Reset saved state for new article
      
      let toastMessage = "Artikel berhasil di-generate";
      if (data.warning) {
        toastMessage += ` (${data.warning})`;
      }
      
      toast({
        title: "Berhasil!",
        description: toastMessage
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

  const handleSaveArticle = async () => {
    if (!generatedArticle || isSaved) return;

    setIsSaving(true);
    
    // Extract title from content
    const lines = generatedArticle.split('\n');
    const titleLine = lines.find(line => line.trim().startsWith('#'));
    const title = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : topic.slice(0, 100);

    const validLinks = sourceLinks.filter(link => link.url.trim()).map(l => l.url);
    
    const result = await saveArticle({
      title,
      content: generatedArticle,
      topic,
      source_links: validLinks,
      source_images: sourceImages.map(img => img.file.name),
    });

    setIsSaving(false);
    
    if (result) {
      setIsSaved(true);
    }
  };

  const exportToDocx = async () => {
    if (!generatedArticle) return;

    try {
      const lines = generatedArticle.split('\n').filter(line => line.trim());
      const children: Paragraph[] = [];

      lines.forEach((line, index) => {
        // Check if it's a title (first line or starts with #)
        if (index === 0 || line.startsWith('#')) {
          const cleanLine = line.replace(/^#+\s*/, '');
          children.push(
            new Paragraph({
              text: cleanLine,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            })
          );
        } else if (line.startsWith('##')) {
          const cleanLine = line.replace(/^#+\s*/, '');
          children.push(
            new Paragraph({
              text: cleanLine,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 150 }
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 24 // 12pt
                })
              ],
              spacing: { after: 200 }
            })
          );
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children
        }]
      });

      const blob = await Packer.toBlob(doc);
      const filename = `artikel-${topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
      saveAs(blob, filename);

      toast({
        title: "Berhasil!",
        description: "Artikel berhasil di-export ke DOCX"
      });
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      toast({
        title: "Gagal Export",
        description: "Terjadi kesalahan saat export ke DOCX",
        variant: "destructive"
      });
    }
  };

  const exportToPdf = async () => {
    if (!generatedArticle) return;

    try {
      // Create a temporary element for PDF generation
      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.maxWidth = '800px';
      element.style.lineHeight = '1.6';

      const lines = generatedArticle.split('\n');
      lines.forEach((line, index) => {
        if (line.trim()) {
          const p = document.createElement('p');
          if (index === 0 || line.startsWith('#')) {
            p.style.fontSize = '24px';
            p.style.fontWeight = 'bold';
            p.style.marginBottom = '16px';
            p.textContent = line.replace(/^#+\s*/, '');
          } else if (line.startsWith('##')) {
            p.style.fontSize = '18px';
            p.style.fontWeight = 'bold';
            p.style.marginBottom = '12px';
            p.textContent = line.replace(/^#+\s*/, '');
          } else {
            p.style.fontSize = '12px';
            p.style.marginBottom = '10px';
            p.textContent = line;
          }
          element.appendChild(p);
        }
      });

      const opt = {
        margin: 1,
        filename: `artikel-${topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "Berhasil!",
        description: "Artikel berhasil di-export ke PDF"
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Gagal Export",
        description: "Terjadi kesalahan saat export ke PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daily Digest
            </Link>
            <Link to="/article-history">
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                History Artikel
              </Button>
            </Link>
          </div>
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
                {/* Generator Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${useApiCoId ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                      {useApiCoId ? <Search className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {useApiCoId ? 'api.co.id SEO Generator' : 'Lovable AI Generator'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {useApiCoId 
                          ? 'Optimasi SEO untuk search engine Indonesia' 
                          : 'AI cepat dengan kemampuan multimodal'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={useApiCoId}
                    onCheckedChange={setUseApiCoId}
                  />
                </div>

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
                          <Badge variant="secondary" className="bg-primary/20 text-primary">Mentor</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="investor">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-accent text-accent-foreground">Investor</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="leader">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-secondary text-secondary-foreground">Leader</Badge>
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

                {/* SEO Settings - Only show when api.co.id is selected */}
                {useApiCoId && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-foreground">
                      <Search className="h-4 w-4" />
                      <span className="font-medium text-sm">SEO Settings</span>
                    </div>
                    
                    {/* Keywords */}
                    <div className="space-y-2">
                      <Label htmlFor="keywords" className="text-sm">Keywords (pisahkan dengan koma)</Label>
                      <Input
                        id="keywords"
                        placeholder="leadership, bisnis, motivasi"
                        value={keywordsInput}
                        onChange={(e) => setKeywordsInput(e.target.value)}
                      />
                    </div>

                    {/* Writing Style */}
                    <div className="space-y-2">
                      <Label className="text-sm">Gaya Penulisan</Label>
                      <Select value={writingStyle} onValueChange={setWritingStyle}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih gaya penulisan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="journalistic">Jurnalistik</SelectItem>
                          <SelectItem value="blog-friendly">Blog Friendly</SelectItem>
                          <SelectItem value="academic">Akademis</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tone */}
                    <div className="space-y-2">
                      <Label className="text-sm">Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="inspirational">Inspirational</SelectItem>
                          <SelectItem value="analytical">Analytical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-2">
                      <Label htmlFor="audience" className="text-sm">Target Audience (opsional)</Label>
                      <Input
                        id="audience"
                        placeholder="Contoh: Pengusaha muda Indonesia"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                      />
                    </div>
                  </div>
                )}

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

                {/* Image Upload */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upload Gambar Sumber</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      <ImagePlus className="h-3 w-3 mr-1" />
                      Upload Gambar
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {sourceImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {sourceImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.preview}
                            alt={image.file.name}
                            className="w-full h-20 object-cover rounded-md border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <p className="text-[10px] text-muted-foreground truncate mt-1">
                            {image.file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Upload gambar (screenshot, infografis, dll) sebagai bahan sumber. Max 5MB per gambar.
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
                      {useApiCoId ? <Search className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Generate Artikel {useApiCoId ? '(SEO)' : ''}
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
                    {generatorUsed && (
                      <Badge variant="outline" className="ml-2 text-xs font-normal">
                        {generatorUsed}
                      </Badge>
                    )}
                  </span>
                  {generatedArticle && (
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant={isSaved ? "secondary" : "default"} 
                        size="sm" 
                        onClick={handleSaveArticle}
                        disabled={isSaving || isSaved}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        {isSaved ? "Tersimpan" : "Simpan"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportToDocx}>
                        <Download className="h-3 w-3 mr-1" />
                        DOCX
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportToPdf}>
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    </div>
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
                    <p className="text-xs mt-1">
                      {useApiCoId 
                        ? 'Menggunakan api.co.id SEO Generator' 
                        : 'Menggunakan Lovable AI Generator'}
                    </p>
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
