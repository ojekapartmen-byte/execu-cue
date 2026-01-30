import { Newspaper, PenSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO, SEO_CONFIG } from "@/hooks/useSEO";

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
                  AI Daily Digest
                </span>
                <span className="text-xs text-muted-foreground">
                  Executive Intelligence Tool
                </span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16" role="main">
        <section className="text-center mb-16" aria-label="Welcome section">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tools AI untuk Eksekutif
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Buat ringkasan harian dari berbagai sumber atau generate artikel profesional dengan bantuan AI. 
            Pilih tools yang Anda butuhkan.
          </p>
        </section>

        {/* Main Menu Cards */}
        <section className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto" aria-label="Main features">
          {/* Daily Digest Card */}
          <Link to="/daily-digest" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl gradient-editorial flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Newspaper className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-2xl">Create Daily Digest</CardTitle>
                <CardDescription className="text-base">
                  Ringkasan harian dari berbagai sumber berita
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Input multiple links atau PDF
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Auto-generate Table of Contents
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Laporan eksekutif dengan insights
                  </li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                  Mulai Buat Digest
                  <span aria-hidden="true">→</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Create Article Card */}
          <Link to="/create-article" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <PenSquare className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-2xl">Create Article</CardTitle>
                <CardDescription className="text-base">
                  Generate artikel SEO-friendly dengan AI
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Berbagai kategori & topik
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    SEO optimized dengan keywords
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Export ke PDF & DOCX
                  </li>
                </ul>
                <div className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                  Mulai Buat Artikel
                  <span aria-hidden="true">→</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12" role="contentinfo">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Daily Digest • Executive Intelligence Tool</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
