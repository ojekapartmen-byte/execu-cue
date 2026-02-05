import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Zap, Gauge, Bot, Map, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditItem {
  label: string;
  status: "pass" | "warning" | "fail";
  message: string;
  recommendation?: string;
}

interface AuditCategory {
  name: string;
  score: number;
  items: AuditItem[];
}

interface PageSpeedMetric {
  name: string;
  value: string;
  score: number;
  status: "pass" | "warning" | "fail";
}

interface PageSpeedResult {
  performanceScore: number;
  metrics: PageSpeedMetric[];
  opportunities: AuditItem[];
}

interface CrawlabilityResult {
  robotsTxt: {
    exists: boolean;
    content?: string;
    error?: string;
  };
  sitemap: {
    exists: boolean;
    url?: string;
    error?: string;
  };
}

interface AuditResult {
  overallScore: number;
  categories: AuditCategory[];
  pageSpeed?: PageSpeedResult;
  crawlability?: CrawlabilityResult;
}

interface SeoAuditResultProps {
  result: AuditResult;
}
 
 const getScoreColor = (score: number) => {
   if (score >= 80) return "text-green-500";
   if (score >= 50) return "text-yellow-500";
   return "text-red-500";
 };
 
 const getScoreGradient = (score: number) => {
   if (score >= 80) return "from-green-500 to-green-400";
   if (score >= 50) return "from-yellow-500 to-yellow-400";
   return "from-red-500 to-red-400";
 };
 
 const StatusIcon = ({ status }: { status: "pass" | "warning" | "fail" }) => {
   switch (status) {
     case "pass":
       return <CheckCircle2 className="w-5 h-5 text-green-500" />;
     case "warning":
       return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
     case "fail":
       return <XCircle className="w-5 h-5 text-red-500" />;
   }
 };
 
 const StatusBadge = ({ status }: { status: "pass" | "warning" | "fail" }) => {
   const variants: Record<typeof status, { label: string; className: string }> = {
     pass: { label: "Pass", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
     warning: { label: "Warning", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
     fail: { label: "Fail", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
   };
   const { label, className } = variants[status];
   return <Badge className={cn("font-medium", className)}>{label}</Badge>;
 };
 
 export const SeoAuditResult = ({ result }: SeoAuditResultProps) => {
   return (
     <div className="space-y-6 animate-fade-in">
       {/* Overall Score */}
       <Card className="overflow-hidden">
         <div className={cn("h-2 bg-gradient-to-r", getScoreGradient(result.overallScore))} />
         <CardHeader className="pb-4">
           <CardTitle className="flex items-center justify-between">
             <span className="flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-primary" />
               Overall SEO Score
             </span>
             <span className={cn("text-4xl font-bold", getScoreColor(result.overallScore))}>
               {result.overallScore}
             </span>
           </CardTitle>
         </CardHeader>
         <CardContent>
           <Progress value={result.overallScore} className="h-3" />
           <p className="text-sm text-muted-foreground mt-2">
             {result.overallScore >= 80
               ? "Excellent! Your page is well-optimized for search engines."
               : result.overallScore >= 50
               ? "Good progress, but there's room for improvement."
               : "Needs attention. Please review the recommendations below."}
           </p>
         </CardContent>
        </Card>

        {/* Crawlability & Indexing Section */}
        {result.crawlability && (
          <Card className="overflow-hidden">
            <div className={cn(
              "h-2 bg-gradient-to-r",
              result.crawlability.robotsTxt.exists && result.crawlability.sitemap.exists
                ? "from-green-500 to-green-400"
                : result.crawlability.robotsTxt.exists || result.crawlability.sitemap.exists
                ? "from-yellow-500 to-yellow-400"
                : "from-red-500 to-red-400"
            )} />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-primary" />
                Crawlability & Indexing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* robots.txt */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  result.crawlability.robotsTxt.exists 
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <Bot className={cn(
                      "w-8 h-8",
                      result.crawlability.robotsTxt.exists ? "text-green-500" : "text-red-500"
                    )} />
                    <div>
                      <h4 className="font-semibold text-foreground">robots.txt</h4>
                      <StatusBadge status={result.crawlability.robotsTxt.exists ? "pass" : "fail"} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.crawlability.robotsTxt.exists 
                      ? "File robots.txt ditemukan dan dapat diakses oleh crawler"
                      : `File robots.txt tidak ditemukan. ${result.crawlability.robotsTxt.error || ""}`}
                  </p>
                  {!result.crawlability.robotsTxt.exists && (
                    <div className="mt-2 p-2 rounded bg-primary/10 border-l-4 border-primary">
                      <p className="text-xs text-foreground">
                        <strong>Rekomendasi:</strong> Buat file robots.txt di root domain untuk mengontrol akses crawler
                      </p>
                    </div>
                  )}
                </div>

                {/* Sitemap */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  result.crawlability.sitemap.exists 
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <Map className={cn(
                      "w-8 h-8",
                      result.crawlability.sitemap.exists ? "text-green-500" : "text-red-500"
                    )} />
                    <div>
                      <h4 className="font-semibold text-foreground">Sitemap XML</h4>
                      <StatusBadge status={result.crawlability.sitemap.exists ? "pass" : "fail"} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.crawlability.sitemap.exists 
                      ? `Sitemap ditemukan: ${result.crawlability.sitemap.url}`
                      : `Sitemap tidak ditemukan. ${result.crawlability.sitemap.error || ""}`}
                  </p>
                  {!result.crawlability.sitemap.exists && (
                    <div className="mt-2 p-2 rounded bg-primary/10 border-l-4 border-primary">
                      <p className="text-xs text-foreground">
                        <strong>Rekomendasi:</strong> Buat sitemap.xml untuk membantu search engine mengindeks halaman website
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {result.pageSpeed && (
        <Card className="overflow-hidden">
          <div className={cn("h-2 bg-gradient-to-r", getScoreGradient(result.pageSpeed.performanceScore))} />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                PageSpeed Performance
              </span>
              <span className={cn("text-4xl font-bold", getScoreColor(result.pageSpeed.performanceScore))}>
                {result.pageSpeed.performanceScore}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={result.pageSpeed.performanceScore} className="h-3" />
            
            {/* Core Web Vitals */}
            <div>
              <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Core Web Vitals & Metrics
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.pageSpeed.metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <StatusIcon status={metric.status} />
                      <span className={cn("text-lg font-bold", getScoreColor(metric.score))}>
                        {metric.score}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{metric.name}</p>
                    <p className="text-lg font-semibold text-primary mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            {result.pageSpeed.opportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-4">Improvement Opportunities</h4>
                <div className="space-y-3">
                  {result.pageSpeed.opportunities.map((opp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                    >
                      <StatusIcon status={opp.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{opp.label}</span>
                          <StatusBadge status={opp.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{opp.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

       {/* Category Scores */}
       <div className="grid md:grid-cols-3 gap-4">
         {result.categories.map((category) => (
           <Card key={category.name}>
             <CardContent className="pt-6">
               <div className="text-center">
                 <span className={cn("text-3xl font-bold", getScoreColor(category.score))}>
                   {category.score}
                 </span>
                 <p className="text-sm font-medium text-foreground mt-1">{category.name}</p>
                 <Progress value={category.score} className="h-2 mt-3" />
               </div>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Detailed Results */}
       <Card>
         <CardHeader>
           <CardTitle>Detailed Audit Results</CardTitle>
         </CardHeader>
         <CardContent>
           <Accordion type="multiple" className="w-full">
             {result.categories.map((category, catIndex) => (
               <AccordionItem key={catIndex} value={`category-${catIndex}`}>
                 <AccordionTrigger className="hover:no-underline">
                   <div className="flex items-center justify-between w-full pr-4">
                     <span className="font-medium">{category.name}</span>
                     <div className="flex items-center gap-2">
                       <span className="text-sm text-muted-foreground">
                         {category.items.filter((i) => i.status === "pass").length}/{category.items.length} passed
                       </span>
                     </div>
                   </div>
                 </AccordionTrigger>
                 <AccordionContent>
                   <div className="space-y-4 pt-2">
                     {category.items.map((item, itemIndex) => (
                       <div
                         key={itemIndex}
                         className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                       >
                         <StatusIcon status={item.status} />
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="font-medium text-foreground">{item.label}</span>
                             <StatusBadge status={item.status} />
                           </div>
                           <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                           {item.recommendation && (
                             <div className="mt-2 p-3 rounded bg-primary/10 border-l-4 border-primary">
                               <p className="text-sm text-foreground">
                                 <strong>Recommendation:</strong> {item.recommendation}
                               </p>
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
         </CardContent>
       </Card>
     </div>
   );
 };