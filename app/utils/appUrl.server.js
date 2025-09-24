/**
 * Utility function to dynamically determine the app URL based on the request
 * This is especially useful for Vercel deployments where the URL can be dynamic
 */
export function getAppUrl(request) {
  try {
    // If we have a configured app URL, use it
    if (process.env.SHOPIFY_APP_URL) {
      return process.env.SHOPIFY_APP_URL;
    }
    
    // Otherwise, try to determine it from the request
    if (request) {
      const url = new URL(request.url);
      // Return the origin (protocol + host) which should work for Vercel deployments
      return `${url.protocol}//${url.host}`;
    }
    
    // Fallback to a default for development
    return "http://localhost:3000";
  } catch (error) {
    console.error("Error determining app URL:", error);
    // Return a safe fallback
    return "http://localhost:3000";
  }
}