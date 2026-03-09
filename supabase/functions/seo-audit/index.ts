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
  currentContent?: string;
  suggestedContent?: string;
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
 }
 
function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return url;
  }
}

async function checkRobotsTxt(url: string): Promise<{ exists: boolean; content?: string; error?: string }> {
  try {
    const baseUrl = getBaseUrl(url);
    const robotsUrl = `${baseUrl}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": "SEOAuditBot/1.0" },
    });
    if (response.ok) {
      const content = await response.text();
      return { exists: true, content: content.slice(0, 2000) };
    }
    return { exists: false, error: `Status: ${response.status}` };
  } catch (err) {
    return { exists: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function checkSitemap(url: string): Promise<{ exists: boolean; url?: string; error?: string }> {
  try {
    const baseUrl = getBaseUrl(url);
    
    // Common sitemap locations
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap/sitemap.xml`,
    ];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          headers: { "User-Agent": "SEOAuditBot/1.0" },
        });
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          const text = await response.text();
          if (contentType.includes("xml") || text.includes("<?xml") || text.includes("<urlset") || text.includes("<sitemapindex")) {
            return { exists: true, url: sitemapUrl };
          }
        }
      } catch {
        continue;
      }
    }
    
    return { exists: false, error: "Sitemap tidak ditemukan di lokasi standar" };
  } catch (err) {
    return { exists: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
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
       "name": "SEO Dasar",
       "score": <number 0-100>,
       "items": [
         {
           "label": "<element name>",
           "status": "<pass|warning|fail>",
           "message": "<current state description>",
           "recommendation": "<optional improvement suggestion>",
           "currentContent": "<konten yang ada saat ini, jika ada dan relevan>",
           "suggestedContent": "<konten pengganti yang disarankan AI, WAJIB diisi untuk status warning/fail>"
         }
       ]
     },
     {
       "name": "Struktur HTML & Heading",
       "score": <number 0-100>,
       "items": [...]
     },
     {
       "name": "Optimasi Keyword",
       "score": <number 0-100>,
       "items": [...]
     },
     {
       "name": "Kualitas Konten",
       "score": <number 0-100>,
       "items": [...]
     },
     {
       "name": "Social Media & Sharing",
       "score": <number 0-100>,
       "items": [...]
     },
     {
       "name": "SEO Teknis",
       "score": <number 0-100>,
       "items": [...]
     }
   ]
 }


ATURAN WAJIB UNTUK SEMUA 6 KATEGORI:
- Untuk SETIAP item dengan status "warning" atau "fail" di SEMUA kategori, field "suggestedContent" WAJIB diisi
- Tidak boleh ada item warning/fail TANPA suggestedContent
- Field "currentContent" WAJIB diisi dengan konten yang ditemukan saat ini (atau "Tidak ditemukan" jika tidak ada)
- Konten pengganti harus:
  - Mengandung keyword utama "${mainKeyword}" secara natural
  - Sesuai dengan best practice SEO
  - Siap untuk langsung digunakan (copy-paste ready)
  - Panjang yang sesuai standar SEO (title 50-60 karakter, meta desc 140-160 karakter, dll)

CONTOH FORMAT UNTUK SETIAP KATEGORI:

Kategori "Struktur HTML & Heading" - suggestedContent berisi heading yang sudah dioptimasi:
- H1: suggestedContent = "<h1>Judul Optimal dengan ${mainKeyword}</h1>"
- H2: suggestedContent = "<h2>Sub Judul yang Mengandung Keyword</h2>"

Kategori "Optimasi Keyword" - suggestedContent berisi paragraf/konten yang sudah dioptimasi:
- Paragraf pertama: suggestedContent = paragraf pembuka yang mengandung keyword
- Kepadatan keyword: suggestedContent = contoh kalimat dengan keyword yang natural

Kategori "Kualitas Konten" - suggestedContent berisi perbaikan konten:
- Alt text: suggestedContent = alt text yang deskriptif dengan keyword
- Link internal: suggestedContent = contoh anchor text yang optimal
- Paragraf pembuka: suggestedContent = paragraf pembuka yang menarik dengan hook

Kategori "Social Media & Sharing" - suggestedContent berisi meta tag lengkap:
- og:title: suggestedContent = '<meta property="og:title" content="Judul Optimal" />'
- og:description: suggestedContent = '<meta property="og:description" content="Deskripsi 140-160 chars" />'
- twitter:card: suggestedContent = '<meta name="twitter:card" content="summary_large_image" />'

Kategori "SEO Teknis" - suggestedContent berisi kode/markup yang diperlukan:
- Schema: suggestedContent = JSON-LD schema markup lengkap
- Favicon: suggestedContent = '<link rel="icon" href="/favicon.ico" />'
- Semantic HTML: suggestedContent = contoh struktur HTML semantik

