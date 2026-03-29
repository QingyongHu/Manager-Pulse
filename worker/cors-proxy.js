// Cloudflare Worker: CORS Proxy for 智谱 GLM API
// Deploy: wrangler deploy
// Config: wrangler.toml

const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4'

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      })
    }

    // Only allow POST to /chat/completions
    const url = new URL(request.url)
    const targetUrl = ZHIPU_API_BASE + url.pathname

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: request.body,
      })

      const data = await response.json()

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      })
    }
  },
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
