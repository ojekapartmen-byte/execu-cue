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

// Scrape content using Firecrawl
async function scrapeWithFirecrawl(sourceLinks: string[], apiKey: string): Promise<string[]> {
  const scrapedContent: string[] = [];
  
  for (const url of sourceLinks) {
    try {
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
  
  return scrapedContent;
}

// Generate article using Lovable AI
async function generateWithLovableAI(params: {
  topic: string;
  category: string;
  scrapedContent: string[];
  sourceLinks: string[];
  sourceImages: { name: string; base64?: string }[];
  apiKey: string;
}): Promise<string> {
  const { topic, category, scrapedContent, sourceLinks, sourceImages, apiKey } = params;
  
  const categoryDescriptions: Record<string, string> = {
    mentor: "seorang mentor/pembimbing yang berbagi pengalaman dan pembelajaran hidup, memberikan nasihat bijak berdasarkan pengalaman nyata",
    investor: "seorang investor yang melihat peluang bisnis, strategi investasi, dan perspektif finansial yang tajam",
    leader: "seorang pemimpin yang menginspirasi, memotivasi tim, dan memberikan visi kepemimpinan yang kuat"
  };

  const categoryContext = categoryDescriptions[category] || categoryDescriptions.mentor;

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
  } else if (sourceLinks && sourceLinks.length > 0) {
    userPrompt += `

Link sumber referensi (gunakan untuk browsing): ${sourceLinks.join(', ')}

Silakan browsing dan riset topik ini untuk mendapatkan informasi yang akurat, kemudian tulis artikel dengan gaya profesional.`;
  }

  // Process source images for AI vision
  const imageContents: { type: string; image_url: { url: string } }[] = [];
  const imageDescriptions: string[] = [];
  
  if (sourceImages && sourceImages.length > 0) {
    for (const img of sourceImages) {
      if (img.base64) {
        imageContents.push({
          type: "image_url",
          image_url: { url: img.base64 }
        });
        imageDescriptions.push(`- Gambar: ${img.name}`);
      }
    }
    
    if (imageDescriptions.length > 0) {
      userPrompt += `

GAMBAR SUMBER YANG DIUPLOAD:
${imageDescriptions.join('\n')}

Analisis gambar-gambar yang diupload di atas. Ekstrak informasi penting, teks, data, atau insight dari gambar tersebut untuk dijadikan bahan penulisan artikel.`;
    }
  }

  // Build message content - text only or multimodal
  let userContent: string | { type: string; text?: string; image_url?: { url: string } }[];
  
  if (imageContents.length > 0) {
    userContent = [
      { type: "text", text: userPrompt },
      ...imageContents
    ];
  } else {
    userContent = userPrompt;
  }

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('AI API error:', aiResponse.status, errorText);
    
    if (aiResponse.status === 429) {
      throw new Error('Rate limit exceeded. Silakan coba lagi nanti.');
    }
    if (aiResponse.status === 402) {
      throw new Error('Kredit AI habis. Silakan top up kredit Lovable AI.');
    }
    
    throw new Error(`AI API error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const article = aiData.choices?.[0]?.message?.content;

  if (!article) {
    throw new Error('No article content generated');
  }

  return article;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      category, 
      sourceLinks, 
      sourceImages
    } = await req.json();

    if (!topic || !category) {
      return new Response(
        JSON.stringify({ error: 'Topic dan category diperlukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasLinks = sourceLinks && sourceLinks.length > 0;
    const hasImages = sourceImages && sourceImages.length > 0;

    if (!hasLinks && !hasImages) {
      return new Response(
        JSON.stringify({ error: 'Minimal satu link sumber atau gambar diperlukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scrape source links using Firecrawl
    let scrapedContent: string[] = [];
    
    if (FIRECRAWL_API_KEY && hasLinks) {
      console.log('Scraping source links with Firecrawl...');
      scrapedContent = await scrapeWithFirecrawl(sourceLinks, FIRECRAWL_API_KEY);
    } else if (hasLinks) {
      console.log('Firecrawl not configured, proceeding with AI browsing capability');
    }

    console.log('Using Lovable AI for article generation...');

    const article = await generateWithLovableAI({
      topic,
      category,
      scrapedContent,
      sourceLinks,
      sourceImages,
      apiKey: LOVABLE_API_KEY
    });

    console.log('Article generated successfully with Lovable AI');

    return new Response(
      JSON.stringify({ 
        success: true, 
        article,
        generator: 'lovable-ai',
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