KATEGORI 1 - SEO DASAR (fokus pada keyword utama "${mainKeyword}"):
- Tag Judul/Title (ada, panjang 50-60 karakter, mengandung keyword)
- Meta Deskripsi (ada, panjang 140-160 karakter, menarik, mengandung keyword)
- Tag Canonical (ada dan benar)
- Meta Robots (direktif yang tepat: index/noindex, follow/nofollow)
- Viewport Meta (untuk mobile responsiveness)
- Deklarasi Bahasa (atribut html lang)

KATEGORI 2 - STRUKTUR HTML & HEADING:
- Tag H1 (HARUS tunggal, deskriptif, WAJIB mengandung keyword "${mainKeyword}")
- Struktur H2 (apakah ada dan terstruktur dengan baik)
- Struktur H3-H6 (hierarki yang tepat, tidak loncat level)
- Heading mengandung keyword (cek apakah H2-H6 mengandung variasi keyword)
- Urutan hierarki heading (H1 > H2 > H3 > H4, dst - tidak boleh loncat)
- Jumlah heading yang sesuai dengan panjang konten

KATEGORI 3 - OPTIMASI KEYWORD:
- Keyword di judul/title (cek apakah "${mainKeyword}" muncul di title tag)
- Keyword di H1 (WAJIB ada "${mainKeyword}" di H1)
- Keyword di paragraf pertama (cek apakah "${mainKeyword}" muncul di 100 kata pertama)
- Keyword di URL/slug (untuk input URL, cek apakah keyword ada di URL)
- Kepadatan keyword utama (target 1-2% penggunaan natural)
- Penggunaan keyword terkait (cek keberadaan: ${relatedKwList})
- Keyword LSI (cek istilah yang terkait secara semantik)
- Cek keyword stuffing (pastikan tidak over-optimized, max 3%)

KATEGORI 4 - KUALITAS KONTEN:
- Jumlah kata (minimal 300 kata untuk blog post, 1000+ untuk artikel panjang)
- Skor keterbacaan (sesuai target audiens)
- Struktur konten (paragraf, list, formatting)
- Atribut alt gambar (semua gambar memiliki alt text deskriptif dengan keyword)
- Link internal (keberadaan dan kualitas anchor text)
- Link eksternal (atribut rel, authority sites)
- Kualitas paragraf pertama (hook, penempatan keyword)
- Indikator konten unik

KATEGORI 5 - SOCIAL MEDIA & SHARING:
- Open Graph Title (og:title - ada dan mengandung keyword)
- Open Graph Description (og:description - ada, 140-160 chars)
- Open Graph Image (og:image - WAJIB ada, URL valid)
- Open Graph Type (og:type - article, website, dll)
- Twitter Card Type (twitter:card - summary_large_image recommended)
- Twitter Title (twitter:title)
- Twitter Description (twitter:description)
- Twitter Image (twitter:image - WAJIB ada)

KATEGORI 6 - SEO TEKNIS:
- Schema Markup/Structured Data (JSON-LD - Article, BreadcrumbList, Organization, dll)
- Favicon (ada dan valid)
- HTTPS (koneksi aman)
- Mobile Friendly indicators
- Page structure (semantic HTML: header, main, article, section, footer)

INGAT: SETIAP item warning/fail di SEMUA 6 kategori WAJIB memiliki suggestedContent yang actionable dan siap pakai.
Jadilah SANGAT TELITI. Untuk setiap item yang gagal, berikan rekomendasi yang actionable dalam Bahasa Indonesia.
Periksa setiap elemen dengan seksama dan berikan status yang akurat.`;
 
   const userPrompt = `Analisis konten ${inputType} ini untuk optimasi SEO.

Keyword Utama Target: "${mainKeyword}"
Keyword Terkait: ${relatedKwList}
 
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
 
     // If URL, fetch the content first and check crawlability
     let crawlabilityResult: CrawlabilityResult | null = null;
     if (inputType === "url") {
       const urlPattern = /^https?:\/\/.+/i;
       if (!urlPattern.test(content)) {
         return new Response(
           JSON.stringify({ error: "Invalid URL format" }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       
       // Fetch content and check crawlability in parallel
       const [fetchedContent, robotsResult, sitemapResult] = await Promise.all([
         fetchUrlContent(content),
         checkRobotsTxt(content),
         checkSitemap(content),
       ]);
       
       contentToAnalyze = fetchedContent;
       crawlabilityResult = {
         robotsTxt: robotsResult,
         sitemap: sitemapResult,
       };
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
        crawlability: crawlabilityResult,
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