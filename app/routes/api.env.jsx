import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  // This is a public endpoint for debugging environment variables
  // In a production app, you should protect this or remove it
  
  const envVars = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "SET" : "NOT SET",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "SET" : "NOT SET",
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "NOT SET",
    SHOP_CUSTOM_DOMAIN: process.env.SHOP_CUSTOM_DOMAIN || "NOT SET",
    SCOPES: process.env.SCOPES || "NOT SET",
    NODE_ENV: process.env.NODE_ENV || "NOT SET",
  };

  return json({
    success: true,
    env: envVars,
    headers: Object.fromEntries(request.headers.entries())
  });
};

export const action = () => new Response("Method Not Allowed", { status: 405 });