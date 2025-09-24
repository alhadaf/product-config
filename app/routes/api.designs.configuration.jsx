import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { createDesign, updateDesignFilesAndTransforms } from "../utils/designs.server";
import { createCustomerDesign, getCustomerDesign, updateCustomerDesign } from "../utils/customerDesigns.server";

export const action = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const body = await request.json();
    
    // Create a new design record in Shopify metaobjects
    const design = await createDesign(request, {
      productGID: body.productGID,
      productTitle: body.productTitle,
      customerEmail: body.customerEmail,
      decoration: body.decoration,
      notes: body.notes,
      status: "draft",
    });
    
    // Create a customer design record in our database
    const customerDesignResult = await createCustomerDesign({
      id: design.id,
      customerId: body.customerId,
      customerEmail: body.customerEmail,
      productId: body.productGID,
      productTitle: body.productTitle,
      designName: body.designName,
      decorationType: body.decoration,
      status: "draft",
      notes: body.notes,
      transforms: body.transforms,
      quantities: body.quantities,
    });
    
    if (!customerDesignResult.success) {
      console.error("Failed to create customer design:", customerDesignResult.error);
      // Don't fail the whole request if customer design creation fails
    }
    
    // If design has files, update them
    if (body.images) {
      const sides = ["front","back","left","right"];
      const fileData = {};
      
      for (const side of sides) {
        if (body.images[side]) {
          // In a real implementation, you would upload the images here
          // For now, we'll just store the data URLs as placeholders
          fileData[side] = body.images[side]; // This should be file IDs in a real implementation
        }
      }
      
      // Update design with file references and transforms
      await updateDesignFilesAndTransforms(request, design.id, {
        front: fileData.front || null,
        back: fileData.back || null,
        left: fileData.left || null,
        right: fileData.right || null,
        transforms: body.transforms || null,
      });
      
      // Update customer design with file references
      await updateCustomerDesign(design.id, {
        frontFileId: fileData.front || null,
        backFileId: fileData.back || null,
        leftFileId: fileData.left || null,
        rightFileId: fileData.right || null,
      });
    }
    
    return json({ 
      success: true, 
      designId: design.id, 
      designHandle: design.handle,
      message: "Design configuration saved successfully"
    });
  } catch (error) {
    console.error("Error saving design configuration:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to save design configuration" 
    }, { status: 500 });
  }
};

export const loader = async ({ request, params }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return json({ 
        success: false, 
        error: "Design ID is required" 
      }, { status: 400 });
    }
    
    // Fetch the design from our database
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
  } catch (error) {
    console.error("Error fetching design configuration:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to fetch design configuration" 
    }, { status: 500 });
  }
};