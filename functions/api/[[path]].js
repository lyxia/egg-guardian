/**
 * Cloudflare Pages Function to proxy all /api/* requests to the Worker
 * This file handles all routes under /api/ and forwards them to the egg-guardian-api Worker
 */

export async function onRequest(context) {
  // Forward the request to the Worker via Service Binding
  try {
    return await context.env.API.fetch(context.request);
  } catch (error) {
    console.error('Error forwarding request to Worker:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Failed to connect to API service'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
