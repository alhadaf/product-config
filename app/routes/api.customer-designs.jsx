import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { listCustomerDesigns } from "../utils/customerDesigns.server";

export const loader = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    // In a real implementation, you would get the customer ID from the session
    // For now, we'll use a placeholder or get it from query parameters
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    const customerEmail = url.searchParams.get("customerEmail");
    
    // Fetch customer designs
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (customerEmail) filter.customerEmail = customerEmail;
    
    const result = await listCustomerDesigns(filter);
    
    if (!result.success) {
      return json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
    
    // Return only the necessary design information for the frontend
    const designs = result.designs.map(design => ({
      id: design.id,
      designName: design.designName,
      productId: design.productId,
      productTitle: design.productTitle,
      decorationType: design.decorationType,
      status: design.status,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt
    }));
    
    return json({ 
      success: true, 
      designs: designs
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