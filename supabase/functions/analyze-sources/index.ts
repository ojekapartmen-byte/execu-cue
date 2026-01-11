import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SourceInput {
  url: string;
}

interface AnalyzedArticle {
  url: string;
  headline: string;
  category: string;
  subCategory?: string;
  sourceName: string;
  summary?: string;
}

// Extract domain name from URL
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    // Capitalize first letter
    const parts = domain.split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return "Unknown";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sources } = await req.json() as { sources: SourceInput[] };
    
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No sources provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${sources.length} sources...`);

    // Step 1: Scrape all URLs using Firecrawl
    const scrapedContents: { url: string; content: string; title: string }[] = [];

    for (const source of sources) {
      try {
        console.log(`Scraping: ${source.url}`);
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
          const title = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || '';
          
          scrapedContents.push({
            url: source.url,
            content: markdown.substring(0, 3000), // Limit content length
            title: title,
          });
          console.log(`Scraped successfully: ${source.url}`);
        } else {
          console.error(`Failed to scrape ${source.url}: ${scrapeResponse.status}`);
          scrapedContents.push({
            url: source.url,
            content: '',
            title: `Article from ${extractDomain(source.url)}`,
          });
        }
      } catch (error) {
        console.error(`Error scraping ${source.url}:`, error);
        scrapedContents.push({
          url: source.url,
          content: '',
          title: `Article from ${extractDomain(source.url)}`,
        });
      }
    }

    // Step 2: Use AI to categorize all articles
    const articlesForAnalysis = scrapedContents.map((item, index) => ({
      index,
      url: item.url,
      title: item.title,
      content_preview: item.content.substring(0, 1500),
    }));

    const systemPrompt = `Kamu adalah analis berita Indonesia yang ahli. Tugasmu adalah mengategorikan berita ke dalam kategori yang tepat.

Kategori utama yang tersedia:
- Politik Nasional (berita politik dalam negeri, pemerintahan, DPR, partai politik)
- Hukum (berita hukum, pengadilan, kasus korupsi, penegakan hukum)
- Ekonomi (berita ekonomi, keuangan, perbankan, pasar modal, inflasi)
- BUMN/Korporasi (berita perusahaan, BUMN, bisnis korporat)
- Internasional (berita luar negeri)

Untuk kategori Internasional, tambahkan subkategori jika relevan:
- Konflik Timur Tengah
- Hubungan Bilateral
- Politik Global
- Ekonomi Global

Berikan respons dalam format JSON array dengan struktur berikut untuk setiap artikel:
{
  "index": number,
  "headline": "judul berita yang ringkas dan informatif dalam Bahasa Indonesia",
  "category": "salah satu dari kategori di atas",
  "subCategory": "subkategori jika Internasional, null jika bukan"
}

PENTING: Hanya gunakan konten yang disediakan. Jangan menambahkan sumber lain.`;

    const userPrompt = `Analisis dan kategorikan artikel-artikel berita berikut:

${JSON.stringify(articlesForAnalysis, null, 2)}

Berikan respons dalam format JSON array.`;

    console.log('Calling AI for categorization...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received');

    // Parse AI response
    let categorizedArticles: { index: number; headline: string; category: string; subCategory?: string }[] = [];
    
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        categorizedArticles = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // Step 3: Build the analyzed articles response
    const analyzedArticles: AnalyzedArticle[] = scrapedContents.map((scraped, index) => {
      const aiResult = categorizedArticles.find(a => a.index === index);
      
      return {
        url: scraped.url,
        headline: aiResult?.headline || scraped.title || `Article from ${extractDomain(scraped.url)}`,
        category: aiResult?.category || 'Uncategorized',
        subCategory: aiResult?.subCategory || undefined,
        sourceName: extractDomain(scraped.url),
      };
    });

    console.log(`Successfully analyzed ${analyzedArticles.length} articles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        articles: analyzedArticles 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-sources:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
