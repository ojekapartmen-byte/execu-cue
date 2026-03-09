import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Download, Loader2, TrendingUp, Globe, BarChart3, Layers, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const competitionColor = (level: string) => {
  if (level === "rendah") return "bg-green-500/10 text-green-700 border-green-200";
  if (level === "sedang") return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
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
    description: "Riset keyword potential dengan AI. Analisis search intent, kompetisi, dan peluang konten dari Google autocomplete dan SERP analysis.",
    keywords: "keyword research, riset keyword, SEO keyword, long-tail keyword, keyword analysis",
  });

  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("id");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const { toast } = useToast();

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
      console.error("Keyword research error:", err);
      toast({ title: "Error", description: err.message || "Gagal melakukan riset keyword", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = [["Keyword", "Intent", "Kompetisi", "Skor Potensi"]];
    result.keywordSuggestions.forEach((s) => {
      rows.push([s.keyword, s.intent, s.competition, String(s.potentialScore)]);
    });
    result.clusters.forEach((c) => {
      c.keywords.forEach((k) => {
        rows.push([k.keyword, `cluster: ${c.name}`, "-", String(k.potentialScore)]);
      });
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keyword-research-${result.keyword}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-xl font-bold text-foreground block">Riset Keyword Potential</span>
                <span className="text-xs text-muted-foreground">AI-Powered Keyword Research</span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Masukkan Seed Keyword</CardTitle>
            <CardDescription>Masukkan keyword utama untuk mendapatkan analisis potensi, suggestions, dan analisis SERP kompetitor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="contoh: digital marketing, resep masakan, tips investasi..."
                className="flex-1"
                disabled={isLoading}
              />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
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

        {/* Loading */}
        {isLoading && (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Menganalisis keyword dari Google Suggest, SERP, dan AI...</p>
              <p className="text-xs text-muted-foreground mt-1">Proses ini membutuhkan 10-30 detik</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Overview */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-xl">Hasil Analisis: "{result.keyword}"</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="w-4 h-4" /> Export CSV
                  </Button>
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
                    <p className="text-xs text-muted-foreground mb-1">Volume Pencarian</p>
                    <Badge variant="outline" className="text-sm capitalize">{result.overview.searchVolume}</Badge>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Kompetisi</p>
                    <Badge variant="outline" className={`text-sm capitalize ${competitionColor(result.overview.competition)}`}>
                      {result.overview.competition}
                    </Badge>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Search Intent</p>
                    <Badge variant="outline" className={`text-sm capitalize ${intentColor(result.overview.intent)}`}>
                      {result.overview.intent}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{result.overview.summary}</p>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="suggestions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="suggestions" className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Suggestions
                </TabsTrigger>
                <TabsTrigger value="serp" className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" /> SERP Analysis
                </TabsTrigger>
                <TabsTrigger value="clusters" className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Clusters
                </TabsTrigger>
              </TabsList>

              {/* Suggestions Tab */}
              <TabsContent value="suggestions">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Suggestions ({result.keywordSuggestions.length})</CardTitle>
                    <CardDescription>Dari Google Autocomplete + AI-generated variations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.googleSuggestions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Google Autocomplete</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.googleSuggestions.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
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
                          <div className="text-right ml-3">
                            <span className="text-lg font-bold text-primary">{s.potentialScore}</span>
                            <p className="text-xs text-muted-foreground">score</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SERP Tab */}
              <TabsContent value="serp">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Kompetitor SERP ({result.serpAnalysis.competitors.length})</CardTitle>
                      <CardDescription>Top hasil pencarian Google untuk keyword ini</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.serpAnalysis.competitors.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{c.title}</p>
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                                {c.url.slice(0, 60)}{c.url.length > 60 ? "..." : ""} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">#{i + 1}</Badge>
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
                      <CardHeader>
                        <CardTitle className="text-base">Content Gaps</CardTitle>
                        <CardDescription>Topik yang belum dibahas kompetitor</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.serpAnalysis.contentGaps.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Peluang Konten</CardTitle>
                        <CardDescription>Rekomendasi strategi konten</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.serpAnalysis.opportunities.map((o, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              {o}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Clusters Tab */}
              <TabsContent value="clusters">
                <div className="grid md:grid-cols-2 gap-4">
                  {result.clusters.map((cluster, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          {cluster.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {cluster.keywords.map((k, j) => (
                            <div key={j} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                              <span>{k.keyword}</span>
                              <span className="font-medium text-primary">{k.potentialScore}</span>
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
