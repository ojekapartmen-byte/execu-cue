import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, content } = await req.json()

    const wpUrl = Deno.env.get('WP_URL')?.replace(/\/$/, '')
    const wpUsername = Deno.env.get('WP_USERNAME')
    const wpAppPassword = Deno.env.get('WP_APPLICATION_PASSWORD')

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      throw new Error('Konfigurasi WordPress di Secrets Supabase belum lengkap.')
    }

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
        status: 'draft',
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

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Function Error:', msg)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
