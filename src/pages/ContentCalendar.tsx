import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, Loader2, Sparkles, PenSquare,
  Trash2, CheckCircle2, Clock, FileText, Send, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function formatYmd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isValidYmd(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T12:00:00`);
  return !Number.isNaN(t);
}

const BATCH_MIN = 7;
const BATCH_MAX = 10;

function parseJsonWithArray(raw: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error("Format JSON tidak valid — respons mungkin terpotong atau bukan JSON.");
    }
    throw e;
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.calendar)) return o.calendar;
    if (Array.isArray(o.entries)) return o.entries;
  }
  throw new Error("Bukan array JSON yang diharapkan.");
}

/** Mengekstrak dan mem-parse array JSON dari teks model; aman terhadap string kosong / SyntaxError. */
function parseGroqJsonArray(content: string): unknown[] {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Teks respons kosong, tidak bisa di-parse.");
  }
  let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!text) {
    throw new Error("Setelah dibersihkan, teks respons masih kosong.");
  }
  try {
    return parseJsonWithArray(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end <= start) {
      throw new Error("Tidak menemukan array JSON [ ... ] dalam respons.");
    }
    return parseJsonWithArray(text.slice(start, end + 1));
  }
}

/** Respons AI: hemat token — hanya 3 field. */
type GroqIdeaItem = {
  title: string;
  target_keyword: string;
  content_brief: string | null;
};

/** Baris insert ke `content_calendar` (Supabase snake_case). */
type ContentCalendarInsertRow = {
  title: string;
  target_keyword: string;
  keywords: string[];
  content_brief: string | null;
  scheduled_date: string;
  persona: string | null;
  tone: string | null;
  content_goal: string | null;
  status: "draft";
};

function parseGroqIdea(entry: unknown, index: number, fallbackKeyword: string): GroqIdeaItem {
  const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
  const title = String(item.title ?? "").trim() || `Idea ${index + 1}`;
  const target_keyword = String(item.target_keyword ?? fallbackKeyword).trim();
  const briefRaw = item.content_brief;
  const content_brief =
    briefRaw != null && String(briefRaw).trim() !== "" ? String(briefRaw).trim() : null;
  return { title, target_keyword, content_brief };
}

/** Gabungkan output AI dengan state UI; tanggal awal = hari ini (DB `scheduled_date` NOT NULL). */
function mergeIdeasToCalendarRows(
  raw: unknown[],
  ctx: { persona: string; tone: string; contentGoal: string; fallbackKeyword: string; scheduledDate: string }
): ContentCalendarInsertRow[] {
  return raw.map((entry, index) => {
    const idea = parseGroqIdea(entry, index, ctx.fallbackKeyword);
    return {
      title: idea.title,
      target_keyword: idea.target_keyword,
      keywords: [],
      content_brief: idea.content_brief,
      scheduled_date: ctx.scheduledDate,
      persona: ctx.persona,
      tone: ctx.tone,
      content_goal: ctx.contentGoal,
      status: "draft",
    };
  });
}

const ContentCalendar = () => {
  useSEO({
    title: "Content Strategy & Calendar - Execu-Cue SEO OS",
    description: "AI hanya menghasilkan ide (judul, keyword, brief); persona, tone, goal, dan tanggal diatur di UI.",
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

    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey?.trim()) {
      toast({
        title: "API Key belum diset",
        description: "Tambahkan VITE_GROQ_API_KEY di file .env Anda.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const initialScheduledDate = formatYmd(new Date());

    const userPrompt = `Return ONLY a JSON array — no markdown, no explanation, no keys outside each object.

Length: ${BATCH_MIN} to ${BATCH_MAX} objects inclusive.

Each object MUST have exactly these 3 keys:
"title" (short SEO title),
"target_keyword" (string),
"content_brief" (one sentence max).

Seed keywords to cover: ${selectedKeywords.join(", ")}`;

    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "Senior SEO Content Strategist. Reply with JSON array only." },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.45,
          max_tokens: 1536,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const msg = result?.error?.message ?? response.statusText ?? "Groq request failed";
        throw new Error(msg);
      }

      const choice = result?.choices?.[0];
      const rawText = choice?.message?.content;

      if (choice?.finish_reason === "length") {
        throw new Error("Respons terpotong oleh batas token. Coba lagi — batch sudah dibatasi 7–10 item.");
      }

      if (rawText == null) {
        throw new Error("Model tidak mengembalikan konten (choices[0].message.content hilang).");
      }
      if (typeof rawText !== "string") {
        throw new Error("Format respons AI tidak didukung (bukan string).");
      }
      const trimmedContent = rawText.trim();
      if (!trimmedContent) {
        throw new Error("Model mengembalikan teks kosong.");
      }

      let parsed: unknown[];
      try {
        parsed = parseGroqJsonArray(trimmedContent);
      } catch (parseErr) {
        const hint =
          trimmedContent.length > 0 && !trimmedContent.trim().endsWith("]")
            ? " Respons tampak tidak lengkap (bukan diakhiri dengan ])."
            : "";
        const base = parseErr instanceof Error ? parseErr.message : "Gagal mem-parse JSON.";
        throw new Error(`${base}${hint}`);
      }

      if (parsed.length === 0) {
        throw new Error("Array JSON kosong.");
      }

      if (parsed.length > BATCH_MAX) {
        toast({
          title: "Catatan",
          description: `AI mengembalikan ${parsed.length} item; hanya ${BATCH_MAX} pertama yang disimpan.`,
        });
      }

      const batch = parsed.slice(0, BATCH_MAX);
      if (batch.length < BATCH_MIN) {
        toast({
          title: "Batch pendek",
          description: `AI mengembalikan ${batch.length} ide (target ${BATCH_MIN}–${BATCH_MAX}). Anda bisa klik generate lagi untuk menambah.`,
        });
      }

      const itemsToInsert = mergeIdeasToCalendarRows(batch, {
        persona,
        tone,
        contentGoal,
        fallbackKeyword: selectedKeywords[0] ?? "",
        scheduledDate: initialScheduledDate,
      });

      // Insert ke content_calendar: merge AI (3 field) + UI (persona, tone, goal) + tanggal awal hari ini + status draft
      const { error: insertError } = await supabase.from("content_calendar").insert(itemsToInsert);
      if (insertError) {
        console.error("Supabase insert content_calendar:", insertError);
        throw new Error(insertError.message || "Gagal menyimpan ke database.");
      }

      toast({ title: "Berhasil!", description: `${itemsToInsert.length} konten disimpan sebagai draft.` });
      fetchCalendarItems();
    } catch (err: unknown) {
      console.error("AI Error Detail:", err);
      const message = err instanceof Error ? err.message : "Pastikan API Key benar dan internet lancar.";
      toast({
        title: "Gagal Generate",
        description: message,
        variant: "destructive",
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
    const { error } = await supabase.from("content_calendar").update({ status: newStatus as any }).eq("id", id);
    if (!error) {
      setItems(items.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
    }
  };

  const updateDate = async (id: string, newDate: string) => {
    if (!newDate || !isValidYmd(newDate)) {
      toast({ title: "Tanggal tidak valid", description: "Gunakan format YYYY-MM-DD.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("content_calendar").update({ scheduled_date: newDate }).eq("id", id);
    if (error) {
      console.error("updateDate:", error);
      toast({ title: "Gagal menyimpan tanggal", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, scheduled_date: newDate } : i)));
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/90">
      {isGenerating && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md transition-opacity duration-300 ease-out"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-2xl shadow-indigo-950/25 ring-1 ring-indigo-950/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-slate-100">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 animate-calendar-load-bar" />
            </div>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/30">
              <Loader2 className="h-7 w-7 animate-spin text-white" style={{ animationDuration: "0.85s" }} />
            </div>
            <p className="text-center font-display text-lg font-semibold tracking-tight text-slate-900">
              Menyusun batch ide konten
            </p>
            <p className="mt-2 text-center text-sm text-slate-500">
              Groq · {GROQ_MODEL} · JSON mini ({BATCH_MIN}–{BATCH_MAX} ide)…
            </p>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-2 w-full rounded-full bg-slate-200/80" />
              <Skeleton className="mx-auto h-2 w-4/5 rounded-full bg-slate-200/60 [animation-delay:150ms]" />
              <Skeleton className="mx-auto h-2 w-3/5 rounded-full bg-slate-200/50 [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 hover:text-indigo-700">
                <ArrowLeft />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/25">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">Content Strategy</h1>
                <p className="text-xs font-medium text-slate-500">Editorial calendar &amp; SEO pipeline</p>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Card className="mb-8 overflow-hidden border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/40 ring-1 ring-slate-950/[0.03] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-slate-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              AI Strategy Generator
            </CardTitle>
            <CardDescription className="text-slate-600">
              AI hanya mengisi judul, keyword utama, dan brief (1 kalimat). Persona, goal, dan tone memakai pilihan di bawah; jadwal tanggal diatur lewat kolom tanggal pada tabel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Target Keywords</label>
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedKeywords.length > 0 ? (
                  selectedKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-2 text-slate-700"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedKeywords.filter((k) => k !== kw);
                          setSelectedKeywords(updated);
                          localStorage.setItem("strategyKeywords", JSON.stringify(updated));
                        }}
                        className="ml-2 rounded-full px-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-600"
                        aria-label={`Hapus ${kw}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm italic text-slate-500">Belum ada keyword. Cari di menu Riset dulu!</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Persona</label>
                <Input value={persona} onChange={(e) => setPersona(e.target.value)} className="border-slate-200 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Goal</label>
                <Input value={contentGoal} onChange={(e) => setContentGoal(e.target.value)} className="border-slate-200 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Frekuensi</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="3x/week">3x Seminggu</SelectItem>
                    <SelectItem value="2x/week">2x Seminggu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
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
              className="h-12 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-base font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" style={{ animationDuration: "0.85s" }} />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              Generate batch ({BATCH_MIN}–{BATCH_MAX} ide)
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 bg-white/95 shadow-xl shadow-slate-200/50 ring-1 ring-slate-950/[0.04] backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="font-display text-lg text-slate-900">Content Queue</CardTitle>
              <CardDescription className="text-slate-500">{items.length} item dalam database</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
              onClick={fetchCalendarItems}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3 py-10">
                <div className="flex justify-center">
                  <Loader2 className="h-9 w-9 animate-spin text-indigo-600" style={{ animationDuration: "0.9s" }} />
                </div>
                <Skeleton className="mx-auto h-3 w-48 rounded-full bg-slate-200" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center italic text-slate-400">
                <CalendarDays className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                Belum ada jadwal. Gunakan generator di atas!
              </div>
            ) : (
              <Card className="overflow-hidden border border-slate-200/80 bg-slate-50/40 shadow-inner shadow-slate-200/30">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                          <TableHead className="w-[160px] min-w-[160px] font-semibold text-slate-700">Tanggal</TableHead>
                          <TableHead className="font-semibold text-slate-700">Topik &amp; Judul</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="text-right font-semibold text-slate-700">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const sc = statusConfig[item.status] || statusConfig.draft;
                          const StatusIcon = sc.icon;
                          return (
                            <TableRow
                              key={item.id}
                              className="border-slate-100 transition-colors hover:bg-white/90"
                            >
                              <TableCell className="align-middle">
                                <Input
                                  type="date"
                                  aria-label={`Jadwal untuk ${item.title}`}
                                  className="h-8 w-[148px] border-slate-200 bg-white font-mono text-xs text-slate-800"
                                  value={item.scheduled_date ? String(item.scheduled_date).slice(0, 10) : ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v) void updateDate(item.id, v);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                <p className="line-clamp-1 text-xs text-slate-500">{item.content_brief}</p>
                              </TableCell>
                              <TableCell>
                                <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                                  <SelectTrigger className="h-8 w-[128px] border-slate-200 text-xs">
                                    <div className="flex items-center gap-1">
                                      <StatusIcon className="h-3 w-3" />
                                      {sc.label}
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(statusConfig).map(([k, v]) => (
                                      <SelectItem key={k} value={k}>
                                        {v.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-indigo-200 px-2 text-indigo-700 hover:bg-indigo-50"
                                    onClick={() => handleCreateArticle(item)}
                                  >
                                    Write <PenSquare className="ml-1 h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => deleteItem(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ContentCalendar;