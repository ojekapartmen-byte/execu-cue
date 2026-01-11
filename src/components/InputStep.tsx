import { useState, useCallback } from "react";
import { Link2, FileUp, Plus, Trash2, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputLink } from "@/types/digest";
import { cn } from "@/lib/utils";

interface InputStepProps {
  onNext: (links: InputLink[], pdfFile?: File) => void;
}

export const InputStep = ({ onNext }: InputStepProps) => {
  const [activeTab, setActiveTab] = useState<"links" | "pdf">("links");
  const [linksText, setLinksText] = useState("");
  const [parsedLinks, setParsedLinks] = useState<InputLink[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseLinks = useCallback((text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const lines = text.split('\n').filter(line => line.trim());
    const links: InputLink[] = [];

    lines.forEach((line, index) => {
      const matches = line.match(urlRegex);
      if (matches) {
        matches.forEach(url => {
          const isValid = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url);
          links.push({
            id: `link-${index}-${url}`,
            url: url.trim(),
            isValid,
          });
        });
      }
    });

    setParsedLinks(links);
  }, []);

  const handleLinksChange = (value: string) => {
    setLinksText(value);
    parseLinks(value);
  };

  const removeLink = (id: string) => {
    setParsedLinks(prev => prev.filter(l => l.id !== id));
    const remaining = parsedLinks.filter(l => l.id !== id);
    setLinksText(remaining.map(l => l.url).join('\n'));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const canProceed = activeTab === "links" 
    ? parsedLinks.some(l => l.isValid)
    : pdfFile !== null;

  const handleNext = () => {
    if (activeTab === "links") {
      onNext(parsedLinks.filter(l => l.isValid));
    } else {
      onNext([], pdfFile || undefined);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Input Your Sources
        </h2>
        <p className="text-muted-foreground">
          Add news links or upload a PDF document to generate your executive digest
        </p>
      </div>

      <Card className="card-editorial p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "links" | "pdf")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Bulk Links
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Paste your news links (one per line)
              </label>
              <Textarea
                placeholder="https://example.com/news-article-1&#10;https://example.com/news-article-2&#10;https://example.com/news-article-3"
                className="min-h-[200px] font-mono text-sm resize-none"
                value={linksText}
                onChange={(e) => handleLinksChange(e.target.value)}
              />
            </div>

            {parsedLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Parsed Links ({parsedLinks.filter(l => l.isValid).length} valid)
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {parsedLinks.map((link) => (
                    <div
                      key={link.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-sm",
                        link.isValid 
                          ? "bg-secondary/50 border-border" 
                          : "bg-destructive/10 border-destructive/30"
                      )}
                    >
                      {link.isValid ? (
                        <Link2 className="w-4 h-4 text-accent shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="truncate flex-1">{link.url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300",
                isDragging 
                  ? "border-accent bg-accent/10" 
                  : "border-border hover:border-accent/50",
                pdfFile && "border-accent bg-accent/5"
              )}
            >
              {pdfFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                    <FileUp className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{pdfFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPdfFile(null)}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <FileUp className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Drop your PDF here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          >
            Generate TOC
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
