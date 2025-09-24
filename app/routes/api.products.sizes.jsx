import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

// Mock data for product sizes - in a real implementation, this would fetch from Shopify
const mockSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export const loader = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    
    if (!productId) {
      return json({ success: false, error: "Product ID is required" });
    }

    // In a real implementation, you would fetch sizes from Shopify using the product ID
    // For now, we'll return mock data
    console.log(`Fetching sizes for product ID: ${productId}`);
    
    return json({ 
      success: true, 
      sizes: mockSizes 
    });
  } catch (error) {
    console.error('Error fetching sizes:', error);
    return json({ 
      success: false, 
      error: "Failed to fetch product sizes" 
    });
  }
};

export const action = () => new Response("Method Not Allowed", { status: 405 });