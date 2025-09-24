import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { createCustomerDesign, updateCustomerDesign } from "../utils/customerDesigns.server";

export const action = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const body = await request.json();
    
    // Check if this is an update or create operation
    const isUpdate = body.designId && body.designId !== '';
    
    let result;
    
    if (isUpdate) {
      // Update existing design
      result = await updateCustomerDesign(body.designId, {
        customerId: body.customerId || null,
        customerEmail: body.customerEmail || null,
        productId: body.productId,
        productTitle: body.productTitle,
        designName: body.designName || null,
        decorationType: body.decorationType,
        status: body.status || "draft",
        notes: body.notes || null,
        frontFileId: body.frontFileId || null,
        backFileId: body.backFileId || null,
        leftFileId: body.leftFileId || null,
        rightFileId: body.rightFileId || null,
        transforms: body.transforms || null,
        quantities: body.quantities || null,
      });
    } else {
      // Create new design
      result = await createCustomerDesign({
        id: body.designId || null, // Will be generated if null
        customerId: body.customerId || null,
        customerEmail: body.customerEmail || null,
        productId: body.productId,
        productTitle: body.productTitle,
        designName: body.designName || null,
        decorationType: body.decorationType,
        status: body.status || "draft",
        notes: body.notes || null,
        frontFileId: body.frontFileId || null,
        backFileId: body.backFileId || null,
        leftFileId: body.leftFileId || null,
        rightFileId: body.rightFileId || null,
        transforms: body.transforms || null,
        quantities: body.quantities || null,
      });
    }
    
    if (!result.success) {
      console.error("Failed to save customer design:", result.error);
      return json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
    
    return json({ 
      success: true, 
      design: result.design,
      message: isUpdate ? "Design updated successfully" : "Design saved successfully"
    });
  } catch (error) {
    console.error("Error saving design:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to save design" 
    }, { status: 500 });
  }
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });