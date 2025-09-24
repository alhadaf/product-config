import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { createCustomerDesign, getCustomerDesign, updateCustomerDesign, listCustomerDesigns, deleteCustomerDesign } from "../utils/customerDesigns.server";

export const action = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case "create": {
        // Create a new draft design
        const result = await createCustomerDesign({
          customerId: data.customerId,
          customerEmail: data.customerEmail,
          productId: data.productId,
          productTitle: data.productTitle,
          designName: data.designName,
          decorationType: data.decorationType || "Screenprint",
          status: "draft",
          notes: data.notes || null,
          transforms: data.transforms || null,
          quantities: data.quantities || null,
        });
        
        if (!result.success) {
          return json({ 
            success: false, 
            error: result.error 
          }, { status: 400 });
        }
        
        return json({ 
          success: true, 
          design: result.design,
          message: "Draft saved successfully"
        });
      }
      
      case "update": {
        // Update an existing draft design
        if (!data.id) {
          return json({ 
            success: false, 
            error: "Design ID is required for update" 
          }, { status: 400 });
        }
        
        const result = await updateCustomerDesign(data.id, {
          customerId: data.customerId,
          customerEmail: data.customerEmail,
          productId: data.productId,
          productTitle: data.productTitle,
          designName: data.designName,
          decorationType: data.decorationType,
          status: data.status,
          notes: data.notes,
          transforms: data.transforms,
          quantities: data.quantities,
          frontFileId: data.frontFileId,
          backFileId: data.backFileId,
          leftFileId: data.leftFileId,
          rightFileId: data.rightFileId,
        });
        
        if (!result.success) {
          return json({ 
            success: false, 
            error: result.error 
          }, { status: 400 });
        }
        
        return json({ 
          success: true, 
          design: result.design,
          message: "Draft updated successfully"
        });
      }
      
      case "delete": {
        // Delete a draft design
        if (!data.id) {
          return json({ 
            success: false, 
            error: "Design ID is required for deletion" 
          }, { status: 400 });
        }
        
        const result = await deleteCustomerDesign(data.id);
        
        if (!result.success) {
          return json({ 
            success: false, 
            error: result.error 
          }, { status: 400 });
        }
        
        return json({ 
          success: true, 
          message: "Draft deleted successfully"
        });
      }
      
      default:
        return json({ 
          success: false, 
          error: "Invalid action specified" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Error handling draft design:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to handle draft design" 
    }, { status: 500 });
  }
};

export const loader = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "list";
    const id = url.searchParams.get("id");
    const customerId = url.searchParams.get("customerId");
    const customerEmail = url.searchParams.get("customerEmail");
    
    switch (action) {
      case "get": {
        // Get a specific draft design
        if (!id) {
          return json({ 
            success: false, 
            error: "Design ID is required" 
          }, { status: 400 });
        }
        
        const result = await getCustomerDesign(id);
        
        if (!result.success) {
          return json({ 
            success: false, 
            error: result.error 
          }, { status: 404 });
        }
        
        return json({ 
          success: true, 
          design: result.design
        });
      }
      
      case "list": {
        // List draft designs for a customer
        if (!customerId && !customerEmail) {
          return json({ 
            success: false, 
            error: "Customer ID or email is required" 
          }, { status: 400 });
        }
        
        const filters = {
          status: "draft"
        };
        
        if (customerId) filters.customerId = customerId;
        if (customerEmail) filters.customerEmail = customerEmail;
        
        const result = await listCustomerDesigns(filters);
        
        if (!result.success) {
          return json({ 
            success: false, 
            error: result.error 
          }, { status: 400 });
        }
        
        return json({ 
          success: true, 
          designs: result.designs
        });
      }
      
      default:
        return json({ 
          success: false, 
          error: "Invalid action specified" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching draft designs:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to fetch draft designs" 
    }, { status: 500 });
  }
};