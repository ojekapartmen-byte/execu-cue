import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, language = "id" } = await req.json();

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Keyword is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedKeyword = keyword.trim();
    console.log(`Keyword research for: "${trimmedKeyword}" (lang: ${language})`);

    // Step 1: Google Autocomplete suggestions
    let googleSuggestions: string[] = [];
    try {
      const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmedKeyword)}&hl=${language}`;
      const suggestRes = await fetch(suggestUrl);
      if (suggestRes.ok) {
        const suggestData = await suggestRes.json();
        googleSuggestions = suggestData[1] || [];
      }
      console.log(`Google suggestions: ${googleSuggestions.length}`);
    } catch (e) {
      console.error("Google Suggest error:", e);
    }

    // Step 2: Firecrawl SERP scraping
    let serpResults: any[] = [];
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (firecrawlKey) {
      try {
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: trimmedKeyword,
            limit: 10,
            lang: language,
            country: language === "id" ? "ID" : "US",
          }),
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          serpResults = (searchData.data || []).map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
            description: r.description || "",
          }));
        }
        console.log(`SERP results: ${serpResults.length}`);
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Step 3: AI Analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert SEO keyword analyst. Analyze the given seed keyword, Google autocomplete suggestions, and SERP competitor data. Return structured analysis using the tool provided.

Rules:
- Score potentialScore from 1-100 (100 = highest potential)
- searchVolume: estimate as "tinggi", "sedang", or "rendah"
- competition: "rendah", "sedang", or "tinggi"
- intent: "informational", "transactional", "navigational", or "commercial"
- Generate at least 3 keyword clusters with 3-5 keywords each
- Generate 10-20 long-tail keyword variations
- For SERP analysis, identify content gaps (topics competitors miss)
- All analysis text should be in ${language === "id" ? "Bahasa Indonesia" : "English"}`;

    const userPrompt = `Seed keyword: "${trimmedKeyword}"

Google Autocomplete Suggestions:
${googleSuggestions.length > 0 ? googleSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") : "No suggestions available"}

SERP Competitor Data (Top 10):
${serpResults.length > 0 ? serpResults.map((r, i) => `${i + 1}. ${r.title} - ${r.url}\n   ${r.description}`).join("\n") : "No SERP data available"}

Analyze this keyword and provide comprehensive keyword research data.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "keyword_analysis",
              description: "Return structured keyword research analysis",
              parameters: {
                type: "object",
                properties: {
                  overview: {
                    type: "object",
                    properties: {
                      searchVolume: { type: "string", enum: ["tinggi", "sedang", "rendah"] },
                      competition: { type: "string", enum: ["rendah", "sedang", "tinggi"] },
                      intent: { type: "string", enum: ["informational", "transactional", "navigational", "commercial"] },
                      potentialScore: { type: "number" },
                      summary: { type: "string" },
                    },
                    required: ["searchVolume", "competition", "intent", "potentialScore", "summary"],
                  },
                  keywordSuggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        intent: { type: "string" },
                        competition: { type: "string", enum: ["rendah", "sedang", "tinggi"] },
                        potentialScore: { type: "number" },
                      },
                      required: ["keyword", "intent", "competition", "potentialScore"],
                    },
                  },
                  clusters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        keywords: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              keyword: { type: "string" },
                              potentialScore: { type: "number" },
                            },
                            required: ["keyword", "potentialScore"],
                          },
                        },
                      },
                      required: ["name", "keywords"],
                    },
                  },
                  serpAnalysis: {
                    type: "object",
                    properties: {
                      competitors: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            url: { type: "string" },
                            strengths: { type: "string" },
                            weaknesses: { type: "string" },
                          },
                          required: ["title", "url"],
                        },
                      },
                      contentGaps: {
                        type: "array",
                        items: { type: "string" },
                      },
                      opportunities: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["competitors", "contentGaps", "opportunities"],
                  },
                },
                required: ["overview", "keywordSuggestions", "clusters", "serpAnalysis"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "keyword_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, coba lagi nanti." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Credit habis, tambahkan credit di workspace Lovable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        keyword: trimmedKeyword,
        language,
        googleSuggestions,
        ...analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Keyword research error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
