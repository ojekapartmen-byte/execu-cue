import { Newspaper, PenSquare, Sparkles, Search, TrendingUp, CalendarDays, ArrowRight, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO, SEO_CONFIG } from "@/hooks/useSEO";

const workflowSteps = [
  { label: "Research", icon: TrendingUp, path: "/keyword-research", color: "from-primary to-secondary" },
  { label: "Strategy", icon: CalendarDays, path: "/content-calendar", color: "from-primary to-accent" },
  { label: "Production", icon: PenSquare, path: "/create-article", color: "from-secondary to-accent" },
  { label: "Audit", icon: Search, path: "/seo-audit", color: "from-primary to-secondary" },
  { label: "Distribution", icon: Send, path: "#", color: "from-accent to-primary" },
];

const LandingPage = () => {
  useSEO(SEO_CONFIG.index);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50" role="banner">
        <nav className="container mx-auto px-4 py-4" aria-label="Main navigation">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-editorial flex items-center justify-center" aria-hidden="true">
                <Newspaper className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-xl font-bold text-foreground tracking-tight block">
                  SEO Content Marketing OS
                </span>
                <span className="text-xs text-muted-foreground">
                  End-to-End Intelligence Platform
                </span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12" role="main">
        <section className="text-center mb-10" aria-label="Welcome section">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            End-to-End SEO Content Marketing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dari riset keyword hingga distribusi konten — semua dalam satu platform terintegrasi.
          </p>
        </section>

        {/* Workflow Pipeline */}
        <section className="mb-12" aria-label="Workflow pipeline">
          <div className="flex items-center justify-center flex-wrap gap-2 md:gap-0 max-w-4xl mx-auto">
            {workflowSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center">
                  <Link
                    to={step.path}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-primary hover:text-primary-foreground transition-all group ${step.path === "#" ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                  </Link>
                  {i < workflowSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 hidden md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Main Menu Cards */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto" aria-label="Main features">
          {/* Keyword Research */}
          <Link to="/keyword-research" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl">1. Riset Keyword</CardTitle>
                <CardDescription>Competitor, Trends, Intent & PAA</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Competitor keyword extraction</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Google Trends & Autocomplete</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Search intent & People Also Ask</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-sm">
                  Mulai Riset <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Content Calendar */}
          <Link to="/content-calendar" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl">2. Content Calendar</CardTitle>
                <CardDescription>AI-generated content strategy</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />1-month AI content plan</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Persona & tone targeting</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Integrated with article creation</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-sm">
                  Buka Calendar <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Create Article */}
          <Link to="/create-article" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <PenSquare className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl">3. Create Article</CardTitle>
                <CardDescription>AI article generation</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />SEO-optimized content</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Multiple categories & topics</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Export to PDF & DOCX</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-sm">
                  Buat Artikel <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* SEO Audit */}
          <Link to="/seo-audit" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Search className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl">4. SEO Audit</CardTitle>
                <CardDescription>On-page SEO analysis</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />6 kategori audit lengkap</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Rekomendasi konten pengganti</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Auto-apply recommendations</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-sm">
                  Mulai Audit <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Daily Digest */}
          <Link to="/daily-digest" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl gradient-editorial flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Newspaper className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl">Daily Digest</CardTitle>
                <CardDescription>Executive daily briefing</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Multi-source summarization</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Auto Table of Contents</li>
                  <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Executive insights report</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-sm">
                  Buat Digest <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Distribution (Coming Soon) */}
          <Card className="h-full opacity-60 border-dashed">
            <CardHeader className="text-center pb-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Send className="w-7 h-7 text-muted-foreground" />
              </div>
              <CardTitle className="font-display text-xl text-muted-foreground">5. Distribution</CardTitle>
              <CardDescription>Publish & distribute content</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-1.5 mb-4">
                <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />WordPress integration</li>
                <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />Social media scheduling</li>
                <li className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />Webhook API support</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-muted-foreground font-medium text-sm">
                Coming Soon
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12" role="contentinfo">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 SEO Content Marketing OS • End-to-End Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
