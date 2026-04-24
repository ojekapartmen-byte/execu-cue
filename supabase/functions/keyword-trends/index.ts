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
    const { keyword, language = "id", geo } = await req.json();

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Keyword is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedKeyword = keyword.trim();
    const country = geo || (language === "id" ? "ID" : "US");
    console.log(`Keyword trends for: "${trimmedKeyword}" (lang: ${language}, geo: ${country})`);

    // Step 1: Pull live signals (Google Autocomplete + News SERP via Firecrawl)
    let googleSuggestions: string[] = [];
    try {
      const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmedKeyword)}&hl=${language}`;
      const r = await fetch(suggestUrl);
      if (r.ok) {
        const data = await r.json();
        googleSuggestions = data[1] || [];
      }
    } catch (e) {
      console.error("Suggest error:", e);
    }

    let newsResults: { title: string; url: string; description: string }[] = [];
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
            query: `${trimmedKeyword} trending news`,
            limit: 10,
            lang: language,
            country,
            tbs: "qdr:w", // last week — for trend signal
          }),
        });
        if (searchRes.ok) {
          const sd = await searchRes.json();
          newsResults = (sd.data || []).map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
            description: r.description || "",
          }));
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Step 2: AI synthesis -> structured trend output
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langText = language === "id" ? "Bahasa Indonesia" : "English";
    const systemPrompt = `You are an expert SEO trend analyst. Given a seed keyword and live signals (autocomplete + recent news), infer trending related queries.
Rules:
- Return 10-15 trending keywords related to the seed.
- "interest" is 0-100 (relative momentum, 100 = hottest right now).
- "rising" = true if the keyword shows breakout/recent surge, false if stable evergreen.
- "category" one of: "breakout", "rising", "stable", "seasonal".
- Provide a short "summary" (1-2 sentences) describing the overall trend direction.
- Provide 3-5 "relatedTopics" (broader topics gaining traction around this keyword).
- All text in ${langText}.`;

    const userPrompt = `Seed keyword: "${trimmedKeyword}"
Country: ${country}

Google Autocomplete:
${googleSuggestions.length ? googleSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") : "(none)"}

Recent News (last 7 days):
${newsResults.length ? newsResults.map((r, i) => `${i + 1}. ${r.title} — ${r.description}`).join("\n") : "(none)"}

Analyze trend momentum and return structured data.`;

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
              name: "trend_analysis",
              description: "Return trending keyword analysis",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  trends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        keyword: { type: "string" },
                        interest: { type: "number" },
                        rising: { type: "boolean" },
                        category: { type: "string", enum: ["breakout", "rising", "stable", "seasonal"] },
                      },
                      required: ["keyword", "interest", "rising", "category"],
                    },
                  },
                  relatedTopics: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["summary", "trends", "relatedTopics"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "trend_analysis" } },
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
      throw new Error("AI trend analysis failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        keyword: trimmedKeyword,
        language,
        geo: country,
        googleSuggestions,
        newsCount: newsResults.length,
        ...analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Keyword trends error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});