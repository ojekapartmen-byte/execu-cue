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
    const { keywords, persona, contentGoal, frequency, tone, language = "id" } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "Keywords array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const postsPerWeek = frequency === "daily" ? 7 : frequency === "3x/week" ? 3 : 2;
    const totalPosts = postsPerWeek * 4;

    const systemPrompt = `You are an expert content strategist. Generate a 1-month content calendar based on the provided keywords, persona, and goals. Return structured data using the tool provided.

Rules:
- Generate exactly ${totalPosts} content items spread across 4 weeks
- Each item must target one of the provided keywords
- Vary content types and angles
- Write compelling titles optimized for SEO
- Content briefs should be 2-3 sentences describing the article angle
- Dates should start from today and be spaced according to the frequency
- All text must be in ${language === "id" ? "Bahasa Indonesia" : "English"}
- Tone: ${tone || "professional"}
- Target persona: ${persona || "general audience"}
- Content goal: ${contentGoal || "informasi dan edukasi"}`;

    const userPrompt = `Keywords to target:
${keywords.map((k: string, i: number) => `${i + 1}. ${k}`).join("\n")}

Persona: ${persona || "General audience"}
Content Goal: ${contentGoal || "Informasi dan edukasi"}
Frequency: ${frequency || "2x/week"} (${totalPosts} posts in 1 month)
Tone: ${tone || "Professional"}

Generate a structured 1-month content calendar.`;

    const today = new Date();
    
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
              name: "content_calendar",
              description: "Return a structured content calendar",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        targetKeyword: { type: "string" },
                        keywords: { type: "array", items: { type: "string" } },
                        contentBrief: { type: "string" },
                        dayOffset: { type: "number", description: "Days from today (0-30)" },
                      },
                      required: ["title", "targetKeyword", "keywords", "contentBrief", "dayOffset"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "content_calendar" } },
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
      throw new Error("AI calendar generation failed");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const calendarData = JSON.parse(toolCall.function.arguments);

    // Map dayOffset to actual dates
    const items = calendarData.items.map((item: any) => {
      const date = new Date(today);
      date.setDate(date.getDate() + (item.dayOffset || 0));
      return {
        title: item.title,
        target_keyword: item.targetKeyword,
        keywords: item.keywords,
        content_brief: item.contentBrief,
        scheduled_date: date.toISOString().split("T")[0],
        persona: persona || null,
        tone: tone || null,
        content_goal: contentGoal || null,
        frequency: frequency || "2x/week",
        status: "draft",
      };
    });

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Calendar generation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
