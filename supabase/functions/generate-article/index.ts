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
  /** Instruksi kategori/persona lengkap dari database (dinamis). */
  categoryPrompt: string;
  scrapedContent: string[];
  sourceLinks: string[];
  sourceImages: { name: string; base64?: string }[];
  seoSettings?: { keywords?: string; writingStyle?: string; tone?: string; language?: string };
  apiKey: string;
}): Promise<string> {
  const { topic, categoryPrompt, scrapedContent, sourceLinks, sourceImages, seoSettings, apiKey } = params;

  const catBlock = categoryPrompt.trim();

  const writingStyleDescriptions: Record<string, string> = {
    'journalistic': 'profesional seperti artikel berita berkualitas, objektif, dan informatif',
    'blog-friendly': 'santai, mudah dibaca, conversational namun tetap informatif',
    'academic': 'formal, berbasis riset, dengan referensi dan argumentasi yang kuat',
    'storytelling': 'naratif yang engaging, menggunakan teknik bercerita untuk menyampaikan pesan'
  };

  const toneDescriptions: Record<string, string> = {
    'professional': 'formal dan kredibel, menjaga otoritas dan kepercayaan pembaca',
    'friendly': 'ramah dan approachable, seperti berbicara dengan teman',
    'formal': 'sangat resmi dan baku, menggunakan bahasa formal Indonesia',
    'inspirational': 'memotivasi dan menginspirasi, membangkitkan semangat pembaca'
  };

  const writingStyle = seoSettings?.writingStyle || 'journalistic';
  const tone = seoSettings?.tone || 'professional';
  const keywords = seoSettings?.keywords || '';
  const language = seoSettings?.language || 'id';
  const isEnglish = language === 'en';

  const writingStyleContext = writingStyleDescriptions[writingStyle] || writingStyleDescriptions['journalistic'];
  const toneContext = toneDescriptions[tone] || toneDescriptions['professional'];

  const systemPrompt = isEnglish
    ? `You are a professional English article writer, expert in SEO and content writing.

IMPORTANT INSTRUCTIONS:
1. Write the article in THIRD PERSON perspective - do not use "I" or "we", use the person's name or "he/she/they"
2. Category / persona / voice (from database — follow strictly):
${catBlock}
3. Use this structure:
   - An engaging main title containing the primary keyword
   - A strong opening paragraph (suitable as meta description)
   - Multiple sub-headings (H2, H3) for each key point
   - Short paragraphs (2-4 sentences per paragraph)
   - A conclusion or call-to-action at the end
4. REWRITE content from sources in your own style, DO NOT copy paste
5. Add insights and perspectives aligned with the category instructions above
6. Minimum 500 words, maximum 1000 words

SEO OPTIMIZATION:
- Target Keywords: ${keywords || 'based on topic'}
- Writing Style: ${writingStyle} - ${writingStyleContext}
- Tone: ${tone} - ${toneContext}

SEO INSTRUCTIONS:
1. Use keywords NATURALLY in the title, sub-headings, and first paragraph
2. Optimal keyword density 1-2% (don't overdo it)
3. Use relevant keyword variations (LSI keywords)
4. Make the opening paragraph suitable as a meta description (first 150-160 characters must be compelling)
5. SEO-friendly heading structure (H1 for main title, H2 for sub-topics)
6. Use internal linking keywords if relevant`
    : `Kamu adalah penulis artikel profesional berbahasa Indonesia yang ahli dalam SEO dan content writing.

INSTRUKSI PENTING:
1. Tulis artikel dengan SUDUT PANDANG ORANG KETIGA - jangan gunakan "saya" atau "kita", gunakan nama tokoh atau "ia/beliau"
2. Kategori / persona / suara penulisan (dari database — ikuti persis):
${catBlock}
3. Gunakan struktur:
   - Judul utama yang menarik dan mengandung keyword utama
   - Paragraf pembuka yang kuat (bisa dijadikan meta description)
   - Beberapa sub-heading (H2, H3) untuk setiap poin penting
   - Paragraf pendek (2-4 kalimat per paragraf)
   - Kesimpulan atau call-to-action di akhir
4. REWRITE konten dari sumber dengan gaya baru, JANGAN copy paste
5. Tambahkan insight dan perspektif yang selaras dengan instruksi kategori di atas
6. Minimal 500 kata, maksimal 1000 kata

SEO OPTIMIZATION:
- Target Keywords: ${keywords || 'sesuai dengan topik'}
- Writing Style: ${writingStyle} - ${writingStyleContext}
- Tone: ${tone} - ${toneContext}

INSTRUKSI SEO:
1. Gunakan keywords secara NATURAL di judul, sub-heading, dan paragraf pertama
2. Keyword density optimal 1-2% (jangan berlebihan)
3. Gunakan variasi kata kunci (LSI keywords) yang relevan
4. Buat paragraf pembuka yang bisa dijadikan meta description (150-160 karakter pertama harus menarik)
5. Struktur heading yang SEO-friendly (H1 untuk judul utama, H2 untuk sub-topik)
6. Gunakan internal linking keywords jika relevan

${ARTICLE_STYLE_EXAMPLE}

JANGAN gunakan sumber contoh style di atas sebagai konten, itu hanya referensi gaya penulisan.`;

  let userPrompt = isEnglish
    ? `Create a professional SEO-friendly article about: "${topic}"

Follow the category/persona instructions in the system message.
Writing style: ${writingStyle} (${writingStyleContext})
Tone: ${tone} (${toneContext})
${keywords ? `Target Keywords: ${keywords}` : ''}`
    : `Buatkan artikel profesional SEO-friendly tentang topik: "${topic}"

Ikuti instruksi kategori/persona pada system message.
Gaya penulisan: ${writingStyle} (${writingStyleContext})
Tone: ${tone} (${toneContext})
${keywords ? `Target Keywords: ${keywords}` : ''}`;

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
      categoryPrompt,
      sourceLinks,
      sourceImages,
      seoSettings,
    } = await req.json();

    const categoryPromptStr =
      typeof categoryPrompt === 'string' ? categoryPrompt.trim() : '';

    if (!topic || !categoryPromptStr) {
      return new Response(
        JSON.stringify({ error: 'Topic dan categoryPrompt diperlukan' }),
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
      categoryPrompt: categoryPromptStr,
      scrapedContent,
      sourceLinks,
      sourceImages,
      seoSettings,
      apiKey: LOVABLE_API_KEY,
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
