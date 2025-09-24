import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    // For now, we'll return mock data to ensure the endpoint works
    // In a real implementation, you would connect to your database to fetch actual designs
    
    const mockDesigns = [
      {
        id: "design-1",
        designName: "Summer T-Shirt Design",
        productId: "gid://shopify/Product/12345",
        productTitle: "Classic Cotton T-Shirt",
        decorationType: "Screen Print",
        status: "approved",
        createdAt: "2023-06-15T10:30:00Z",
        updatedAt: "2023-06-16T14:45:00Z"
      },
      {
        id: "design-2",
        designName: "Logo Embroidery",
        productId: "gid://shopify/Product/12346",
        productTitle: "Premium Polo Shirt",
        decorationType: "Embroidery",
        status: "pending",
        createdAt: "2023-06-18T09:15:00Z",
        updatedAt: "2023-06-18T09:15:00Z"
      }
    ];
    
    return json({ 
      success: true, 
      designs: mockDesigns
    });
  } catch (error) {
    console.error("Error fetching customer designs:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to fetch customer designs" 
    }, { status: 500 });
  }
};

export const action = () => new Response("Method Not Allowed", { status: 405 });