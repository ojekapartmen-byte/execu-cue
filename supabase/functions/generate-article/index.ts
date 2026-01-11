import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Style example untuk referensi AI
const ARTICLE_STYLE_EXAMPLE = `
CONTOH GAYA PENULISAN ARTIKEL:

# Titik Terendah dalam Hidup Bukan Akhir, Menurut Pak Arsjad Justru Awal Kebangkitan Baru

Hampir setiap orang pasti pernah berada di titik terendah dalam hidup. Fase di mana semua kegagalan seolah berjumpa satu sama lain hingga harapan yang terasa jauh. Hal ini kadang dipandang sebagai sesuatu yang buruk bahkan akhir dari segalanya. Namun, justru di momen inilah sebenarnya kebangkitan terjadi.

Seperti yang diungkapkan Arsjad Rasjid dalam sebuah postingan Instagram, titik terendah dalam hidup adalah fondasi untuk membangun kehidupan yang lebih baik setelah ini. Transformasi besar seringnya terjadi setelah sistem lama yang sudah tidak mendukung pertumbuhan runtuh.

# Titik terendah dalam hidup karena berbagai kegagalan

Titik terendah dalam hidup biasanya tidak terjadi karena satu hal saja, melainkan karena akumulasi kegagalan yang datang bertubi-tubi. Menciptakan efek domino yang memengaruhi berbagai sisi kehidupan.

CIRI-CIRI GAYA PENULISAN:
1. Menggunakan sudut pandang orang ketiga
2. Menyebutkan nama tokoh utama secara eksplisit
3. Paragraf pendek dan mudah dibaca
4. Menggunakan sub-heading untuk setiap topik
5. Gaya bahasa profesional seperti artikel news
6. Menghubungkan dengan insight praktis
7. Menggunakan kutipan atau referensi dari tokoh
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, category, sourceLinks } = await req.json();

    if (!topic || !category || !sourceLinks?.length) {
      return new Response(
        JSON.stringify({ error: 'Topic, category, dan source links diperlukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Scrape source links using Firecrawl
    let scrapedContent: string[] = [];
    
    if (FIRECRAWL_API_KEY) {
      console.log('Scraping source links with Firecrawl...');
      
      for (const url of sourceLinks) {
        try {
          let formattedUrl = url.trim();
          if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `https://${formattedUrl}`;
          }

          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: formattedUrl,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            const markdown = scrapeData.data?.markdown || scrapeData.markdown;
            if (markdown) {
              scrapedContent.push(`=== SUMBER: ${formattedUrl} ===\n${markdown.substring(0, 3000)}`);
              console.log(`Successfully scraped: ${formattedUrl}`);
            }
          } else {
            console.error(`Failed to scrape ${formattedUrl}:`, await scrapeResponse.text());
          }
        } catch (scrapeError) {
          console.error(`Error scraping ${url}:`, scrapeError);
        }
      }
    } else {
      console.log('Firecrawl not configured, proceeding with AI browsing capability');
    }

    // Category descriptions for AI prompt
    const categoryDescriptions = {
      mentor: "seorang mentor/pembimbing yang berbagi pengalaman dan pembelajaran hidup, memberikan nasihat bijak berdasarkan pengalaman nyata",
      investor: "seorang investor yang melihat peluang bisnis, strategi investasi, dan perspektif finansial yang tajam",
      leader: "seorang pemimpin yang menginspirasi, memotivasi tim, dan memberikan visi kepemimpinan yang kuat"
    };

    const categoryContext = categoryDescriptions[category as keyof typeof categoryDescriptions] || categoryDescriptions.mentor;

    // Build the prompt
    const systemPrompt = `Kamu adalah penulis artikel profesional berbahasa Indonesia dengan gaya penulisan news artikel yang berkualitas tinggi.

INSTRUKSI PENTING:
1. Tulis artikel dengan SUDUT PANDANG ORANG KETIGA - jangan gunakan "saya" atau "kita", gunakan nama tokoh atau "ia/beliau"
2. Gaya penulisan: profesional, seperti artikel berita/news yang berkualitas
3. Kategori artikel: ${category.toUpperCase()} - tulis dari perspektif ${categoryContext}
4. Gunakan struktur:
   - Judul utama yang menarik
   - Paragraf pembuka yang kuat
   - Beberapa sub-heading untuk setiap poin penting
   - Paragraf pendek (2-4 kalimat per paragraf)
   - Kesimpulan atau call-to-action di akhir
5. REWRITE konten dari sumber dengan gaya baru, JANGAN copy paste
6. Tambahkan insight dan perspektif yang relevan dengan kategori ${category}
7. Minimal 500 kata, maksimal 1000 kata

${ARTICLE_STYLE_EXAMPLE}

JANGAN gunakan sumber contoh style di atas sebagai konten, itu hanya referensi gaya penulisan.`;

    let userPrompt = `Buatkan artikel profesional tentang topik: "${topic}"

Kategori: ${category.toUpperCase()}
Perspektif penulisan: ${categoryContext}`;

    if (scrapedContent.length > 0) {
      userPrompt += `

KONTEN DARI SUMBER REFERENSI (rewrite dengan gaya sendiri, jangan copy paste):
${scrapedContent.join('\n\n')}`;
    } else {
      userPrompt += `

Link sumber referensi (gunakan untuk browsing): ${sourceLinks.join(', ')}

Silakan browsing dan riset topik ini untuk mendapatkan informasi yang akurat, kemudian tulis artikel dengan gaya profesional.`;
    }

    console.log('Generating article with AI...');

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Silakan coba lagi nanti.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Kredit AI habis. Silakan top up kredit Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const article = aiData.choices?.[0]?.message?.content;

    if (!article) {
      throw new Error('No article content generated');
    }

    console.log('Article generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        article,
        sourceCount: scrapedContent.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating article:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate article' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
