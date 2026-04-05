import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useArticles } from "@/hooks/useArticles";
import { useSEO, SEO_CONFIG } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Sparkles, FileText, ArrowLeft, ImagePlus, X, Download, Save, History, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Link } from "react-router-dom";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";

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
  keywords: string;
  writingStyle: string;
  tone: string;
  language: string;
}

const WRITING_STYLES = [
  { value: 'journalistic', label: 'Journalistic', desc: 'Gaya berita profesional' },
  { value: 'blog-friendly', label: 'Blog-friendly', desc: 'Santai dan mudah dibaca' },
  { value: 'academic', label: 'Academic', desc: 'Formal dan berbasis riset' },
  { value: 'storytelling', label: 'Storytelling', desc: 'Naratif dan engaging' },
];

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Formal dan kredibel' },
  { value: 'friendly', label: 'Friendly', desc: 'Ramah dan approachable' },
  { value: 'formal', label: 'Formal', desc: 'Sangat resmi dan baku' },
  { value: 'inspirational', label: 'Inspirational', desc: 'Memotivasi dan menginspirasi' },
];

const CreateArticle = () => {
  useSEO(SEO_CONFIG.createArticle);
  const { toast } = useToast();
  const { articles, isLoading: isLoadingArticles, saveArticle, deleteArticle } = useArticles();
  
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [dbCategories, setDbCategories] = useState<any[]>([]); // Menyimpan kategori dari database
  
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([
    { id: crypto.randomUUID(), url: "" }
  ]);
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    keywords: '',
    writingStyle: 'journalistic',
    tone: 'professional',
    language: 'id'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [generatorUsed, setGeneratorUsed] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MENGAMBIL KATEGORI DARI DATABASE
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('article_categories').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        setDbCategories(data);
      }
    };
    fetchCategories();
  }, []);

  // MENANGKAP DATA DARI KALENDER (Sudah kamu terapkan sebelumnya)
  useEffect(() => {
    const storedData = localStorage.getItem("calendarArticle");
    if (storedData) {
      try {
        const articleData = JSON.parse(storedData);
        let combinedTopic = "";
        if (articleData.title) combinedTopic += `Judul: ${articleData.title}`;
        if (articleData.brief) combinedTopic += `\n\nBrief: ${articleData.brief}`;
        if (combinedTopic) setTopic(combinedTopic.trim());

        setSeoSettings(prev => ({
          ...prev,
          keywords: articleData.keywords ? articleData.keywords.join(', ') : prev.keywords,
          tone: articleData.tone || prev.tone
        }));

        localStorage.removeItem("calendarArticle");
        toast({
          title: "Data Ditemukan",
          description: "Form telah diisi otomatis dari kalender konten.",
        });
      } catch (error) {
        console.error("Gagal memproses data dari kalender:", error);
      }
    }
  }, [toast]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: SourceImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast({ title: "File tidak valid", description: `${file.name} bukan file gambar`, variant: "destructive" });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File terlalu besar", description: `${file.name} melebihi 5MB`, variant: "destructive" });
        continue;
      }

      const preview = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      
      newImages.push({ id: crypto.randomUUID(), file, preview, base64 });
    }

    setSourceImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      if (image) URL.revokeObjectURL(image.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Silakan masukkan ide atau topik artikel", variant: "destructive" });
      return;
    }

    if (!category) {
      toast({ title: "Error", description: "Silakan pilih kategori artikel", variant: "destructive" });
      return;
    }

    const validLinks = sourceLinks.filter(link => link.url.trim());
    if (validLinks.length === 0 && sourceImages.length === 0) {
      toast({ title: "Error", description: "Silakan masukkan minimal satu link sumber atau upload gambar", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedArticle(null);
    setGeneratorUsed(null);

    try {
      const imageData = sourceImages.map(img => ({
        name: img.file.name,
        base64: img.base64
      }));

      // CARI PROMPT DARI KATEGORI YANG DIPILIH
      const selectedCategoryObj = dbCategories.find(c => c.value === category);
      const categoryPrompt = selectedCategoryObj ? selectedCategoryObj.description : "";

      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: {
          topic,
          category,
          categoryPrompt, // MENGIRIMKAN PROMPT AI KE BACKEND
          sourceLinks: validLinks.map(l => l.url),
          sourceImages: imageData,
          seoSettings
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedArticle(data.article);
      setGeneratorUsed(data.generator);
      setIsSaved(false);
      
      let toastMessage = "Artikel berhasil di-generate";
      if (data.warning) toastMessage += ` (${data.warning})`;
      
      toast({ title: "Berhasil!", description: toastMessage });
    } catch (error) {
      console.error('Error generating article:', error);
      toast({ title: "Gagal Generate Artikel", description: error instanceof Error ? error.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedArticle) {
      navigator.clipboard.writeText(generatedArticle);
      toast({ title: "Tersalin!", description: "Artikel berhasil disalin ke clipboard" });
    }
  };

  const handleSaveArticle = async () => {
    if (!generatedArticle || isSaved) return;
    setIsSaving(true);
    
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
    if (result) setIsSaved(true);
  };

  // ... (Fungsi export DOCX dan PDF tetap sama)
  const exportToDocx = async () => { /* Logika DOCX tetap utuh (saya singkat di teks ini agar rapi, tapi silakan pakai yg ada di kodemu atau abaikan jika sudah pakai export pdf/docx yg lama)*/ 
    if (!generatedArticle) return;
    try {
      const lines = generatedArticle.split('\n').filter(line => line.trim());
      const children: Paragraph[] = [];
      lines.forEach((line, index) => {
        if (index === 0 || line.startsWith('#')) {
          children.push(new Paragraph({ text: line.replace(/^#+\s*/, ''), heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
        } else if (line.startsWith('##')) {
          children.push(new Paragraph({ text: line.replace(/^#+\s*/, ''), heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }));
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })], spacing: { after: 200 } }));
        }
      });
      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `artikel-${topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.docx`);
      toast({ title: "Berhasil!", description: "Artikel berhasil di-export ke DOCX" });
    } catch (error) {
      toast({ title: "Gagal Export", description: "Terjadi kesalahan saat export", variant: "destructive" });
    }
  };

  const exportToPdf = async () => {
    if (!generatedArticle) return;
    try {
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
            p.style.fontSize = '24px'; p.style.fontWeight = 'bold'; p.style.marginBottom = '16px';
            p.textContent = line.replace(/^#+\s*/, '');
          } else if (line.startsWith('##')) {
            p.style.fontSize = '18px'; p.style.fontWeight = 'bold'; p.style.marginBottom = '12px';
            p.textContent = line.replace(/^#+\s*/, '');
          } else {
            p.style.fontSize = '12px'; p.style.marginBottom = '10px'; p.textContent = line;
          }
          element.appendChild(p);
        }
      });
      const opt = { margin: 1, filename: `artikel-${topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`, image: { type: 'jpeg' as const, quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const } };
      await html2pdf().set(opt).from(element).save();
      toast({ title: "Berhasil!", description: "Artikel berhasil di-export ke PDF" });
    } catch (error) {
      toast({ title: "Gagal Export", description: "Terjadi kesalahan saat export", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <nav className="mb-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Daily Digest
            </Link>
            <Link to="/article-history">
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" /> History Artikel
              </Button>
            </Link>
          </div>
        </nav>

        <article className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Article</h1>
            <p className="text-muted-foreground">Generate artikel profesional dengan sudut pandang dinamis</p>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Input Artikel</CardTitle>
                <CardDescription>Masukkan detail untuk generate artikel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="space-y-2">
                  <Label htmlFor="topic">Ide / Topik Artikel</Label>
                  <Textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="min-h-[100px]" />
                </div>

                {/* DROPDOWN KATEGORI DINAMIS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Kategori (Instruksi AI)</Label>
                    <Link to="/categories">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
                        Kelola Kategori
                      </Button>
                    </Link>
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori artikel" /></SelectTrigger>
                    <SelectContent>
                      {dbCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cat.color || "bg-primary/20 text-primary"}>{cat.name}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {category && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {dbCategories.find(c => c.value === category)?.description}
                    </p>
                  )}
                </div>

                {/* SEO Settings */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label className="font-medium">SEO Settings</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Language</Label>
                    <Select value={seoSettings.language} onValueChange={(val) => setSeoSettings(prev => ({ ...prev, language: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id"><span>🇮🇩 Bahasa Indonesia</span></SelectItem>
                        <SelectItem value="en"><span>🇺🇸 English</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keywords" className="text-sm">Keywords</Label>
                    <Input id="keywords" value={seoSettings.keywords} onChange={(e) => setSeoSettings(prev => ({ ...prev, keywords: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Writing Style</Label>
                    <Select value={seoSettings.writingStyle} onValueChange={(val) => setSeoSettings(prev => ({ ...prev, writingStyle: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WRITING_STYLES.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            <div className="flex flex-col"><span>{style.label}</span><span className="text-xs text-muted-foreground">{style.desc}</span></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Tone</Label>
                    <Select value={seoSettings.tone} onValueChange={(val) => setSeoSettings(prev => ({ ...prev, tone: val }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TONES.map(tone => (
                          <SelectItem key={tone.value} value={tone.value}>
                            <div className="flex flex-col"><span>{tone.label}</span><span className="text-xs text-muted-foreground">{tone.desc}</span></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Link Sumber</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSourceLink} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Tambah Link</Button>
                  </div>
                  <div className="space-y-2">
                    {sourceLinks.map((link, index) => (
                      <div key={link.id} className="flex gap-2">
                        <Input placeholder={`https://example.com/article-${index + 1}`} value={link.url} onChange={(e) => updateSourceLink(link.id, e.target.value)} className="flex-1" />
                        {sourceLinks.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSourceLink(link.id)} className="h-10 w-10 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Upload Gambar Sumber</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs"><ImagePlus className="h-3 w-3 mr-1" /> Upload Gambar</Button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </div>
                  {sourceImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {sourceImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img src={image.preview} alt={image.file.name} className="w-full h-20 object-cover rounded-md border border-border" />
                          <button type="button" onClick={() => removeImage(image.id)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Artikel...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Artikel</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:row-span-1">
              {/* Bagian Hasil Artikel dan Preview tetap sama */}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Hasil Artikel</span>
                  {generatedArticle && (
                    <div className="flex gap-2 flex-wrap">
                      <Button variant={isSaved ? "secondary" : "default"} size="sm" onClick={handleSaveArticle} disabled={isSaving || isSaved}>
                        {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} {isSaved ? "Tersimpan" : "Simpan"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>Copy</Button>
                      <Button variant="outline" size="sm" onClick={exportToDocx}><Download className="h-3 w-3 mr-1" /> DOCX</Button>
                      <Button variant="outline" size="sm" onClick={exportToPdf}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Sedang menulis artikel berdasarkan kategori...</p>
                  </div>
                ) : generatedArticle ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{generatedArticle}</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>Belum ada artikel yang di-generate</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </article>
      </main>
    </div>
  );
};

export default CreateArticle;