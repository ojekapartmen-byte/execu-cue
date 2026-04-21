import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Normalize URL
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;

    // Step 1: Scrape competitor page with Firecrawl
    console.log(`Scraping: ${targetUrl}`);
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeData);
      throw new Error(scrapeData.error || `Firecrawl failed: ${scrapeRes.status}`);
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
    
    if (!markdown) throw new Error("Tidak bisa mengambil konten dari URL tersebut");

    // Truncate to avoid token overflow
    const content = markdown.slice(0, 8000);

    // Step 2: Extract keywords with AI via tool calling
    console.log("Analyzing with AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an SEO expert analyzing competitor content. Extract the most valuable SEO keywords and topics they target. Focus on commercial and informational keywords.",
          },
          {
            role: "user",
            content: `Analyze this competitor page and extract SEO keywords they target.\n\nTitle: ${metadata.title || "N/A"}\nDescription: ${metadata.description || "N/A"}\nURL: ${targetUrl}\n\nContent:\n${content}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_competitor_keywords",
            description: "Extract SEO keywords and analysis from competitor page",
            parameters: {
              type: "object",
              properties: {
                main_topic: { type: "string", description: "The main topic/niche of the page" },
                keywords: {
                  type: "array",
                  description: "15-25 SEO keywords this competitor targets",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] },
                      difficulty: { type: "string", enum: ["low", "medium", "high"] },
                      relevance: { type: "number", description: "Score 0-100" },
                    },
                    required: ["keyword", "intent", "difficulty", "relevance"],
                    additionalProperties: false,
                  },
                },
                content_gaps: {
                  type: "array",
                  description: "3-5 topics the competitor missed (opportunities)",
                  items: { type: "string" },
                },
              },
              required: ["main_topic", "keywords", "content_gaps"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_competitor_keywords" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit terlampaui, coba lagi sebentar." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit AI habis. Top up di Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI tidak mengembalikan hasil terstruktur");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      success: true,
      url: targetUrl,
      title: metadata.title || "Kompetitor",
      description: metadata.description || "",
      ...analysis,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("competitor-keywords error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
