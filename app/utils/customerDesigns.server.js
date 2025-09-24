import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Create a new customer design
 */
export async function createCustomerDesign(data) {
  try {
    const design = await prisma.customerDesign.create({
      data: {
        id: data.id || generateDesignId(),
        customerId: data.customerId || null,
        customerEmail: data.customerEmail || null,
        productId: data.productId,
        productTitle: data.productTitle,
        designName: data.designName || null,
        decorationType: data.decorationType,
        status: data.status || "draft",
        notes: data.notes || null,
        frontFileId: data.frontFileId || null,
        backFileId: data.backFileId || null,
        leftFileId: data.leftFileId || null,
        rightFileId: data.rightFileId || null,
        transforms: data.transforms ? JSON.stringify(data.transforms) : null,
        quantities: data.quantities ? JSON.stringify(data.quantities) : null,
      },
    });
    
    return { success: true, design };
  } catch (error) {
    console.error("Error creating customer design:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a customer design by ID
 */
export async function getCustomerDesign(id) {
  try {
    const design = await prisma.customerDesign.findUnique({
      where: { id },
    });
    
    if (!design) {
      return { success: false, error: "Design not found" };
    }
    
    // Parse JSON fields
    if (design.transforms) {
      design.transforms = JSON.parse(design.transforms);
    }
    
    if (design.quantities) {
      design.quantities = JSON.parse(design.quantities);
    }
    
    return { success: true, design };
  } catch (error) {
    console.error("Error fetching customer design:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a customer design
 */
export async function updateCustomerDesign(id, data) {
  try {
    // Only update fields that are provided
    const updateData = {};
    
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.customerEmail !== undefined) updateData.customerEmail = data.customerEmail;
    if (data.productId !== undefined) updateData.productId = data.productId;
    if (data.productTitle !== undefined) updateData.productTitle = data.productTitle;
    if (data.designName !== undefined) updateData.designName = data.designName;
    if (data.decorationType !== undefined) updateData.decorationType = data.decorationType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.frontFileId !== undefined) updateData.frontFileId = data.frontFileId;
    if (data.backFileId !== undefined) updateData.backFileId = data.backFileId;
    if (data.leftFileId !== undefined) updateData.leftFileId = data.leftFileId;
    if (data.rightFileId !== undefined) updateData.rightFileId = data.rightFileId;
    if (data.transforms !== undefined) {
      updateData.transforms = data.transforms ? JSON.stringify(data.transforms) : null;
    }
    if (data.quantities !== undefined) {
      updateData.quantities = data.quantities ? JSON.stringify(data.quantities) : null;
    }
    
    const design = await prisma.customerDesign.update({
      where: { id },
      data: updateData,
    });
    
    return { success: true, design };
  } catch (error) {
    console.error("Error updating customer design:", error);
    return { success: false, error: error.message };
  }
}

/**
 * List customer designs with optional filters
 */
export async function listCustomerDesigns(filters = {}) {
  try {
    const where = {};
    
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.customerEmail) where.customerEmail = filters.customerEmail;
    if (filters.productId) where.productId = filters.productId;
    if (filters.status) where.status = filters.status;
    
    const designs = await prisma.customerDesign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });
    
    // Parse JSON fields for all designs
    const parsedDesigns = designs.map(design => {
      if (design.transforms) {
        design.transforms = JSON.parse(design.transforms);
      }
      if (design.quantities) {
        design.quantities = JSON.parse(design.quantities);
      }
      return design;
    });
    
    return { success: true, designs: parsedDesigns };
  } catch (error) {
    console.error("Error listing customer designs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a customer design
 */
export async function deleteCustomerDesign(id) {
  try {
    await prisma.customerDesign.delete({
      where: { id },
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer design:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a unique design ID
 */
function generateDesignId() {
  return "design_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}