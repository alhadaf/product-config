import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

// Mock data for decoration options - in a real implementation, this would fetch from Shopify
const mockDecorations = [
  { 
    id: "screenprint", 
    name: "Screenprint", 
    description: "Your design is applied directly onto the products' surface by pushing ink through a fine mesh screen. This is one of our most popular decoration methods." 
  },
  { 
    id: "embroidery", 
    name: "Embroidery", 
    description: "Your design is stitched with thread for a premium, durable finish that's ideal for hats, polos, and thicker fabrics." 
  }
];

export const loader = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    
    if (!productId) {
      return json({ success: false, error: "Product ID is required" });
    }

    // In a real implementation, you would fetch decorations from Shopify using the product ID
    // For now, we'll return mock data
    console.log(`Fetching decorations for product ID: ${productId}`);
    
    return json({ 
      success: true, 
      decorations: mockDecorations 
    });
  } catch (error) {
    console.error('Error fetching decorations:', error);
    return json({ 
      success: false, 
      error: "Failed to fetch decoration options" 
    });
  }
};

export const action = () => new Response("Method Not Allowed", { status: 405 });