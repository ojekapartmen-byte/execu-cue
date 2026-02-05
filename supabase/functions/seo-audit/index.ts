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

  async function analyzeWithAI(
    content: string, 
    inputType: string,
    mainKeyword: string,
    relatedKeywords: string[]
  ): Promise<AuditResult> {
   const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
   if (!LOVABLE_API_KEY) {
     throw new Error("LOVABLE_API_KEY is not configured");
   }
 
   const relatedKwList = relatedKeywords.length > 0 
     ? relatedKeywords.join(", ") 
     : "none provided";

   const systemPrompt = `Kamu adalah seorang pakar SEO auditor. Analisis konten yang diberikan untuk optimasi keyword dan praktik SEO terbaik.
PENTING: Semua respons HARUS dalam Bahasa Indonesia.

TARGET KEYWORD:
- Keyword Utama: "${mainKeyword}"
- Keyword Terkait: ${relatedKwList}
 
 Kamu HARUS merespons dengan objek JSON valid mengikuti struktur ini (tanpa markdown, tanpa code blocks, hanya JSON murni):
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
 
Item SEO Dasar yang perlu dicek (fokus pada keyword utama "${mainKeyword}"):
 - Tag judul (ada, panjang 50-60 karakter, mengandung keyword)
 - Meta deskripsi (ada, panjang 140-160 karakter, menarik)
 - Tag H1 (tunggal, deskriptif, mengandung keyword)
 - Struktur H2-H6 (hierarki yang tepat)
 - Atribut alt gambar (semua gambar memiliki alt text deskriptif)
 - Link internal (keberadaan dan kualitas anchor text)
 - Link eksternal (atribut rel, nofollow jika diperlukan)
- Keyword utama di judul (cek apakah "${mainKeyword}" muncul di judul)
- Keyword utama di paragraf pertama (cek apakah "${mainKeyword}" muncul di awal)
- Keyword utama di URL slug (untuk input URL)
 
Item Kualitas Konten yang perlu dicek (optimasi keyword "${mainKeyword}"):
 - Jumlah kata (minimal 300 kata untuk blog post)
- Kepadatan keyword utama (1-2% penggunaan natural "${mainKeyword}")
- Penggunaan keyword terkait (cek keberadaan: ${relatedKwList})
- Keyword di heading (H2-H6 harus mengandung variasi keyword)
 - Skor keterbacaan (sesuai target audiens)
 - Struktur konten (paragraf, list, formatting)
 - Indikator konten unik
 - Kualitas paragraf pertama (hook, penempatan keyword)
- Keyword LSI (cek istilah yang terkait secara semantik)
- Cek keyword stuffing (pastikan penggunaan natural, tidak over-optimized)
 
 Item SEO Teknis yang perlu dicek:
 - Schema markup (keberadaan structured data)
 - Tag canonical (ada dan benar)
 - Meta tag robots (direktif yang tepat)
 - Tag Open Graph (og:title, og:description, og:image)
 - Twitter Card tags
 - Mobile viewport meta
 - Deklarasi bahasa (atribut html lang)
 
 Jadilah teliti tapi praktis. Untuk setiap item yang gagal, berikan rekomendasi yang actionable dalam Bahasa Indonesia.`;
 
   const userPrompt = `Analyze this ${inputType} content for SEO optimization.

Target Main Keyword: "${mainKeyword}"
Related Keywords: ${relatedKwList}
 
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
 
async function detectKeywords(content: string, inputType: string): Promise<{ mainKeyword: string; relatedKeywords: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = `You are an SEO keyword extraction expert. Analyze the provided content and extract the most relevant keywords.

You MUST respond with a valid JSON object (no markdown, no code blocks):
{
  "mainKeyword": "<the single most important keyword phrase, 2-4 words>",
  "relatedKeywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"]
}

Guidelines:
- Main keyword should be the primary topic/focus of the content
- Related keywords should be LSI (Latent Semantic Indexing) keywords
- All keywords should be in the same language as the content
- Prefer long-tail keywords (2-4 words) over single words
- Focus on commercial/informational intent keywords`;

  const userPrompt = `Extract keywords from this ${inputType} content:\n\n${content.slice(0, 20000)}`;

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
    throw new Error("Failed to detect keywords");
  }

  const data = await response.json();
  let jsonContent = data.choices?.[0]?.message?.content?.trim() || "";
  
  if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
  if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
  if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);

  try {
    return JSON.parse(jsonContent.trim());
  } catch {
    throw new Error("Failed to parse keyword detection response");
  }
}

async function suggestKeywords(mainKeyword: string): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = `You are an SEO keyword research expert. Generate related keyword suggestions for the given main keyword.

You MUST respond with a valid JSON object (no markdown, no code blocks):
{
  "suggestions": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>", "<keyword6>", "<keyword7>", "<keyword8>"]
}

Guidelines:
- Generate 8 related keywords/phrases
- Include LSI (semantically related) keywords
- Include long-tail variations
- Include question-based keywords (what, how, why)
- Mix commercial and informational intent
- Keep keywords in the same language as the main keyword`;

  const userPrompt = `Generate related keyword suggestions for: "${mainKeyword}"`;

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
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits to your workspace.");
    }
    throw new Error("Failed to suggest keywords");
  }

  const data = await response.json();
  let jsonContent = data.choices?.[0]?.message?.content?.trim() || "";
  
  if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
  if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
  if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);

  try {
    const parsed = JSON.parse(jsonContent.trim());
    return parsed.suggestions || [];
  } catch {
    throw new Error("Failed to parse keyword suggestions");
  }
}

 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
      const { action, inputType, content, mainKeyword, relatedKeywords } = await req.json();

      // Handle keyword detection
      if (action === "detect") {
        if (!content || typeof content !== "string" || content.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Content is required for detection" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let contentToAnalyze = content;
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

        const keywords = await detectKeywords(contentToAnalyze, inputType);
        return new Response(
          JSON.stringify(keywords),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle keyword suggestions
      if (action === "suggest") {
        if (!mainKeyword || typeof mainKeyword !== "string" || mainKeyword.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Main keyword is required for suggestions" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const suggestions = await suggestKeywords(mainKeyword.trim());
        return new Response(
          JSON.stringify({ suggestions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Default: Run full SEO audit
 
     if (!content || typeof content !== "string" || content.trim().length === 0) {
       return new Response(
         JSON.stringify({ error: "Content is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
      if (!mainKeyword || typeof mainKeyword !== "string" || mainKeyword.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Main keyword is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const keywords: string[] = Array.isArray(relatedKeywords) ? relatedKeywords : [];

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
 
    // Run AI analysis with keywords
    const aiResult = await analyzeWithAI(contentToAnalyze, inputType, mainKeyword.trim(), keywords);

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