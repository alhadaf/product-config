import { authenticate } from "../shopify.server";

/**
 * Email service for sending customer notifications
 * Uses Shopify's built-in email capabilities or external service
 */

// Email templates for different notification types
const EMAIL_TEMPLATES = {
  design_submitted: {
    subject: "Design Submitted Successfully",
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Design Submitted Successfully</h2>
        <p>Hi there,</p>
        <p>Your design has been successfully submitted and is now under review.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Design Details:</h3>
          <p><strong>Design ID:</strong> ${data.designId}</p>
          <p><strong>Product:</strong> ${data.productTitle || 'Custom Product'}</p>
          <p><strong>Decoration Type:</strong> ${data.decoration || 'Not specified'}</p>
          <p><strong>Status:</strong> Pending Review</p>
        </div>
        
        <p>We'll notify you once your design has been reviewed. This typically takes 1-2 business days.</p>
        
        <p>You can check your design status anytime by visiting: <a href="${data.designUrl}">View Design</a></p>
        
        <p>Thank you for your business!</p>
        <p>The ${data.shopName} Team</p>
      </div>
    `
  },
  
  design_approved: {
    subject: "Design Approved - Ready for Production",
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Design Approved!</h2>
        <p>Hi there,</p>
        <p>Great news! Your design has been approved and is ready for production.</p>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0;">Design Details:</h3>
          <p><strong>Design ID:</strong> ${data.designId}</p>
          <p><strong>Product:</strong> ${data.productTitle || 'Custom Product'}</p>
          <p><strong>Decoration Type:</strong> ${data.decoration || 'Not specified'}</p>
          <p><strong>Status:</strong> Approved</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <p>Your design will now move into production. We'll keep you updated on the progress.</p>
        
        <p>You can track your order status by visiting: <a href="${data.orderUrl}">View Order</a></p>
        
        <p>Thank you for choosing ${data.shopName}!</p>
        <p>The ${data.shopName} Team</p>
      </div>
    `
  },
  
  design_rejected: {
    subject: "Design Requires Revision",
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Design Requires Revision</h2>
        <p>Hi there,</p>
        <p>We've reviewed your design and it requires some revisions before we can proceed.</p>
        
        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0;">Design Details:</h3>
          <p><strong>Design ID:</strong> ${data.designId}</p>
          <p><strong>Product:</strong> ${data.productTitle || 'Custom Product'}</p>
          <p><strong>Decoration Type:</strong> ${data.decoration || 'Not specified'}</p>
          <p><strong>Status:</strong> Requires Revision</p>
          ${data.notes ? `<p><strong>Feedback:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <p>Please review the feedback above and submit a revised design when ready.</p>
        
        <p>You can view and update your design by visiting: <a href="${data.designUrl}">View Design</a></p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>The ${data.shopName} Team</p>
      </div>
    `
  },
  
  design_in_production: {
    subject: "Design in Production",
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Design in Production</h2>
        <p>Hi there,</p>
        <p>Your approved design is now in production!</p>
        
        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
          <h3 style="margin-top: 0;">Production Details:</h3>
          <p><strong>Design ID:</strong> ${data.designId}</p>
          <p><strong>Product:</strong> ${data.productTitle || 'Custom Product'}</p>
          <p><strong>Decoration Type:</strong> ${data.decoration || 'Not specified'}</p>
          <p><strong>Status:</strong> In Production</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <p>We're working on your order and will notify you once it's completed.</p>
        
        <p>You can track your order progress by visiting: <a href="${data.orderUrl}">View Order</a></p>
        
        <p>Thank you for your patience!</p>
        <p>The ${data.shopName} Team</p>
      </div>
    `
  },
  
  design_completed: {
    subject: "Design Completed - Order Ready",
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Design Completed!</h2>
        <p>Hi there,</p>
        <p>Excellent news! Your custom design has been completed and your order is ready.</p>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0;">Completion Details:</h3>
          <p><strong>Design ID:</strong> ${data.designId}</p>
          <p><strong>Product:</strong> ${data.productTitle || 'Custom Product'}</p>
          <p><strong>Decoration Type:</strong> ${data.decoration || 'Not specified'}</p>
          <p><strong>Status:</strong> Completed</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <p>Your order will be processed for shipping according to your selected shipping method.</p>
        
        <p>You can view your completed order by visiting: <a href="${data.orderUrl}">View Order</a></p>
        
        <p>Thank you for choosing ${data.shopName}!</p>
        <p>The ${data.shopName} Team</p>
      </div>
    `
  }
};

/**
 * Get shop settings including notification preferences
 */
async function getShopSettings(request) {
  const { admin } = await authenticate.admin(request);
  
  try {
    // Get shop info
    const shopQuery = `#graphql
      query {
        shop { 
          id 
          name
          email
          myshopifyDomain
        }
      }
    `;
    
    const shopResponse = await admin.graphql(shopQuery);
    const shopData = await shopResponse.json();
    const shop = shopData?.data?.shop;
    
    if (!shop) {
      throw new Error("Could not get shop information");
    }
    
    // Get app settings from metafields
    const settingsQuery = `#graphql
      query getSettings($ownerId: ID!) {
        metafields(first: 20, owner: $ownerId, namespace: "product_configurator") {
          nodes {
            key
            value
          }
        }
      }
    `;
    
    const settingsResponse = await admin.graphql(settingsQuery, {
      variables: { ownerId: shop.id }
    });
    
    const settingsData = await settingsResponse.json();
    const metafields = settingsData?.data?.metafields?.nodes || [];
    
    const settings = {};
    metafields.forEach(field => {
      settings[field.key] = field.value;
    });
    
    return {
      shop,
      settings: {
        notification_email: settings.notification_email || shop.email,
        customer_notifications: settings.customer_notifications === "true",
        ...settings
      }
    };
  } catch (error) {
    console.error("Error getting shop settings:", error);
    throw error;
  }
}

/**
 * Send email notification using Shopify's email service
 * This is a simplified implementation - in production you might want to use
 * a dedicated email service like SendGrid, Mailgun, etc.
 */
async function sendEmail(request, { to, subject, html, from }) {
  const { admin } = await authenticate.admin(request);
  
  try {
    // For now, we'll log the email content
    // In a real implementation, you would integrate with an email service
    console.log("=== EMAIL NOTIFICATION ===");
    console.log("To:", to);
    console.log("From:", from);
    console.log("Subject:", subject);
    console.log("HTML Content:", html);
    console.log("========================");
    
    // TODO: Integrate with actual email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to, from, subject, html });
    
    return { success: true, message: "Email logged (not sent - integration needed)" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

/**
 * Send design status notification to customer
 */
export async function sendDesignNotification(request, designData, status, notes = "") {
  try {
    const { shop, settings } = await getShopSettings(request);
    
    // Check if customer notifications are enabled
    if (!settings.customer_notifications) {
      console.log("Customer notifications are disabled");
      return { success: false, message: "Customer notifications disabled" };
    }
    
    // Get email template based on status
    const templateKey = `design_${status}`;
    const template = EMAIL_TEMPLATES[templateKey];
    
    if (!template) {
      throw new Error(`No email template found for status: ${status}`);
    }
    
    // Prepare template data
    const templateData = {
      designId: designData.handle || designData.id.split('/').pop(),
      productTitle: designData.productTitle,
      decoration: designData.decoration,
      notes: notes,
      shopName: shop.name,
      designUrl: `https://${shop.myshopifyDomain}/apps/my-designs?email=${encodeURIComponent(designData.customerEmail)}`,
      orderUrl: designData.orderUrl || `https://${shop.myshopifyDomain}/account`
    };
    
    // Generate email content
    const subject = template.subject;
    const html = template.template(templateData);
    
    // Send email
    const result = await sendEmail(request, {
      to: designData.customerEmail,
      from: settings.notification_email || shop.email,
      subject: `${shop.name} - ${subject}`,
      html
    });
    
    return result;
  } catch (error) {
    console.error("Error sending design notification:", error);
    throw error;
  }
}

/**
 * Send admin notification about new design submission
 */
export async function sendAdminNotification(request, designData) {
  try {
    const { shop, settings } = await getShopSettings(request);
    
    const adminEmail = settings.notification_email || shop.email;
    
    const subject = "New Design Submission";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Design Submission</h2>
        <p>A new design has been submitted for review.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Design Details:</h3>
          <p><strong>Design ID:</strong> ${designData.handle || designData.id.split('/').pop()}</p>
          <p><strong>Customer Email:</strong> ${designData.customerEmail}</p>
          <p><strong>Product:</strong> ${designData.productTitle || 'Custom Product'}</p>
          <p><strong>Decoration Type:</strong> ${designData.decoration || 'Not specified'}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p><a href="https://${shop.myshopifyDomain}/admin/apps/product-configurator/designs/${encodeURIComponent(designData.id)}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Design</a></p>
        
        <p>Please review and approve or reject this design.</p>
      </div>
    `;
    
    const result = await sendEmail(request, {
      to: adminEmail,
      from: shop.email,
      subject: `${shop.name} - ${subject}`,
      html
    });
    
    return result;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    throw error;
  }
}