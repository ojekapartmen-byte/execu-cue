 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
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

 interface AuditResult {
   overallScore: number;
   categories: AuditCategory[];
 }
 
 async function fetchUrlContent(url: string): Promise<string> {
   const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
   
   if (FIRECRAWL_API_KEY) {
     try {
       const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
         },
         body: JSON.stringify({
           url,
           formats: ["html", "markdown"],
         }),
       });
 
       if (response.ok) {
         const data = await response.json();
         return data.data?.html || data.data?.markdown || "";
       }
     } catch (err) {
       console.error("Firecrawl error:", err);
     }
   }
 
  // Fallback to simple fetch
   try {
     const response = await fetch(url, {
       headers: { "User-Agent": "SEOAuditBot/1.0" },
     });
     return await response.text();
   } catch (err) {
     console.error("Simple fetch error:", err);
     throw new Error(`Failed to fetch URL: ${url}`);
   }
 }
 
async function fetchPageSpeedData(url: string): Promise<PageSpeedResult | null> {
  const PAGESPEED_API_KEY = Deno.env.get("PAGESPEED_API_KEY");
  
  if (!PAGESPEED_API_KEY) {
    console.log("PAGESPEED_API_KEY not configured, skipping PageSpeed analysis");
    return null;
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PAGESPEED_API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error("PageSpeed API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    
    if (!lighthouse) {
      return null;
    }

    const getStatus = (score: number): "pass" | "warning" | "fail" => {
      if (score >= 0.9) return "pass";
      if (score >= 0.5) return "warning";
      return "fail";
    };

    const audits = lighthouse.audits || {};
    const metrics: PageSpeedMetric[] = [];

    if (audits["largest-contentful-paint"]) {
      const lcp = audits["largest-contentful-paint"];
      metrics.push({
        name: "Largest Contentful Paint (LCP)",
        value: lcp.displayValue || "N/A",
        score: Math.round((lcp.score || 0) * 100),
        status: getStatus(lcp.score || 0),
      });
    }

    if (audits["total-blocking-time"]) {
      const tbt = audits["total-blocking-time"];
      metrics.push({
        name: "Total Blocking Time (TBT)",
        value: tbt.displayValue || "N/A",
        score: Math.round((tbt.score || 0) * 100),
        status: getStatus(tbt.score || 0),
      });
    }

    if (audits["cumulative-layout-shift"]) {
      const cls = audits["cumulative-layout-shift"];
      metrics.push({
        name: "Cumulative Layout Shift (CLS)",
        value: cls.displayValue || "N/A",
        score: Math.round((cls.score || 0) * 100),
        status: getStatus(cls.score || 0),
      });
    }

    if (audits["first-contentful-paint"]) {
      const fcp = audits["first-contentful-paint"];
      metrics.push({
        name: "First Contentful Paint (FCP)",
        value: fcp.displayValue || "N/A",
        score: Math.round((fcp.score || 0) * 100),
        status: getStatus(fcp.score || 0),
      });
    }

    if (audits["speed-index"]) {
      const si = audits["speed-index"];
      metrics.push({
        name: "Speed Index",
        value: si.displayValue || "N/A",
        score: Math.round((si.score || 0) * 100),
        status: getStatus(si.score || 0),
      });
    }

    if (audits["interactive"]) {
      const tti = audits["interactive"];
      metrics.push({
        name: "Time to Interactive (TTI)",
        value: tti.displayValue || "N/A",
        score: Math.round((tti.score || 0) * 100),
        status: getStatus(tti.score || 0),
      });
    }

    const opportunities: AuditItem[] = [];
    const opportunityAudits = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "efficient-animated-content",
      "duplicated-javascript",
      "legacy-javascript",
    ];

    for (const auditId of opportunityAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        opportunities.push({
          label: audit.title || auditId,
          status: getStatus(audit.score || 0),
          message: audit.displayValue || audit.description || "",
          recommendation: audit.description,
        });
      }
    }

    const performanceScore = Math.round((lighthouse.categories?.performance?.score || 0) * 100);

    return {
      performanceScore,
      metrics,
      opportunities,
    };
  } catch (err) {
    console.error("PageSpeed fetch error:", err);
    return null;
  }
}

 async function analyzeWithAI(content: string, inputType: string): Promise<AuditResult> {
   const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
   if (!LOVABLE_API_KEY) {
     throw new Error("LOVABLE_API_KEY is not configured");
   }
 
   const systemPrompt = `You are an expert SEO auditor. Analyze the provided content and return a comprehensive SEO audit.
 
 You MUST respond with a valid JSON object following this exact structure (no markdown, no code blocks, just pure JSON):
 {
   "overallScore": <number 0-100>,
   "categories": [
     {
       "name": "Basic SEO",
       "score": <number 0-100>,
       "items": [
         {
           "label": "<element name>",
           "status": "<pass|warning|fail>",
           "message": "<current state description>",
           "recommendation": "<optional improvement suggestion>"
         }
       ]
     },
     {
       "name": "Content Quality",
       "score": <number 0-100>,
       "items": [...]
     },
     {
       "name": "Technical SEO",
       "score": <number 0-100>,
       "items": [...]
     }
   ]
 }
 
 Basic SEO items to check:
 - Title tag (exists, length 50-60 chars, contains keywords)
 - Meta description (exists, length 140-160 chars, compelling)
 - H1 tag (single, descriptive, contains keyword)
 - H2-H6 structure (proper hierarchy)
 - Image alt attributes (all images have descriptive alt text)
 - Internal links (presence and anchor text quality)
 - External links (rel attributes, nofollow where appropriate)
 
 Content Quality items to check:
 - Word count (minimum 300 words for blog posts)
 - Keyword density (1-2% natural usage)
 - Readability score (appropriate for target audience)
 - Content structure (paragraphs, lists, formatting)
 - Unique content indicators
 - First paragraph quality (hook, keyword placement)
 
 Technical SEO items to check:
 - Schema markup (presence of structured data)
 - Canonical tag (present and correct)
 - Robots meta tag (appropriate directives)
 - Open Graph tags (og:title, og:description, og:image)
 - Twitter Card tags
 - Mobile viewport meta
 - Language declaration (html lang attribute)
 
 Be thorough but practical. For each failing item, provide actionable recommendations.`;
 
   const userPrompt = `Analyze this ${inputType} content for SEO optimization:
 
 ${content.slice(0, 50000)}`;
 
   const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${LOVABLE_API_KEY}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: "google/gemini-2.5-flash",
       messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userPrompt },
       ],
       temperature: 0.3,
     }),
   });
 
   if (!response.ok) {
     if (response.status === 429) {
       throw new Error("Rate limit exceeded. Please try again later.");
     }
     if (response.status === 402) {
       throw new Error("Payment required. Please add credits to your workspace.");
     }
     const errorText = await response.text();
     console.error("AI Gateway error:", response.status, errorText);
     throw new Error("Failed to analyze content with AI");
   }
 
   const data = await response.json();
   const aiResponse = data.choices?.[0]?.message?.content;
 
   if (!aiResponse) {
     throw new Error("Empty response from AI");
   }
 
   // Parse JSON response (handle potential markdown code blocks)
   let jsonContent = aiResponse.trim();
   if (jsonContent.startsWith("```json")) {
     jsonContent = jsonContent.slice(7);
   }
   if (jsonContent.startsWith("```")) {
     jsonContent = jsonContent.slice(3);
   }
   if (jsonContent.endsWith("```")) {
     jsonContent = jsonContent.slice(0, -3);
   }
 
   try {
     return JSON.parse(jsonContent.trim());
   } catch (parseErr) {
     console.error("Failed to parse AI response:", jsonContent);
     throw new Error("Invalid AI response format");
   }
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { inputType, content } = await req.json();
 
     if (!content || typeof content !== "string" || content.trim().length === 0) {
       return new Response(
         JSON.stringify({ error: "Content is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     let contentToAnalyze = content;
 
     // If URL, fetch the content first
     if (inputType === "url") {
       const urlPattern = /^https?:\/\/.+/i;
       if (!urlPattern.test(content)) {
         return new Response(
           JSON.stringify({ error: "Invalid URL format" }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       contentToAnalyze = await fetchUrlContent(content);
     }
 
    // Run AI analysis
    const aiResult = await analyzeWithAI(contentToAnalyze, inputType);

    // If URL input, also fetch PageSpeed data
    let pageSpeedResult: PageSpeedResult | null = null;
    if (inputType === "url") {
      pageSpeedResult = await fetchPageSpeedData(content);
    }
 
     return new Response(
      JSON.stringify({ 
        result: aiResult,
        pageSpeed: pageSpeedResult,
      }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (err) {
     console.error("SEO Audit error:", err);
     return new Response(
       JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });