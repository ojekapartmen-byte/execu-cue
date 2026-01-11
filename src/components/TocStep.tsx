import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronRight, Loader2, Globe, Scale, Landmark, Building2, Flag, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DigestCategory, DigestItem, InputLink } from "@/types/digest";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TocStepProps {
  links: InputLink[];
  pdfFile?: File;
  onNext: (categories: DigestCategory[]) => void;
  onBack: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Politik Nasional": <Flag className="w-4 h-4" />,
  "Hukum": <Scale className="w-4 h-4" />,
  "Ekonomi": <Landmark className="w-4 h-4" />,
  "BUMN/Korporasi": <Building2 className="w-4 h-4" />,
  "Internasional": <Globe className="w-4 h-4" />,
  "Uncategorized": <FileText className="w-4 h-4" />,
};

// Extract domain name from URL for source display
const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "Unknown Source";
  }
};

// Generate TOC strictly from input sources only
const generateTocFromSources = (links: InputLink[], pdfFile?: File): DigestCategory[] => {
  const categories: DigestCategory[] = [];

  // If we have links, create items from them
  if (links.length > 0) {
    const items: DigestItem[] = links.map((link, index) => ({
      id: `source-${index}`,
      headline: `[Pending] Article from ${extractDomain(link.url)}`,
      headlineUrl: link.url,
      sources: [
        { name: extractDomain(link.url), url: link.url }
      ],
      bulletPoints: [],
      insights: [],
      category: "Uncategorized",
    }));

    categories.push({
      name: "Input Sources",
      icon: "link2",
      items,
    });
  }

  // If we have PDF, create a category for it
  if (pdfFile) {
    categories.push({
      name: "PDF Document",
      icon: "filetext",
      items: [
        {
          id: "pdf-source",
          headline: `[Pending] Content from: ${pdfFile.name}`,
          headlineUrl: "#",
          sources: [{ name: pdfFile.name, url: "#" }],
          bulletPoints: [],
          insights: [],
          category: "PDF Document",
        }
      ],
    });
  }

  return categories;
};

export const TocStep = ({ links, pdfFile, onNext, onBack }: TocStepProps) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [categories, setCategories] = useState<DigestCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    // Generate TOC strictly from input sources only
    const timer = setTimeout(() => {
      const generated = generateTocFromSources(links, pdfFile);
      setCategories(generated);
      setExpandedCategories(generated.map(c => c.name));
      setIsGenerating(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [links, pdfFile]);

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev =>
      prev.includes(name)
        ? prev.filter(c => c !== name)
        : [...prev, name]
    );
  };

  const totalItems = categories.reduce((sum, cat) => {
    const catItems = cat.items.length;
    const subItems = cat.subCategories?.reduce((s, sub) => s + sub.items.length, 0) || 0;
    return sum + catItems + subItems;
  }, 0);

  if (isGenerating) {
    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in">
        <Card className="card-editorial p-12 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            Generating Table of Contents
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Analyzing your sources and organizing content into categories...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Table of Contents
        </h2>
        <p className="text-muted-foreground">
          {totalItems} articles organized into {categories.length} categories
        </p>
      </div>

      <Card className="card-editorial p-6 mb-6">
        <div className="space-y-4">
          {categories.map((category) => (
            <Collapsible
              key={category.name}
              open={expandedCategories.includes(category.name)}
              onOpenChange={() => toggleCategory(category.name)}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {categoryIcons[category.name] || <Globe className="w-4 h-4" />}
                    </div>
                    <span className="font-display font-semibold text-foreground">
                      {category.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({category.items.length + (category.subCategories?.reduce((s, sub) => s + sub.items.length, 0) || 0)} items)
                    </span>
                  </div>
                  {expandedCategories.includes(category.name) ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 ml-11 space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
                    >
                      <a
                        href={item.headlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground hover:text-accent transition-colors"
                      >
                        {item.headline}
                      </a>
                      <div className="flex gap-2 mt-2">
                        {item.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                          >
                            {source.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {category.subCategories?.map((subCat) => (
                    <div key={subCat.name} className="mt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 pl-2 border-l-2 border-accent">
                        {subCat.name}
                      </h4>
                      <div className="space-y-2 ml-2">
                        {subCat.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
                          >
                            <a
                              href={item.headlineUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-foreground hover:text-accent transition-colors"
                            >
                              {item.headline}
                            </a>
                            <div className="flex gap-2 mt-2">
                              {item.sources.map((source, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                                >
                                  {source.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Input
        </Button>
        <Button
          onClick={() => onNext(categories)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
        >
          Generate Report
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
