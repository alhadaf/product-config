import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { uploadDataUrlToFilesCdn } from "../utils/files.server";

export const action = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  
  try {
    const formData = await request.formData();
    
    // Get file data
    const file = formData.get("file");
    const side = formData.get("side");
    const color = formData.get("color");
    const productId = formData.get("productId");
    
    if (!file) {
      return json({ 
        success: false, 
        error: "No file provided" 
      }, { status: 400 });
    }
    
    if (!side) {
      return json({ 
        success: false, 
        error: "Side parameter is required" 
      }, { status: 400 });
    }
    
    // Convert file to data URL for upload
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    // Upload to Shopify Files CDN
    const uploadedFile = await uploadDataUrlToFilesCdn(request, {
      dataUrl: dataUrl,
      filename: `${side}_${color}_${productId}_${Date.now()}.${mimeType.split("/")[1] || "png"}`,
      mimeType: mimeType,
    });
    
    return json({ 
      success: true, 
      file: {
        id: uploadedFile.id,
        url: uploadedFile.url,
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
  } catch (error) {
    console.error("Error uploading design:", error);
    return json({ 
      success: false, 
      error: error.message || "Failed to upload design" 
    }, { status: 500 });
  }
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });