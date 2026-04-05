import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Download, Loader2, TrendingUp, Globe, BarChart3,
  Layers, ExternalLink, Plus, Users, HelpCircle, CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";

interface KeywordSuggestion {
  keyword: string;
  intent: string;
  competition: string;
  potentialScore: number;
}

interface ClusterKeyword {
  keyword: string;
  potentialScore: number;
}

interface Cluster {
  name: string;
  keywords: ClusterKeyword[];
}

interface Competitor {
  title: string;
  url: string;
  strengths?: string;
  weaknesses?: string;
}

interface KeywordResult {
  keyword: string;
  language: string;
  googleSuggestions: string[];
  overview: {
    searchVolume: string;
    competition: string;
    intent: string;
    potentialScore: number;
    summary: string;
  };
  keywordSuggestions: KeywordSuggestion[];
  clusters: Cluster[];
  serpAnalysis: {
    competitors: Competitor[];
    contentGaps: string[];
    opportunities: string[];
  };
}

// Mock data types
interface TrendItem { keyword: string; interest: number; rising: boolean; }
interface PAAItem { question: string; intent: string; }

const competitionColor = (level: string) => {
  if (level === "rendah" || level === "low") return "bg-green-500/10 text-green-700 border-green-200";
  if (level === "sedang" || level === "medium") return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
  return "bg-red-500/10 text-red-700 border-red-200";
};

const intentColor = (intent: string) => {
  const map: Record<string, string> = {
    informational: "bg-blue-500/10 text-blue-700 border-blue-200",
    transactional: "bg-purple-500/10 text-purple-700 border-purple-200",
    navigational: "bg-accent/10 text-accent border-accent/30",
    commercial: "bg-orange-500/10 text-orange-700 border-orange-200",
  };
  return map[intent] || "bg-muted text-muted-foreground";
};

