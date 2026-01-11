import { useState, useEffect } from "react";
import { ArrowLeft, Copy, Download, Check, Loader2, Lightbulb, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DigestCategory, DigestItem } from "@/types/digest";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ReportStepProps {
  categories: DigestCategory[];
  onBack: () => void;
  onReset: () => void;
}

// Simulated full report generation
const generateFullReport = (categories: DigestCategory[]): DigestCategory[] => {
  return categories.map(cat => ({
    ...cat,
    items: cat.items.map(item => ({
      ...item,
      bulletPoints: [
        `**Pemerintah** mengumumkan kebijakan baru yang akan berlaku efektif mulai **1 Januari 2025**, dengan fokus pada **pengendalian inflasi** dan **stabilitas ekonomi makro**.`,
        `Menteri terkait menyatakan bahwa langkah ini diambil setelah **kajian mendalam** selama 6 bulan terakhir dengan melibatkan **berbagai pemangku kepentingan**.`,
        `**Data BPS** menunjukkan bahwa kebijakan serupa di tahun sebelumnya berhasil menurunkan tingkat inflasi sebesar **2,3 poin persentase**.`,
        `Para pengamat ekonomi menilai kebijakan ini akan berdampak positif pada **daya beli masyarakat** terutama di **segmen menengah ke bawah**.`,
        `Implementasi akan dilakukan secara bertahap dengan **pilot project** di **5 provinsi** sebelum diterapkan secara nasional.`,
      ],
      insights: [
        `Kebijakan ini menunjukkan **komitmen pemerintah** dalam menjaga stabilitas ekonomi di tengah **ketidakpastian global** yang masih berlanjut.`,
        `Perlu diperhatikan bahwa keberhasilan kebijakan sangat bergantung pada **koordinasi antar-kementerian** dan **pemerintah daerah**.`,
        `Timing pengumuman yang dilakukan menjelang akhir tahun mengindikasikan **strategi komunikasi** yang terukur untuk **mengelola ekspektasi pasar**.`,
      ],
    })),
    subCategories: cat.subCategories?.map(sub => ({
      ...sub,
      items: sub.items.map(item => ({
        ...item,
        bulletPoints: [
          `**PBB** melalui Sekretaris Jenderal menegaskan kembali pentingnya **gencatan senjata segera** untuk mencegah **krisis kemanusiaan** yang lebih luas.`,
          `Laporan terbaru mencatat lebih dari **10.000 korban sipil** sejak konflik dimulai, dengan **40% di antaranya** adalah anak-anak.`,
          `Beberapa negara **Gulf Cooperation Council** telah menawarkan **mediasi** dan **bantuan kemanusiaan** senilai **$500 juta**.`,
          `**Amerika Serikat** menyatakan dukungan terhadap solusi diplomatik namun tetap mempertahankan **posisi strategis** di kawasan.`,
        ],
        insights: [
          `Dinamika konflik menunjukkan **pergeseran signifikan** dalam keseimbangan kekuatan regional yang dapat mempengaruhi **harga energi global**.`,
          `Indonesia perlu mempersiapkan **strategi antisipasi** mengingat ketergantungan pada **impor minyak** dari kawasan tersebut.`,
          `Posisi **non-blok Indonesia** memberikan peluang untuk berperan sebagai **mediator** dalam forum internasional.`,
        ],
      })),
    })),
  }));
};

