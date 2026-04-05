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
import { Textarea } from "@/components/ui/textarea";
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
  created_at: string;
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
    title: "Content Calendar - AI Content Strategy",
    description: "AI-powered content calendar. Plan, create, and manage your content strategy with automated keyword-driven scheduling.",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [persona, setPersona] = useState("");
  const [contentGoal, setContentGoal] = useState("");
  const [frequency, setFrequency] = useState("2x/week");
  const [tone, setTone] = useState("professional");

  // Load selected keywords from localStorage (from Keyword Research)
  useEffect(() => {
    const stored = localStorage.getItem("strategyKeywords");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedKeywords(parsed);
      } catch {}
    }
    fetchCalendarItems();
  }, []);

  const fetchCalendarItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("content_calendar")
      .select("*")
      .order("scheduled_date", { ascending: true });
    if (!error && data) {
      setItems(data as CalendarItem[]);
    }
    setIsLoading(false);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !selectedKeywords.includes(newKeyword.trim())) {
      const updated = [...selectedKeywords, newKeyword.trim()];
      setSelectedKeywords(updated);
      localStorage.setItem("strategyKeywords", JSON.stringify(updated));
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    const updated = selectedKeywords.filter((k) => k !== kw);
    setSelectedKeywords(updated);
    localStorage.setItem("strategyKeywords", JSON.stringify(updated));
  };

  const generateCalendar = async () => {
    if (selectedKeywords.length === 0) {
      toast({ title: "Error", description: "Tambahkan minimal 1 keyword terlebih dahulu.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-calendar", {
        body: { keywords: selectedKeywords, persona, contentGoal, frequency, tone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Insert items into Supabase
      const itemsToInsert = data.items.map((item: any) => ({
        ...item,
        status: "draft",
      }));

      const { error: insertError } = await supabase.from("content_calendar").insert(itemsToInsert);
      if (insertError) throw insertError;

      toast({ title: "Calendar generated!", description: `${data.items.length} content items created.` });
      await fetchCalendarItems();
    } catch (err: any) {
      console.error("Calendar generation error:", err);
      toast({ title: "Error", description: err.message || "Gagal generate calendar", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("content_calendar").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    toast({ title: "Deleted", description: "Calendar item deleted." });
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("content_calendar").update({ status }).eq("id", id);
    setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handleCreateArticle = (item: CalendarItem) => {
    // Store data for create-article page
    localStorage.setItem("calendarArticle", JSON.stringify({
      calendarId: item.id,
      title: item.title,
      keywords: [item.target_keyword, ...(item.keywords || [])],
      brief: item.content_brief,
      tone: item.tone,
    }));
    navigate("/create-article");
  };

  const handleRunAudit = (item: CalendarItem) => {
    if (!item.article_id) {
      toast({ title: "Buat artikel dulu", description: "Artikel belum dibuat untuk item ini.", variant: "destructive" });
      return;
    }
    localStorage.setItem("auditCalendarId", item.id);
    navigate(`/seo-audit?articleId=${item.article_id}`);
  };

  const handlePublish = async (item: CalendarItem) => {
    if (item.audit_score && item.audit_score < 80) {
      toast({ title: "Audit score terlalu rendah", description: `Score ${item.audit_score}/100. Perbaiki dulu sebelum publish.`, variant: "destructive" });
      return;
    }
    // Mock publish
    await updateStatus(item.id, "published");
    toast({ title: "Published! 🎉", description: `"${item.title}" berhasil di-publish (mock).` });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-xl font-bold text-foreground block">Content Calendar</span>
                <span className="text-xs text-muted-foreground">AI-Powered Content Strategy</span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Generator Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Generate Content Calendar</CardTitle>
            <CardDescription>Pilih keyword target, tentukan persona & strategi, dan AI akan membuat content calendar 1 bulan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Keywords */}
            <div>
              <label className="text-sm font-medium mb-2 block">Target Keywords</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 text-sm">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Tambah keyword..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button variant="outline" onClick={addKeyword}><Plus className="w-4 h-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tip: Gunakan "Add to Strategy" di halaman Riset Keyword untuk menambah otomatis.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Target Persona</label>
                <Input value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="e.g. Pemilik bisnis UMKM" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Content Goal</label>
                <Input value={contentGoal} onChange={(e) => setContentGoal(e.target.value)} placeholder="e.g. Lead generation" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Frequency</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="3x/week">3x/week</SelectItem>
                    <SelectItem value="2x/week">2x/week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tone of Voice</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={generateCalendar} disabled={isGenerating || selectedKeywords.length === 0} className="w-full sm:w-auto">
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Calendar...</> : <><Sparkles className="w-4 h-4" /> Generate 1-Month Calendar</>}
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Content Calendar ({items.length} items)</CardTitle>
                <CardDescription>Kelola, buat artikel, dan audit konten Anda.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchCalendarItems}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada calendar items. Generate calendar di atas atau tambah dari Riset Keyword.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Tanggal</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead className="w-[130px]">Keyword</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px]">Score</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const sc = statusConfig[item.status] || statusConfig.draft;
                      const StatusIcon = sc.icon;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-mono">{item.scheduled_date}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm leading-tight">{item.title}</p>
                            {item.content_brief && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content_brief}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.target_keyword}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                              <SelectTrigger className="h-7 text-xs w-[110px]">
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="w-3 h-3" />
                                  <span>{sc.label}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([key, val]) => (
                                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.audit_score !== null ? (
                              <Badge variant="outline" className={`text-xs ${item.audit_score >= 80 ? "text-green-700" : item.audit_score >= 60 ? "text-yellow-700" : "text-red-700"}`}>
                                {item.audit_score}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCreateArticle(item)}>
                                <PenSquare className="w-3 h-3" /> Create
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRunAudit(item)} disabled={!item.article_id}>
                                <Search className="w-3 h-3" /> Audit
                              </Button>
                              {item.audit_score !== null && item.audit_score >= 80 && item.status !== "published" && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700" onClick={() => handlePublish(item)}>
                                  <Send className="w-3 h-3" /> Publish
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteItem(item.id)}>
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
