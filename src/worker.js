export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/landing' || url.pathname === '/landing.html') {
      url.pathname = '/';
      request = new Request(url, request);
    }
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (response.headers.get('Content-Type')?.includes('text/html')) {
      response.headers.set('Link', '</>; rel="canonical"');
    }
    return response;
  }
};