const KeywordResearch = () => {
  useSEO({
    title: "Riset Keyword Potential - AI Keyword Research",
    description: "Riset keyword potential dengan AI. Analisis search intent, kompetisi, dan peluang konten.",
    keywords: "keyword research, riset keyword, SEO keyword, long-tail keyword",
  });

  const navigate = useNavigate();
  const [researchTab, setResearchTab] = useState("targeted");
  const [keyword, setKeyword] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [language, setLanguage] = useState("id");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [selectedForStrategy, setSelectedForStrategy] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Mock states
  const [trendResults, setTrendResults] = useState<TrendItem[]>([]);
  const [paaResults, setPaaResults] = useState<PAAItem[]>([]);
  const [competitorKeywords, setCompetitorKeywords] = useState<string[]>([]);
  const [isMockLoading, setIsMockLoading] = useState(false);

  // Load existing strategy keywords
  useState(() => {
    const stored = localStorage.getItem("strategyKeywords");
    if (stored) {
      try { setSelectedForStrategy(new Set(JSON.parse(stored))); } catch {}
    }
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-research", {
        body: { keyword: keyword.trim(), language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as KeywordResult);
      toast({ title: "Riset selesai!", description: `Ditemukan ${data.keywordSuggestions?.length || 0} keyword suggestions.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal melakukan riset keyword", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompetitorResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorUrl.trim()) return;
    setIsMockLoading(true);
    // Mock competitor keyword extraction
    setTimeout(() => {
      setCompetitorKeywords([
        "digital marketing strategy",
        "content marketing tips",
        "SEO best practices 2025",
        "social media marketing",
        "email marketing automation",
        "brand awareness campaign",
        "conversion rate optimization",
        "marketing analytics tools",
      ]);
      setIsMockLoading(false);
      toast({ title: "Competitor Analysis", description: "Keywords extracted from competitor URL (mock)." });
    }, 2000);
  };

  const handleTrendsSearch = async () => {
    if (!keyword.trim()) return;
    setIsMockLoading(true);
    setTimeout(() => {
      setTrendResults([
        { keyword: `${keyword} 2025`, interest: 92, rising: true },
        { keyword: `${keyword} untuk pemula`, interest: 78, rising: true },
        { keyword: `cara ${keyword}`, interest: 85, rising: false },
        { keyword: `${keyword} terbaik`, interest: 70, rising: true },
        { keyword: `tips ${keyword}`, interest: 65, rising: false },
        { keyword: `${keyword} gratis`, interest: 88, rising: true },
      ]);
      setIsMockLoading(false);
      toast({ title: "Trends loaded", description: "Google Trends data fetched (mock)." });
    }, 1500);
  };

  const handlePAASearch = async () => {
    if (!keyword.trim()) return;
    setIsMockLoading(true);
    setTimeout(() => {
      setPaaResults([
        { question: `Apa itu ${keyword}?`, intent: "informational" },
        { question: `Bagaimana cara memulai ${keyword}?`, intent: "informational" },
        { question: `Berapa biaya ${keyword}?`, intent: "transactional" },
        { question: `${keyword} mana yang terbaik?`, intent: "commercial" },
        { question: `Apakah ${keyword} masih relevan di 2025?`, intent: "informational" },
        { question: `Di mana belajar ${keyword}?`, intent: "navigational" },
      ]);
      setIsMockLoading(false);
      toast({ title: "PAA loaded", description: "People Also Ask data generated." });
    }, 1500);
  };

  const toggleStrategy = (kw: string) => {
    const updated = new Set(selectedForStrategy);
    if (updated.has(kw)) updated.delete(kw); else updated.add(kw);
    setSelectedForStrategy(updated);
    localStorage.setItem("strategyKeywords", JSON.stringify([...updated]));
  };

  const goToCalendar = () => {
    if (selectedForStrategy.size === 0) {
      toast({ title: "Pilih keyword dulu", description: "Tambahkan minimal 1 keyword ke strategy.", variant: "destructive" });
      return;
    }
    localStorage.setItem("strategyKeywords", JSON.stringify([...selectedForStrategy]));
    navigate("/content-calendar");
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = [["Keyword", "Intent", "Kompetisi", "Skor Potensi"]];
    result.keywordSuggestions.forEach((s) => rows.push([s.keyword, s.intent, s.competition, String(s.potentialScore)]));
    result.clusters.forEach((c) => c.keywords.forEach((k) => rows.push([k.keyword, `cluster: ${c.name}`, "-", String(k.potentialScore)])));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keyword-research-${result.keyword}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StrategyBadge = ({ kw }: { kw: string }) => (
    <Button
      variant={selectedForStrategy.has(kw) ? "default" : "outline"}
      size="sm"
      className="h-6 text-xs gap-1"
      onClick={() => toggleStrategy(kw)}
    >
      {selectedForStrategy.has(kw) ? <CheckSquare className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
      {selectedForStrategy.has(kw) ? "Added" : "Strategy"}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-display text-xl font-bold text-foreground block">Riset Keyword</span>
                  <span className="text-xs text-muted-foreground">AI-Powered Research</span>
                </div>
              </div>
            </div>
            {selectedForStrategy.size > 0 && (
              <Button onClick={goToCalendar} className="gap-2">
                <Layers className="w-4 h-4" />
                Strategy ({selectedForStrategy.size})
              </Button>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Research Mode Tabs */}
        <Tabs value={researchTab} onValueChange={setResearchTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="targeted" className="gap-1.5 text-xs sm:text-sm">
              <Search className="w-4 h-4 hidden sm:block" /> Targeted
            </TabsTrigger>
            <TabsTrigger value="competitor" className="gap-1.5 text-xs sm:text-sm">
              <Globe className="w-4 h-4 hidden sm:block" /> Competitor
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 hidden sm:block" /> Trends
            </TabsTrigger>
            <TabsTrigger value="intent" className="gap-1.5 text-xs sm:text-sm">
              <Users className="w-4 h-4 hidden sm:block" /> Intent & PAA
            </TabsTrigger>
          </TabsList>

          {/* Targeted Keyword Tab */}
          <TabsContent value="targeted">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Seed Keyword Research</CardTitle>
                <CardDescription>Masukkan keyword utama untuk analisis mendalam dari Google Suggest + AI.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="contoh: digital marketing, resep masakan..." className="flex-1" disabled={isLoading} />
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">🇮🇩 ID</SelectItem>
                      <SelectItem value="en">🇺🇸 EN</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={isLoading || !keyword.trim()}>
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Search className="w-4 h-4" /> Riset</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitor Tab */}
          <TabsContent value="competitor">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Competitor Keyword Extraction</CardTitle>
                <CardDescription>Masukkan URL kompetitor untuk mengekstrak keyword yang mereka targetkan.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompetitorResearch} className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder="https://competitor-website.com" className="flex-1" disabled={isMockLoading} />
                  <Button type="submit" disabled={isMockLoading || !competitorUrl.trim()}>
                    {isMockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Extract
                  </Button>
                </form>
                {competitorKeywords.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Extracted Keywords ({competitorKeywords.length})</h4>
                    <div className="space-y-1.5">
                      {competitorKeywords.map((kw, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/30">
                          <span className="text-sm">{kw}</span>
                          <StrategyBadge kw={kw} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Google Trends</CardTitle>
                <CardDescription>Lihat trending topics dan interest level untuk keyword Anda.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Masukkan keyword..." className="flex-1" />
                  <Button onClick={handleTrendsSearch} disabled={isMockLoading || !keyword.trim()}>
                    {isMockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />} Cek Trends
                  </Button>
                </div>
                {trendResults.length > 0 && (
                  <div className="space-y-2">
                    {trendResults.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{t.keyword}</span>
                            {t.rising && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-200">↑ Rising</Badge>}
                          </div>
                          <Progress value={t.interest} className="mt-1.5 h-1.5" />
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className="text-sm font-bold text-primary">{t.interest}</span>
                          <StrategyBadge kw={t.keyword} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Intent & PAA Tab */}
          <TabsContent value="intent">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5" /> User Intent & People Also Ask</CardTitle>
                <CardDescription>Analisis search intent dan pertanyaan yang sering ditanyakan pengguna.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Masukkan keyword..." className="flex-1" />
                  <Button onClick={handlePAASearch} disabled={isMockLoading || !keyword.trim()}>
                    {isMockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />} Analisis Intent
                  </Button>
                </div>
                {paaResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium mb-2">People Also Ask</h4>
                    {paaResults.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.question}</p>
                          <Badge variant="outline" className={`text-xs mt-1 ${intentColor(p.intent)}`}>{p.intent}</Badge>
                        </div>
                        <StrategyBadge kw={p.question} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Strategy Summary */}
        {selectedForStrategy.size > 0 && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium">📋 Strategy Queue: {selectedForStrategy.size} keywords selected</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[...selectedForStrategy].map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs gap-1">
                        {kw.length > 30 ? kw.slice(0, 30) + "..." : kw}
                        <button onClick={() => toggleStrategy(kw)} className="ml-0.5 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button onClick={goToCalendar} className="gap-2 shrink-0">
                  <Layers className="w-4 h-4" /> Go to Calendar →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Menganalisis keyword dari Google Suggest, SERP, dan AI...</p>
            </CardContent>
          </Card>
        )}

        {/* Targeted Results */}
        {result && researchTab === "targeted" && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-xl">Hasil: "{result.keyword}"</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4" /> Export CSV</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Skor Potensi</p>
                    <p className="text-2xl font-bold text-primary">{result.overview.potentialScore}</p>
                    <Progress value={result.overview.potentialScore} className="mt-2 h-1.5" />
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Volume</p>
                    <Badge variant="outline" className="text-sm capitalize">{result.overview.searchVolume}</Badge>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Kompetisi</p>
                    <Badge variant="outline" className={`text-sm capitalize ${competitionColor(result.overview.competition)}`}>{result.overview.competition}</Badge>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Intent</p>
                    <Badge variant="outline" className={`text-sm capitalize ${intentColor(result.overview.intent)}`}>{result.overview.intent}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{result.overview.summary}</p>
              </CardContent>
            </Card>

            <Tabs defaultValue="suggestions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="suggestions"><Globe className="w-4 h-4 mr-1.5" /> Suggestions</TabsTrigger>
                <TabsTrigger value="serp"><BarChart3 className="w-4 h-4 mr-1.5" /> SERP</TabsTrigger>
                <TabsTrigger value="clusters"><Layers className="w-4 h-4 mr-1.5" /> Clusters</TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Suggestions ({result.keywordSuggestions.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.googleSuggestions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Google Autocomplete</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.googleSuggestions.map((s, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">{s}</Badge>
                              <StrategyBadge kw={s} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {result.keywordSuggestions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{s.keyword}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${intentColor(s.intent)}`}>{s.intent}</Badge>
                              <Badge variant="outline" className={`text-xs ${competitionColor(s.competition)}`}>{s.competition}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <div className="text-right">
                              <span className="text-lg font-bold text-primary">{s.potentialScore}</span>
                            </div>
                            <StrategyBadge kw={s.keyword} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="serp">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Kompetitor SERP ({result.serpAnalysis.competitors.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.serpAnalysis.competitors.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{c.title}</p>
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                                {c.url.slice(0, 50)}... <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                          </div>
                          {(c.strengths || c.weaknesses) && (
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              {c.strengths && <div className="p-2 rounded bg-green-500/5"><span className="font-medium text-green-700">+</span> {c.strengths}</div>}
                              {c.weaknesses && <div className="p-2 rounded bg-red-500/5"><span className="font-medium text-red-700">−</span> {c.weaknesses}</div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader><CardTitle className="text-base">Content Gaps</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.serpAnalysis.contentGaps.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />{g}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Peluang Konten</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.serpAnalysis.opportunities.map((o, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{o}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="clusters">
                <div className="grid md:grid-cols-2 gap-4">
                  {result.clusters.map((cluster, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />{cluster.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {cluster.keywords.map((k, j) => (
                            <div key={j} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                              <span>{k.keyword}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary">{k.potentialScore}</span>
                                <StrategyBadge kw={k.keyword} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default KeywordResearch;
