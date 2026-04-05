import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, content } = await req.json()

    // Ambil Secret yang tadi kamu set lewat CLI
    const wpUrl = Deno.env.get('WP_URL')?.replace(/\/$/, '') // Bersihkan garis miring akhir
    const wpUsername = Deno.env.get('WP_USERNAME')
    const wpAppPassword = Deno.env.get('WP_APPLICATION_PASSWORD')

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      throw new Error('Konfigurasi WordPress di Secrets Supabase belum lengkap.')
    }

    // AUTHENTICATION: WordPress butuh Basic Auth (user:pass di-encode ke Base64)
    const authString = btoa(`${wpUsername}:${wpAppPassword}`)

    console.log(`Mencoba kirim ke: ${wpUrl}/wp-json/wp/v2/posts`)

    const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        title: title,
        content: content,
        status: 'draft', // Selalu simpan sebagai draft dulu agar aman
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('WP API Error Details:', result)
      throw new Error(result.message || 'Gagal terhubung ke WordPress API')
    }

    return new Response(
      JSON.stringify({ success: true, link: result.link }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Function Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})