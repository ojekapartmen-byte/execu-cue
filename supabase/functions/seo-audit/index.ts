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
 
   // Fallback: simple fetch
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
 
     const result = await analyzeWithAI(contentToAnalyze, inputType);
 
     return new Response(
       JSON.stringify({ result }),
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