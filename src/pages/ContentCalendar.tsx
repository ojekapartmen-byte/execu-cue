import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, Plus, Loader2, Sparkles, PenSquare, Search,
  Trash2, CheckCircle2, Clock, FileText, Send, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";

interface CalendarItem {
  id: string;
  title: string;
  target_keyword: string;
  keywords: string[];
  content_brief: string | null;
  status: string;
  scheduled_date: string;
  persona: string | null;
  tone: string | null;
  content_goal: string | null;
  audit_score: number | null;
  article_id: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Clock },
  ready: { label: "Ready", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle2 },
  published: { label: "Published", color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: Send },
  scheduled: { label: "Scheduled", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: CalendarDays },
};

const ContentCalendar = () => {
  useSEO({
    title: "Content Strategy & Calendar - Execu-Cue SEO OS",
    description: "Rencanakan strategi konten 30 hari otomatis dengan AI.",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [persona, setPersona] = useState("Pemilik Bisnis / Pencari Properti");
  const [contentGoal, setContentGoal] = useState("Meningkatkan Trust & Leads");
  const [frequency, setFrequency] = useState("2x/week");
  const [tone, setTone] = useState("professional");

  useEffect(() => {
    const stored = localStorage.getItem("strategyKeywords");
    if (stored) {
      try { setSelectedKeywords(JSON.parse(stored)); } catch (e) {}
    }
    fetchCalendarItems();
  }, []);

  const fetchCalendarItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_calendar")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      if (data) setItems(data as CalendarItem[]);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCalendar = async () => {
    if (selectedKeywords.length === 0) {
      toast({ title: "Keyword Kosong", description: "Pilih keyword di menu Riset dulu!", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    // Kita pastikan mengambil kunci yang pertama
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    try {
      const prompt = `
        Tindak sebagai SEO Content Strategist Senior. 
        Buatkan kalender konten 30 hari berdasarkan keywords ini: ${selectedKeywords.join(", ")}.
        Persona: ${persona}, Goal: ${contentGoal}, Tone: ${tone}, Frekuensi: ${frequency}.

        OUTPUT HARUS JSON ARRAY SAJA (Tanpa teks lain):
        [{
          "title": "Judul Artikel SEO yang menarik",
          "target_keyword": "keyword utama",
          "keywords": ["LSI 1", "LSI 2"],
          "content_brief": "Ringkasan singkat apa yang harus dibahas",
          "scheduled_date": "YYYY-MM-DD",
          "persona": "${persona}",
          "tone": "${tone}",
          "content_goal": "${contentGoal}"
        }]
      `;

      // KEMBALI KE v1beta (Karena Flash 1.5 lebih stabil di sini untuk 2026)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const result = await response.json();

      // Jaring Pengaman Error API
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("AI tidak memberikan respon. Cek kuota atau API Key anda.");
      }
      
      const rawText = result.candidates[0].content.parts[0].text;
      // Membersihkan markdown ```json ... ``` yang sering dikirim AI
      const cleanedText = rawText.replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(cleanedText);

      // Memastikan status adalah 'draft' agar tidak ditolak Supabase
      const itemsToInsert = aiResponse.map((item: any) => ({
        ...item,
        status: 'draft'
      }));

      const { error: insertError } = await supabase.from("content_calendar").insert(itemsToInsert);
      if (insertError) throw insertError;

      toast({ title: "Berhasil!", description: `${aiResponse.length} konten dijadwalkan.` });
      fetchCalendarItems();
    } catch (err: any) {
      console.error("AI Error Detail:", err);
      toast({ 
        title: "Gagal Generate", 
        description: err.message || "Pastikan API Key benar dan internet lancar.", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("content_calendar").delete().eq("id", id);
    if (!error) {
      setItems(items.filter((i) => i.id !== id));
      toast({ title: "Dihapus", description: "Item kalender berhasil dihapus." });
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("content_calendar").update({ status: newStatus }).eq("id", id);
    if (!error) {
      setItems(items.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
    }
  };

  const handleCreateArticle = (item: CalendarItem) => {
    localStorage.setItem("calendarArticle", JSON.stringify({
      calendarId: item.id,
      title: item.title,
      keywords: [item.target_keyword, ...(item.keywords || [])],
      brief: item.content_brief,
      tone: item.tone,
    }));
    navigate("/create-article");
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="w-full border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
                <CalendarDays className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold font-serif">Content Strategy</h1>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="mb-8 border-none shadow-md overflow-hidden">
          <div className="h-1 bg-purple-600" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> AI Strategy Generator</CardTitle>
            <CardDescription>Ubah keyword pilihanmu menjadi rencana konten 30 hari yang terstruktur.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 block">Target Keywords</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedKeywords.length > 0 ? (
                  selectedKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="bg-white border text-slate-700 py-1 px-3 rounded-full">
                      {kw}
                      <button onClick={() => {
                         const updated = selectedKeywords.filter(k => k !== kw);
                         setSelectedKeywords(updated);
                         localStorage.setItem("strategyKeywords", JSON.stringify(updated));
                      }} className="ml-2 hover:text-red-500">×</button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">Belum ada keyword. Cari di menu Riset dulu!</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Persona</label>
                <Input value={persona} onChange={(e) => setPersona(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Goal</label>
                <Input value={contentGoal} onChange={(e) => setContentGoal(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Frekuensi</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="3x/week">3x Seminggu</SelectItem>
                    <SelectItem value="2x/week">2x Seminggu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={generateCalendar} 
              disabled={isGenerating || selectedKeywords.length === 0}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-lg shadow-lg"
            >
              {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 w-5 h-5" />}
              Generate 30-Day Content Strategy
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b mb-4">
            <CardTitle>Content Queue ({items.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchCalendarItems}><RefreshCw className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600" /></div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center text-slate-400 italic">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20" />
                Belum ada jadwal. Gunakan generator di atas!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="w-[120px]">Tanggal</TableHead>
                      <TableHead>Topik & Judul</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const sc = statusConfig[item.status] || statusConfig.draft;
                      const StatusIcon = sc.icon;
                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-slate-500">{item.scheduled_date}</TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">{item.content_brief}</p>
                          </TableCell>
                          <TableCell>
                            <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                              <SelectTrigger className="h-8 text-xs w-[120px]">
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="w-3 h-3" />
                                  {sc.label}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex justify-end gap-2">
                               <Button size="sm" variant="outline" className="h-8 px-2 border-purple-200 text-purple-600" onClick={() => handleCreateArticle(item)}>
                                 Write <PenSquare className="ml-1 w-3 h-3" />
                               </Button>
                               <Button size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => deleteItem(item.id)}>
                                 <Trash2 className="w-3 h-3" />
                               </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ContentCalendar;