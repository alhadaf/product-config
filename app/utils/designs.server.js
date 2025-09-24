import { authenticate } from "../shopify.server";
import { sendDesignNotification, sendAdminNotification } from "./email.server";

// Metaobject types
const DESIGN_TYPE = "design";

export async function ensureDesignDefinition(request) {
  const { admin } = await authenticate.admin(request);
  const q = `#graphql
    query {
      metaobjectDefinitionByType(type: "${DESIGN_TYPE}") { id type }
    }
  `;
  const res = await admin.graphql(q);
  const json = await res.json();
  if (json?.data?.metaobjectDefinitionByType) return json.data.metaobjectDefinitionByType.id;

  const m = `#graphql
    mutation {
      metaobjectDefinitionCreate(definition: {
        type: "${DESIGN_TYPE}", name: "Design",
        fieldDefinitions: [
          { name: "Product", key: "product", type: "product_reference", required: false },
          { name: "Customer Email", key: "customer_email", type: "single_line_text_field" },
          { name: "Status", key: "status", type: "single_line_text_field" },
          { name: "Decoration", key: "decoration", type: "single_line_text_field" },
          { name: "Notes", key: "notes", type: "multi_line_text_field" },
          { name: "Front File", key: "front_file", type: "file_reference" },
          { name: "Back File", key: "back_file", type: "file_reference" },
          { name: "Left File", key: "left_file", type: "file_reference" },
          { name: "Right File", key: "right_file", type: "file_reference" },
          { name: "Transforms", key: "transforms", type: "json" }
        ]
      }) {
        metaobjectDefinition { id }
        userErrors { field message }
      }
    }
  `;
  const r2 = await admin.graphql(m);
  const j2 = await r2.json();
  const errs = j2?.data?.metaobjectDefinitionCreate?.userErrors || [];
  if (errs.length) throw new Response(JSON.stringify({ errors: errs }), { status: 400 });
  return j2?.data?.metaobjectDefinitionCreate?.metaobjectDefinition?.id;
}

export async function createDesign(request, payload) {
  await ensureDesignDefinition(request);
  const { admin } = await authenticate.admin(request);
  const m = `#graphql
    mutation create($definition: String!, $fields: [MetaobjectFieldInput!]!) {
      metaobjectCreate(metaobject: { type: $definition, fields: $fields }) {
        metaobject { id handle type }
        userErrors { field message }
      }
    }
  `;
  const fields = [];
  const push = (key, value) => value != null && fields.push({ key, value: String(value) });
  push("product", payload.productGID);
  push("customer_email", payload.customerEmail);
  push("status", payload.status || "pending");
  push("decoration", payload.decoration || "");
  push("notes", payload.notes || "");

  const res = await admin.graphql(m, { variables: { definition: DESIGN_TYPE, fields } });
  const json = await res.json();
  const errs = json?.data?.metaobjectCreate?.userErrors || [];
  if (errs.length) throw new Response(JSON.stringify({ errors: errs }), { status: 400 });
  
  const createdDesign = json?.data?.metaobjectCreate?.metaobject;
  
  // Send notifications for new design submission
  if (createdDesign && payload.customerEmail) {
    const designInfo = {
      id: createdDesign.id,
      handle: createdDesign.handle,
      customerEmail: payload.customerEmail,
      decoration: payload.decoration,
      productTitle: payload.productTitle || 'Custom Product'
    };
    
    try {
      // Send confirmation to customer
      await sendDesignNotification(request, designInfo, 'submitted');
      console.log(`Customer notification sent for new design submission: ${createdDesign.handle}`);
      
      // Send notification to admin
      await sendAdminNotification(request, designInfo);
      console.log(`Admin notification sent for new design submission: ${createdDesign.handle}`);
    } catch (error) {
      console.error("Failed to send design submission notifications:", error);
      // Don't fail the design creation if notifications fail
    }
  }
  
  return createdDesign;
}

export async function updateDesignFilesAndTransforms(request, id, { front, back, left, right, transforms }) {
  const { admin } = await authenticate.admin(request);
  const m = `#graphql
    mutation update($id: ID!, $fields: [MetaobjectFieldInput!]!) {
      metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
        metaobject { id }
        userErrors { field message }
      }
    }
  `;
  const fields = [];
  const push = (key, value) => value != null && fields.push({ key, value: String(value) });
  push("front_file", front || null);
  push("back_file", back || null);
  push("left_file", left || null);
  push("right_file", right || null);
  if (transforms) push("transforms", JSON.stringify(transforms));

  const res = await admin.graphql(m, { variables: { id, fields } });
  const json = await res.json();
  const errs = json?.data?.metaobjectUpdate?.userErrors || [];
  if (errs.length) throw new Response(JSON.stringify({ errors: errs }), { status: 400 });
  return true;
}

export async function setDesignStatus(request, id, status, message) {
  const { admin } = await authenticate.admin(request);
  
  // First, get the current design data for notifications
  const getDesignQuery = `#graphql
    query getDesign($id: ID!) {
      metaobject(id: $id) {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  `;
  
  const designResponse = await admin.graphql(getDesignQuery, { variables: { id } });
  const designData = await designResponse.json();
  const design = designData?.data?.metaobject;
  
  if (!design) {
    throw new Error("Design not found");
  }
  
  // Parse design fields
  const fields = Object.fromEntries(design.fields.map(f => [f.key, f.value]));
  const designInfo = {
    id: design.id,
    handle: design.handle,
    customerEmail: fields.customer_email,
    decoration: fields.decoration,
    productTitle: fields.product_title || 'Custom Product',
    currentStatus: fields.status
  };
  
  // Update the design status
  const updateMutation = `#graphql
    mutation update($id: ID!, $fields: [MetaobjectFieldInput!]!) {
      metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
        metaobject { id }
        userErrors { field message }
      }
    }
  `;
  
  const updateFields = [{ key: "status", value: status }];
  if (message) updateFields.push({ key: "notes", value: message });
  
  const updateResponse = await admin.graphql(updateMutation, { variables: { id, fields: updateFields } });
  const updateJson = await updateResponse.json();
  const errs = updateJson?.data?.metaobjectUpdate?.userErrors || [];
  if (errs.length) throw new Response(JSON.stringify({ errors: errs }), { status: 400 });
  
  // Send notification if status changed and customer email exists
  if (designInfo.customerEmail && designInfo.currentStatus !== status) {
    try {
      await sendDesignNotification(request, designInfo, status, message);
      console.log(`Notification sent for design ${design.handle} status change: ${designInfo.currentStatus} -> ${status}`);
    } catch (error) {
      console.error("Failed to send notification:", error);
      // Don't fail the status update if notification fails
    }
  }
  
  return true;
}