export const ReportStep = ({ categories, onBack, onReset }: ReportStepProps) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [fullReport, setFullReport] = useState<DigestCategory[]>([]);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setFullReport(generateFullReport(categories));
      setIsGenerating(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [categories]);

  const handleCopy = async () => {
    // Generate markdown content
    const markdown = generateMarkdown(fullReport);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "The digest has been copied in markdown format",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const generateMarkdown = (report: DigestCategory[]): string => {
    let md = `# Executive Daily Digest\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    md += `---\n\n## Daftar Isi\n\n`;

    report.forEach(cat => {
      md += `### ${cat.name}\n`;
      cat.items.forEach(item => {
        md += `- [${item.headline}](${item.headlineUrl})\n`;
      });
      cat.subCategories?.forEach(sub => {
        md += `\n#### ${sub.name}\n`;
        sub.items.forEach(item => {
          md += `- [${item.headline}](${item.headlineUrl})\n`;
        });
      });
      md += `\n`;
    });

    md += `---\n\n`;

    report.forEach(cat => {
      md += `## ${cat.name}\n\n`;
      cat.items.forEach(item => renderItemMarkdown(item));
      cat.subCategories?.forEach(sub => {
        md += `### ${sub.name}\n\n`;
        sub.items.forEach(item => renderItemMarkdown(item));
      });

      function renderItemMarkdown(item: DigestItem) {
        md += `**[${item.headline}](${item.headlineUrl})**\n\n`;
        md += `**Sumber:** ${item.sources.map(s => `[${s.name}](${s.url})`).join(', ')}\n\n`;
        item.bulletPoints.forEach(bp => {
          md += `- ${bp}\n`;
        });
        md += `\n**🔷 Insight**\n\n`;
        item.insights.forEach(ins => {
          md += `- ${ins}\n`;
        });
        md += `\n---\n\n`;
      }
    });

    return md;
  };

  if (isGenerating) {
    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in">
        <Card className="card-editorial p-12 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            Generating Executive Digest
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Creating comprehensive summaries and insights for each article...
          </p>
        </Card>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-1">
            Executive Daily Digest
          </h2>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Markdown"}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Table of Contents */}
      <Card className="card-editorial p-6 mb-8">
        <h3 className="font-display text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
          📋 Daftar Isi
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {fullReport.map((category) => (
            <div key={category.name}>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" />
                {category.name}
              </h4>
              <ul className="space-y-1 ml-4">
                {category.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm text-muted-foreground hover:text-accent transition-colors"
                    >
                      {item.headline}
                    </a>
                  </li>
                ))}
                {category.subCategories?.map((sub) => (
                  <li key={sub.name} className="mt-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {sub.name}
                    </span>
                    <ul className="mt-1 space-y-1 ml-3">
                      {sub.items.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="text-sm text-muted-foreground hover:text-accent transition-colors"
                          >
                            {item.headline}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Full Report */}
      {fullReport.map((category) => (
        <div key={category.name} className="mb-10">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 pb-2 border-b-2 border-accent">
            {category.name}
          </h2>

          {category.items.map((item) => (
            <DigestArticle key={item.id} item={item} />
          ))}

          {category.subCategories?.map((sub) => (
            <div key={sub.name} className="mt-8">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 pl-4 border-l-4 border-accent">
                {sub.name}
              </h3>
              {sub.items.map((item) => (
                <DigestArticle key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-between pt-6 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to TOC
        </Button>
        <Button onClick={onReset} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Create New Digest
        </Button>
      </div>
    </div>
  );
};

const DigestArticle = ({ item }: { item: DigestItem }) => {
  // Parse text with **bold** markers into React elements
  const parseHighlightedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <Card id={item.id} className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
      {/* Headline */}
      <a
        href={item.headlineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-start gap-2 mb-3"
      >
        <h3 className="font-display text-lg font-bold text-foreground group-hover:text-accent transition-colors leading-tight">
          {item.headline}
        </h3>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-0.5" />
      </a>

      {/* Source badges */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-sm text-muted-foreground">Sumber:</span>
        {item.sources.map((source, idx) => (
          <a
            key={idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-medium"
          >
            {source.name}
          </a>
        ))}
      </div>

      {/* Bullet points - clean table-like layout */}
      <div className="space-y-3 mb-6">
        {item.bulletPoints.map((point, idx) => (
          <div key={idx} className="flex gap-2 text-sm text-foreground leading-relaxed">
            <span className="text-primary font-bold shrink-0">•</span>
            <p className="flex-1">{parseHighlightedText(point)}</p>
          </div>
        ))}
      </div>

      {/* Insight section */}
      <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-accent">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-accent">🔷 Insight</span>
        </div>
        <div className="space-y-2">
          {item.insights.map((insight, idx) => (
            <div key={idx} className="flex gap-2 text-sm text-foreground/90 leading-relaxed">
              <span className="text-muted-foreground shrink-0">•</span>
              <p className="flex-1">{parseHighlightedText(insight)}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
