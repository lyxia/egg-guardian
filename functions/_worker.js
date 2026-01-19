export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route /api/* to Worker
    if (url.pathname.startsWith('/api')) {
      return env.API.fetch(request);
    }

    // All other requests return 404 (handled by Pages)
    return new Response('Not Found', { status: 404 });
  }
};
