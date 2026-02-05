 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Progress } from "@/components/ui/progress";
 import { Badge } from "@/components/ui/badge";
 import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
 import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
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
 
 interface AuditResult {
   overallScore: number;
   categories: AuditCategory[];
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