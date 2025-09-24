import { useLoaderData, useActionData, Form, useNavigation, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  InlineStack,
  Select,
  Tag,
  Banner,
  Divider,
  InlineGrid,
  Badge,
  ChoiceList,
  Modal,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useEffect, useMemo, useState, useRef } from "react";
import FileUpload from "../components/FileUpload";
import { ColorAutocomplete } from "../components/ColorAutocomplete";
import { SizeAutocomplete } from "../components/SizeAutocomplete";
import { DecorationAutocomplete } from "../components/DecorationAutocomplete";

// Custom hook for responsive design
function useResponsive() {
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      });
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Fetch existing products for selection
  const query = `#graphql
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            status
            productType
            vendor
          }
        }
      }
    }
  `;

  // Fetch existing color options from all products
  const colorOptionsQuery = `#graphql
    query getProductOptions($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            options {
              name
              values
            }
          }
        }
      }
    }
  `;

  const [productsResponse, colorOptionsResponse] = await Promise.all([
    admin.graphql(query, { variables: { first: 50 } }),
    admin.graphql(colorOptionsQuery, { variables: { first: 250 } })
  ]);

  const productsData = await productsResponse.json();
  const colorOptionsData = await colorOptionsResponse.json();
  
  const products = productsData.data?.products?.edges?.map(edge => edge.node) || [];
  
  // Extract unique option values from all products
  const existingColors = new Set();
  const existingSizes = new Set();
  const existingDecorations = new Set();
  const productOptions = colorOptionsData.data?.products?.edges || [];
  
  productOptions.forEach(({ node: product }) => {
    product.options?.forEach(option => {
      const optionName = option.name.toLowerCase();
      option.values?.forEach(value => {
        if (value && value.trim()) {
          const trimmedValue = value.trim();
          if (optionName === 'color') {
            existingColors.add(trimmedValue);
          } else if (optionName === 'size') {
            existingSizes.add(trimmedValue);
          } else if (optionName === 'decoration' || optionName === 'decorations') {
            existingDecorations.add(trimmedValue);
          }
        }
      });
    });
  });

  return { 
    products,
    existingColors: Array.from(existingColors).sort(),
    existingSizes: Array.from(existingSizes).sort(),
    existingDecorations: Array.from(existingDecorations).sort()
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "generateVariants") {
    try {
      const productId = formData.get("productId");
      const isCreatingProduct = formData.get("isCreatingProduct") === "true";
      const newProductTitle = formData.get("newProductTitle");
      const colors = formData.get("colors")?.split(",").filter(Boolean) || [];
      const sizes = formData.get("sizes")?.split(",").filter(Boolean) || [];
      const decorations = formData.get("decorations")?.split(",").filter(Boolean) || [];
      const price = formData.get("price");

      // Validation
      if (isCreatingProduct && (!newProductTitle || newProductTitle.trim().length === 0)) {
        return json({ 
          success: false, 
          error: "Product title is required when creating a new product." 
        });
      }
      
      if (!isCreatingProduct && (!productId || productId.trim().length === 0)) {
        return json({ 
          success: false, 
          error: "Please select an existing product or create a new one." 
        });
      }
      
      if (colors.length === 0 && sizes.length === 0) {
        return json({ 
          success: false, 
          error: "Please add at least one color or size option to configure the product." 
        });
      }

      let finalProductId = productId;

      // Note: We'll create variants without specific location inventory management
      // to avoid location access permission issues

      // Create new product if needed
      if (isCreatingProduct && newProductTitle) {
        // Prepare product options for creation
        const productOptions = [];
        if (colors.length > 0) {
          productOptions.push({ 
            name: "Color", 
            values: colors.map(color => ({ name: color }))
          });
        }
        if (sizes.length > 0) {
          productOptions.push({ 
            name: "Size", 
            values: sizes.map(size => ({ name: size }))
          });
        }
        if (decorations.length > 0) {
          productOptions.push({ 
            name: "Decoration", 
            values: decorations.map(decoration => ({ name: decoration }))
          });
        }

        const productMutation = `
          mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
              product {
                id
                title
                handle
                options {
                  id
                  name
                  values
                  optionValues {
                    id
                    name
                    hasVariants
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const productInput = {
          title: newProductTitle,
          productType: "Customizable Product",
          vendor: "Product Configurator",
          status: "DRAFT",
          descriptionHtml: `<p>Customizable ${newProductTitle} with multiple options for colors, sizes, and decorations.</p>`,
        };

        // Add productOptions only if we have options to add
        if (productOptions.length > 0) {
          productInput.productOptions = productOptions;
        }

        const productResponse = await admin.graphql(productMutation, {
          variables: {
            input: productInput
          }
        });

        const productResult = await productResponse.json();
        
        if (productResult.data?.productCreate?.userErrors?.length > 0) {
          return json({ 
            success: false, 
            error: productResult.data.productCreate.userErrors[0].message 
          });
        }

        finalProductId = productResult.data?.productCreate?.product?.id;
      }

      // Generate variants based on combinations
      let skippedVariantCount = 0; // Track skipped variants for user feedback
      let variants = []; // Declare variants outside conditional block
      
      if (finalProductId && (colors.length > 0 || sizes.length > 0 || decorations.length > 0)) {
        
        // Create all combinations of colors, sizes, and decorations
        const colorOptions = colors.length > 0 ? colors : [''];
        const sizeOptions = sizes.length > 0 ? sizes : [''];
        const decorationOptions = decorations.length > 0 ? decorations : [''];
        
        colorOptions.forEach(color => {
          sizeOptions.forEach(size => {
            decorationOptions.forEach(decoration => {
              // Build title from non-empty options
              const titleParts = [color, size, decoration].filter(part => part !== '');
              const title = titleParts.join(' / ') || 'Default';
              
              // Build options array from non-empty options
              const options = [color, size, decoration].filter(option => option !== '');
              
              // Only create variant if we have at least one option
              if (options.length > 0) {
                variants.push({
                  title: title,
                  price: price || "0.00",
                  inventoryPolicy: "DENY",
                  inventoryManagement: "SHOPIFY",
                  // Note: Removed inventoryQuantities to avoid location access issues
                  // Inventory can be managed manually in Shopify admin after creation
                  options: options
                });
              }
            });
          });
        });

        // Fetch existing variants to avoid duplicates
        let existingVariants = [];
        if (!isCreatingProduct) {
          const getVariantsQuery = `
            query getProductVariants($id: ID!, $first: Int!) {
              product(id: $id) {
                id
                variants(first: $first) {
                  edges {
                    node {
                      id
                      title
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          `;
          
          const variantsResponse = await admin.graphql(getVariantsQuery, {
            variables: { id: finalProductId, first: 250 }
          });
          
          const variantsResult = await variantsResponse.json();
          existingVariants = variantsResult.data?.product?.variants?.edges?.map(edge => edge.node) || [];
        }

        // Filter out variants that already exist
        const filteredVariants = [];
        const duplicateVariants = [];
        
        variants.forEach(newVariant => {
          // Create a comparable signature for the new variant (normalize case and sort)
          const newVariantSignature = newVariant.options
            .map(opt => opt.toLowerCase().trim())
            .sort()
            .join('|');
          
          // Check if this combination already exists
          const isDuplicate = existingVariants.some(existingVariant => {
            const existingOptions = existingVariant.selectedOptions
              .map(opt => opt.value.toLowerCase().trim())
              .sort()
              .join('|');
            return existingOptions === newVariantSignature;
          });
          
          if (isDuplicate) {
            duplicateVariants.push(newVariant);
          } else {
            filteredVariants.push(newVariant);
          }
        });

        // Calculate how many variants were skipped
        const originalVariantCount = variants.length;
        skippedVariantCount = originalVariantCount - filteredVariants.length;
        
        // Update variants array to only include non-duplicates
        variants = filteredVariants;

        // If all variants are duplicates, return early with appropriate message
        if (filteredVariants.length === 0 && originalVariantCount > 0) {
          const duplicateList = duplicateVariants.map(v => v.title).join(', ');
          return json({
            success: true,
            message: `All ${originalVariantCount} variant combination(s) already exist for this product. Existing variants: ${duplicateList}. No new variants were created.`,
            skippedVariants: skippedVariantCount,
            existingVariants: duplicateVariants
          });
        }

        // For existing products, we need to check existing options and add only new ones
        if (!isCreatingProduct && (colors.length > 0 || sizes.length > 0)) {
          // First, fetch existing product options
          const getProductQuery = `
            query getProduct($id: ID!) {
              product(id: $id) {
                id
                options {
                  id
                  name
                  values
                }
              }
            }
          `;
          
          const productResponse = await admin.graphql(getProductQuery, {
            variables: { id: finalProductId }
          });
          
          const productResult = await productResponse.json();
          const existingOptions = productResult.data?.product?.options || [];
          
          // Check which options already exist
          const existingOptionNames = existingOptions.map(opt => opt.name);
          const optionsToAdd = [];
          
          // Only add Color option if it doesn't exist
          if (colors.length > 0 && !existingOptionNames.includes("Color")) {
            optionsToAdd.push({ 
              name: "Color", 
              values: colors.map(color => ({ name: color }))
            });
          }
          
          // Only add Size option if it doesn't exist
          if (sizes.length > 0 && !existingOptionNames.includes("Size")) {
            optionsToAdd.push({ 
              name: "Size", 
              values: sizes.map(size => ({ name: size }))
            });
          }
          
          // Only add Decoration option if it doesn't exist
          if (decorations.length > 0 && !existingOptionNames.includes("Decoration")) {
            optionsToAdd.push({ 
              name: "Decoration", 
              values: decorations.map(decoration => ({ name: decoration }))
            });
          }

          // Only create options if there are new ones to add
          if (optionsToAdd.length > 0) {
            const optionMutation = `
              mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
                productOptionsCreate(productId: $productId, options: $options) {
                  product {
                    id
                    options {
                      id
                      name
                      values
                      optionValues {
                        id
                        name
                        hasVariants
                      }
                    }
                  }
                  userErrors { 
                    field 
                    message 
                  }
                }
              }
            `;
            
            const optionResponse = await admin.graphql(optionMutation, {
              variables: {
                productId: finalProductId,
                options: optionsToAdd
              }
            });

            const optionResult = await optionResponse.json();
            
            if (optionResult.data?.productOptionsCreate?.userErrors?.length > 0) {
              return json({ 
                success: false, 
                error: optionResult.data.productOptionsCreate.userErrors[0].message 
              });
            }
          }
        }

        // Create variants using bulk create
        if (variants.length > 0) {
          const variantMutation = `
            mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkCreate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  title
                  price
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          // Transform variants to the correct format for bulk create
          const variantsInput = variants.map(variant => {
            const optionValues = [];
            
            // Map the options array to optionValues format
            if (variant.options && variant.options.length > 0) {
              variant.options.forEach((optionValue, index) => {
                if (colors.includes(optionValue)) {
                  optionValues.push({ optionName: "Color", name: optionValue });
                } else if (sizes.includes(optionValue)) {
                  optionValues.push({ optionName: "Size", name: optionValue });
                } else if (decorations.includes(optionValue)) {
                  optionValues.push({ optionName: "Decoration", name: optionValue });
                }
              });
            }

            return {
              optionValues: optionValues,
              price: variant.price,
              inventoryPolicy: variant.inventoryPolicy
              // Note: Removed inventoryQuantities to avoid location access issues
            };
          });

          const variantResponse = await admin.graphql(variantMutation, {
            variables: {
              productId: finalProductId,
              variants: variantsInput
            }
          });

          const variantResult = await variantResponse.json();
          
          if (variantResult.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
            return json({ 
              success: false, 
              error: variantResult.data.productVariantsBulkCreate.userErrors[0].message 
            });
          }
        }

        // Store configuration in metafields
        const metafieldMutation = `
          mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const metafields = [
          {
            ownerId: finalProductId,
            namespace: "product_configurator",
            key: "colors",
            value: JSON.stringify(colors),
            type: "json"
          },
          {
            ownerId: finalProductId,
            namespace: "product_configurator",
            key: "sizes", 
            value: JSON.stringify(sizes),
            type: "json"
          },
          {
            ownerId: finalProductId,
            namespace: "product_configurator",
            key: "decorations",
            value: JSON.stringify(decorations),
            type: "json"
          },
          {
            ownerId: finalProductId,
            namespace: "product_configurator",
            key: "base_price",
            value: price || "0.00",
            type: "single_line_text_field"
          }
        ];

        await admin.graphql(metafieldMutation, {
          variables: { metafields }
        });
      }

      // Prepare success message with variant information
      let successMessage = isCreatingProduct ? "Product created and configured successfully!" : "Product configured successfully!";
      if (skippedVariantCount > 0) {
        successMessage += ` ${variants.length} new variant(s) created. ${skippedVariantCount} duplicate variant(s) were skipped.`;
      }

      return json({ 
        success: true, 
        productId: finalProductId,
        message: successMessage,
        createdVariants: variants.length,
        skippedVariants: skippedVariantCount || 0
      });

    } catch (error) {
      console.error("Error in generateVariants action:", error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = "An unexpected error occurred while configuring the product. Please try again.";
      
      if (error.message) {
        if (error.message.includes("GraphQL")) {
          errorMessage = "There was an issue communicating with Shopify. Please check your connection and try again.";
        } else if (error.message.includes("authentication") || error.message.includes("unauthorized")) {
          errorMessage = "Authentication failed. Please refresh the page and try again.";
        } else if (error.message.includes("validation")) {
          errorMessage = "Invalid product data. Please check your inputs and try again.";
        } else {
          errorMessage = `Configuration failed: ${error.message}`;
        }
      }
      
      return json({ 
        success: false, 
        error: errorMessage
      });
    }
  }

  return json({ success: false, error: "Invalid action type" });
};

// Progress Indicator Component
function ProgressIndicator({ currentStep, totalSteps = 5 }) {
  const { isMobile, isTablet } = useResponsive();
  
  const stepNames = [
    "Welcome",
    "Product Selection", 
    "Configure Options",
    "Upload Images",
    "Review & Complete"
  ];
  
  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingSm" as="h3">
          Setup Progress
        </Text>
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '8px' : isTablet ? '12px' : '16px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            
            return (
              <div key={stepNumber} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <div
                    style={{
                      width: isMobile ? '28px' : isTablet ? '32px' : '36px',
                      height: isMobile ? '28px' : isTablet ? '32px' : '36px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#008060' : isActive ? '#004c3f' : '#e1e3e5',
                      color: isCompleted || isActive ? 'white' : '#6d7175',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '12px' : isTablet ? '13px' : '14px',
                      fontWeight: 'bold',
                      border: isActive ? '2px solid #004c3f' : 'none',
                      boxShadow: isActive ? '0 0 0 2px rgba(0, 76, 63, 0.2)' : 'none'
                    }}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </div>
                  <Text 
                    variant={isMobile ? "captionSm" : "captionMd"} 
                    tone={isActive ? 'base' : 'subdued'} 
                    alignment="center"
                  >
                    {isMobile ? stepNames[index].split(' ')[0] : stepNames[index]}
                  </Text>
                </div>
                {stepNumber < totalSteps && !isMobile && (
                  <div
                    style={{
                      width: isTablet ? '16px' : '24px',
                      height: '2px',
                      backgroundColor: stepNumber < currentStep ? '#008060' : '#e1e3e5',
                      marginTop: isTablet ? '16px' : '18px'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </BlockStack>
    </Card>
  );
}

// Confirmation Modal Component
function ConfirmationModal({ isOpen, onClose, onConfirm, productData }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Confirm Product Configuration"
      primaryAction={{
        content: 'Launch Product',
        onAction: onConfirm,
        loading: false,
      }}
      secondaryActions={[
        {
          content: 'Review Again',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyMd">
            You're about to launch your product configuration. Please review the details below:
          </Text>
          
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Product Details</Text>
              <InlineStack gap="200">
                <Text variant="bodyMd" fontWeight="semibold">Product:</Text>
                <Text variant="bodyMd">{productData?.title || 'New Product'}</Text>
              </InlineStack>
              <InlineStack gap="200">
                <Text variant="bodyMd" fontWeight="semibold">Colors:</Text>
                <Text variant="bodyMd">{productData?.colors || 'Not specified'}</Text>
              </InlineStack>
              <InlineStack gap="200">
                <Text variant="bodyMd" fontWeight="semibold">Sizes:</Text>
                <Text variant="bodyMd">{productData?.sizes || 'Not specified'}</Text>
              </InlineStack>
              <InlineStack gap="200">
                <Text variant="bodyMd" fontWeight="semibold">Decorations:</Text>
                <Text variant="bodyMd">{productData?.decorations || 'Not specified'}</Text>
              </InlineStack>
              <InlineStack gap="200">
                <Text variant="bodyMd" fontWeight="semibold">Base Price:</Text>
                <Text variant="bodyMd">${productData?.price || '0.00'}</Text>
              </InlineStack>
            </BlockStack>
          </Card>
          
          <Text variant="bodyMd" tone="subdued">
            Once launched, customers will be able to customize this product on your store.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

// Success Screen Component
function SuccessScreen({ onStartOver }) {
  return (
    <Page>
      <BlockStack gap="800">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BlockStack gap="600">
            <div style={{ fontSize: '64px', color: '#00A047' }}>✓</div>
            
            <BlockStack gap="400">
              <Text variant="displayMd" as="h1" alignment="center">
                Product Configuration Complete!
              </Text>
              <Text variant="bodyLg" alignment="center" tone="subdued">
                Your product configurator has been successfully set up and is now live on your store.
              </Text>
            </BlockStack>
            
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2" alignment="center">
                  What's Next?
                </Text>
                <BlockStack gap="300">
                  <InlineStack gap="300" align="center">
                    <div style={{ width: '24px', height: '24px', backgroundColor: '#00A047', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>1</div>
                    <Text variant="bodyMd">Visit your store to see the product configurator in action</Text>
                  </InlineStack>
                  <InlineStack gap="300" align="center">
                    <div style={{ width: '24px', height: '24px', backgroundColor: '#00A047', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>2</div>
                    <Text variant="bodyMd">Test the customization options with sample orders</Text>
                  </InlineStack>
                  <InlineStack gap="300" align="center">
                    <div style={{ width: '24px', height: '24px', backgroundColor: '#00A047', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>3</div>
                    <Text variant="bodyMd">Share the product with your customers</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <InlineStack gap="300" align="center">
              <Button onClick={onStartOver} variant="secondary">
                Configure Another Product
              </Button>
              <Button url="/app" variant="primary">
                Go to Dashboard
              </Button>
            </InlineStack>
          </BlockStack>
        </div>
      </BlockStack>
    </Page>
  );
}

// Welcome Screen Component
function WelcomeScreen({ onStart }) {
  return (
    <Card>
      <BlockStack gap="500">
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h2">
            Welcome to Product Configurator Setup
          </Text>
          <div style={{ marginTop: '16px' }}>
            <Text variant="bodyLg" tone="subdued">
              Let's set up your customizable product in just a few simple steps
            </Text>
          </div>
        </div>
        
        <Card background="bg-surface-secondary">
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">
              What you'll accomplish:
            </Text>
            <BlockStack gap="200">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#008060',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Text variant="captionMd" tone="text-inverse">1</Text>
                </div>
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">Choose or Create Your Product</Text>
                  <Text variant="bodyMd" tone="subdued">Select an existing product or create a new one to configure</Text>
                </BlockStack>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#008060',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Text variant="captionMd" tone="text-inverse">2</Text>
                </div>
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">Set Up Product Options</Text>
                  <Text variant="bodyMd" tone="subdued">Define colors, sizes, decorations, and pricing for your product</Text>
                </BlockStack>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#008060',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Text variant="captionMd" tone="text-inverse">3</Text>
                </div>
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">Upload Product Images</Text>
                  <Text variant="bodyMd" tone="subdued">Add high-quality images for each color variant</Text>
                </BlockStack>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#008060',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Text variant="captionMd" tone="text-inverse">4</Text>
                </div>
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">Review Your Configuration</Text>
                  <Text variant="bodyMd" tone="subdued">Double-check all settings before launching</Text>
                </BlockStack>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  backgroundColor: '#008060',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Text variant="captionMd" tone="text-inverse">4</Text>
                </div>
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">Review & Launch</Text>
                  <Text variant="bodyMd" tone="subdued">Review your configuration and make it live for customers</Text>
                </BlockStack>
              </div>
            </BlockStack>
          </BlockStack>
        </Card>
        
        <div style={{ textAlign: 'center' }}>
          <Button variant="primary" size="large" onClick={onStart}>
            Start Setup
          </Button>
          <div style={{ marginTop: '12px' }}>
            <Text variant="bodyMd" tone="subdued">
              This should take about 5-10 minutes to complete
            </Text>
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}

export default function Setup() {
  const { products, existingColors, existingSizes, existingDecorations } = useLoaderData();
  const navigation = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Product state
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProductTitle, setNewProductTitle] = useState("");
  const [productId, setProductId] = useState("");

  // Options state
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [decorations, setDecorations] = useState([]);
  const [price, setPrice] = useState("");

  // Input state for adding new options
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newDecoration, setNewDecoration] = useState("");

  // File upload state
  const [uploadedFilesByColor, setUploadedFilesByColor] = useState({});

  // Existing variants state
  const [existingVariants, setExistingVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [productData, setProductData] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState([]);

  // Focus management refs
  const stepRefs = {
    step1: useRef(null),
    step2: useRef(null),
    step3: useRef(null),
    step4: useRef(null),
    step5: useRef(null)
  };

  // Focus management - move focus to current step heading when step changes
  useEffect(() => {
    const currentStepRef = stepRefs[`step${currentStep}`];
    if (currentStepRef?.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        currentStepRef.current.focus();
      }, 100);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Allow navigation with arrow keys when not in form fields
      if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'SELECT' && event.target.tagName !== 'TEXTAREA') {
        if (event.key === 'ArrowRight' && currentStep < 4) {
          event.preventDefault();
          const errors = validateCurrentStep();
          if (Object.keys(errors).length === 0) {
            setCurrentStep(currentStep + 1);
          }
        } else if (event.key === 'ArrowLeft' && currentStep > 0) {
          event.preventDefault();
          setCurrentStep(currentStep - 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  // Handle action responses
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setShowSuccess(true);
        setErrorMessage(""); // Clear any previous errors
      } else if (actionData.error) {
        console.error('Configuration submission failed:', actionData.error);
        setErrorMessage(actionData.error);
        setShowSuccess(false);
      }
    }
  }, [actionData]);

  // Validation functions with improved messages and suggestions
  const validateStep1 = () => {
    const errors = {};
    if (isCreatingProduct && !newProductTitle.trim()) {
      errors.product = "Product title is required. Try something descriptive like 'Custom Logo T-Shirt' or 'Personalized Coffee Mug'.";
    } else if (isCreatingProduct && newProductTitle.trim().length < 3) {
      errors.product = "Product title should be at least 3 characters long. Make it descriptive so customers understand what they're buying.";
    } else if (!isCreatingProduct && !selectedProduct) {
      errors.product = "Please select an existing product from your store, or switch to 'Create New Product' to make a new one.";
    }
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    if (colors.length === 0) {
      errors.colors = "Add at least one color option. Popular choices include: Black, White, Navy, Red, or Gray.";
    }
    if (sizes.length === 0) {
      errors.sizes = "Add at least one size option. Common sizes include: S, M, L, XL for apparel or Small, Medium, Large for other items.";
    }
    if (decorations.length === 0) {
      errors.decorations = "Add at least one decoration method. Popular options include: Screen Print, Embroidery, Heat Transfer, or Digital Print.";
    }
    if (!price || parseFloat(price) <= 0) {
      errors.price = "Enter a valid price greater than $0. Consider your costs, materials, and desired profit margin.";
    } else if (parseFloat(price) > 1000) {
      errors.price = "Price seems unusually high. Please double-check the amount or contact support if this is correct.";
    }
    return errors;
  };

  const validateStep3 = () => {
    const errors = {};
    const missingFiles = colors.filter(color => 
      !uploadedFilesByColor[color]?.front || !uploadedFilesByColor[color]?.back
    );
    if (missingFiles.length > 0) {
      if (missingFiles.length === 1) {
        errors.files = `Please upload both front and back view images for ${missingFiles[0]}. High-quality images help customers visualize their custom product.`;
      } else {
        errors.files = `Missing images for: ${missingFiles.join(', ')}. Each color needs both front and back view images to show customers what their product will look like.`;
      }
    }
    
    // Check for file size issues
    const oversizedFiles = [];
    Object.entries(uploadedFilesByColor).forEach(([color, files]) => {
      if (files.front && files.front.size > 10 * 1024 * 1024) { // 10MB limit
        oversizedFiles.push(`${color} front view`);
      }
      if (files.back && files.back.size > 10 * 1024 * 1024) {
        oversizedFiles.push(`${color} back view`);
      }
    });
    
    if (oversizedFiles.length > 0) {
      errors.fileSize = `These files are too large (over 10MB): ${oversizedFiles.join(', ')}. Please compress your images or use a smaller file size.`;
    }
    
    return errors;
  };

  const validateStep4 = () => {
    const step3Errors = validateStep3();
    const errors = { ...step3Errors };
    
    // Additional final validation
    const totalVariants = colors.length * sizes.length * decorations.length;
    if (totalVariants > 100) {
      errors.variants = `This configuration will create ${totalVariants} product variants, which might be too many to manage effectively. Consider reducing the number of options.`;
    }
    
    return errors;
  };

  // Helper function for keyboard navigation
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      case 4:
        return validateStep4();
      default:
        return {};
    }
  };

  // Navigation functions
  const nextStep = () => {
    let errors = {};
    
    switch (currentStep) {
      case 1:
        errors = validateStep1();
        break;
      case 2:
        errors = validateStep2();
        break;
      case 3:
        errors = validateStep3();
        break;
      case 4:
        errors = validateStep4();
        break;
    }

    setStepErrors(errors);
    setShowValidation(true);

    if (Object.keys(errors).length === 0) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      setShowValidation(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setShowValidation(false);
  };

  // Function to fetch existing variants for a product
  const fetchExistingVariants = async (productId) => {
    if (!productId) {
      setExistingVariants([]);
      return;
    }

    setLoadingVariants(true);
    try {
      const response = await fetch(`/api/products/variants?productId=${encodeURIComponent(productId)}`);

      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
        setExistingVariants([]);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setExistingVariants(result.variants || []);
        setProductData(result.product || null);

        // Auto-populate from metafields if available
        if (result.product?.metafields) {
          populateFromMetafields(result.product.metafields);
        }
      } else {
        console.log('No variants found or request failed:', result);
        setExistingVariants([]);
        setProductData(null);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setErrorMessage("Unable to load existing product variants. Please try again or contact support if this issue persists.");
      setExistingVariants([]);
      setProductData(null);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Function to populate fields from metafields
  const populateFromMetafields = (metafields) => {
    // Look for colors in metafields
    const colorKeys = ['product_configurator.colors', 'custom.colors'];
    for (const key of colorKeys) {
      if (metafields[key] && Array.isArray(metafields[key]) && metafields[key].length > 0) {
        setColors(metafields[key]);
        break;
      }
    }

    // Look for sizes in metafields
    const sizeKeys = ['product_configurator.sizes', 'custom.sizes'];
    for (const key of sizeKeys) {
      if (metafields[key] && Array.isArray(metafields[key]) && metafields[key].length > 0) {
        setSizes(metafields[key]);
        break;
      }
    }

    // Look for decorations in metafields
    const decorationKeys = ['product_configurator.decorations', 'custom.decorations'];
    for (const key of decorationKeys) {
      if (metafields[key] && Array.isArray(metafields[key]) && metafields[key].length > 0) {
        setDecorations(metafields[key]);
        break;
      }
    }

    // Look for base price in metafields
    const priceKeys = ['product_configurator.base_price'];
    for (const key of priceKeys) {
      if (metafields[key]) {
        setPrice(metafields[key]);
        break;
      }
    }
  };

  // Start setup function
  const onStart = () => {
    setCurrentStep(1);
  };

  // Form submission functions
  const handleConfirmSubmission = () => {
    setShowConfirmation(false);
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'generateVariants');
    formData.append('productId', productId);
    formData.append('colors', colors.join(','));
    formData.append('sizes', sizes.join(','));
    formData.append('decorations', decorations.join(','));
    formData.append('price', price);
    
    // Use Remix's submit function instead of manual fetch
    submit(formData, { method: 'post' });
  };

  const handleStartOver = () => {
    setShowSuccess(false);
    setCurrentStep(0);
    setSelectedProduct(null);
    setNewProductTitle('');
    setColors([]);
    setSizes([]);
    setDecorations([]);
    setPrice('');
    setUploadedFilesByColor({});
    setShowValidation(false);
    setStepErrors({});
    setExistingVariants([]);
    setProductData(null);
    setSelectedVariants([]);
  };

  // Option management functions
  const addColor = (colorValue = null) => {
    console.log('addColor called with:', { colorValue, newColor, currentColors: colors });
    const colorToAdd = colorValue || newColor;
    if (colorToAdd.trim() && !colors.includes(colorToAdd.trim())) {
      console.log('Adding color:', colorToAdd.trim());
      setColors([...colors, colorToAdd.trim()]);
      setNewColor("");
    } else {
      console.log('Color not added - either empty or already exists:', { colorToAdd: colorToAdd.trim(), exists: colors.includes(colorToAdd.trim()) });
    }
  };

  const removeColor = (colorToRemove) => {
    setColors(colors.filter(color => color !== colorToRemove));
    // Remove associated files
    const newFiles = { ...uploadedFilesByColor };
    delete newFiles[colorToRemove];
    setUploadedFilesByColor(newFiles);
  };

  const addSize = (sizeValue = null) => {
    console.log('addSize called with:', { sizeValue, newSize, currentSizes: sizes });
    const valueToAdd = sizeValue || newSize;
    if (valueToAdd.trim() && !sizes.includes(valueToAdd.trim())) {
      console.log('Adding size:', valueToAdd.trim());
      setSizes([...sizes, valueToAdd.trim()]);
      setNewSize("");
    } else {
      console.log('Size not added - either empty or already exists:', { valueToAdd: valueToAdd.trim(), exists: sizes.includes(valueToAdd.trim()) });
    }
  };

  const removeSize = (sizeToRemove) => {
    setSizes(sizes.filter(size => size !== sizeToRemove));
  };

  const addDecoration = (decorationValue = null) => {
    console.log('addDecoration called with:', { decorationValue, newDecoration, currentDecorations: decorations });
    const valueToAdd = decorationValue || newDecoration;
    if (valueToAdd.trim() && !decorations.includes(valueToAdd.trim())) {
      console.log('Adding decoration:', valueToAdd.trim());
      setDecorations([...decorations, valueToAdd.trim()]);
      setNewDecoration("");
    } else {
      console.log('Decoration not added - either empty or already exists:', { valueToAdd: valueToAdd.trim(), exists: decorations.includes(valueToAdd.trim()) });
    }
  };

  const removeDecoration = (decorationToRemove) => {
    setDecorations(decorations.filter(decoration => decoration !== decorationToRemove));
  };

  // File handling functions
  const handleFileSelect = (color, view, file) => {
    setUploadedFilesByColor(prev => ({
      ...prev,
      [color]: {
        ...prev[color],
        [view]: file
      }
    }));
  };

  const handleFileRemove = (view) => {
    // This would need to be updated to handle specific color/view combinations
    console.log(`Remove ${view} file`);
  };

  return (
    <Page>
      <style 
        dangerouslySetInnerHTML={{
          __html: `
            .sr-only {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border: 0;
            }
            
            .sr-only:focus {
              position: static;
              width: auto;
              height: auto;
              padding: 0.5rem;
              margin: 0;
              overflow: visible;
              clip: auto;
              white-space: normal;
              background: white;
              border: 2px solid #0066cc;
              border-radius: 4px;
              z-index: 1000;
            }
            
            *:focus {
              outline: 2px solid #0066cc;
              outline-offset: 2px;
            }
            
            a[href="#main-content"] {
              position: absolute;
              top: -40px;
              left: 6px;
              background: #0066cc;
              color: white;
              padding: 8px;
              text-decoration: none;
              border-radius: 4px;
              z-index: 1000;
              transition: top 0.3s;
            }
            
            a[href="#main-content"]:focus {
              top: 6px;
            }
          `
        }}
      />
      <TitleBar title="Product Setup" />
      <Layout>
        <Layout.Section>
          <BlockStack gap={isMobile ? "400" : "600"}>
            {/* Skip link for keyboard users */}
            <a href="#main-content">
              Skip to main content
            </a>
            
            {/* Keyboard navigation instructions */}
            <div className="sr-only" aria-live="polite">
              Use arrow keys to navigate between steps when not in form fields. Current step: {currentStep} of 4.
            </div>
            
            <div role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={4} aria-label={`Setup progress: Step ${currentStep} of 4`}>
              <ProgressIndicator currentStep={currentStep} />
            </div>
            
            {/* Error Banner */}
            {errorMessage && (
              <Banner status="critical" onDismiss={() => setErrorMessage("")}>
                <p>{errorMessage}</p>
              </Banner>
            )}
          
          <main id="main-content">
          {currentStep === 0 && (
            <WelcomeScreen onStart={onStart} />
          )}
          
          {currentStep === 1 && (
            <Card>
              <BlockStack gap={isMobile ? "300" : "400"}>
                <BlockStack gap="200">
                  <div ref={stepRefs.step1} tabIndex={-1}>
                    <Text variant={isMobile ? "headingMd" : "headingLg"} as="h2" id="step1-heading">
                      Step 1: Select or Create Product
                    </Text>
                  </div>
                  <Text variant="bodyMd" tone="subdued">
                    Choose an existing product from your store or create a new one. This will be the base product that customers can customize with different options.
                  </Text>
                </BlockStack>
                
                {showValidation && stepErrors.product && (
                  <Banner status="critical">
                    <p>{stepErrors.product}</p>
                  </Banner>
                )}
                
                <Card background="bg-surface-info">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">💡 Helpful Tips</Text>
                    <Text variant="bodyMd">
                      <strong>Existing Product:</strong> Choose this if you already have a product in your store that you want to make customizable.
                    </Text>
                    <Text variant="bodyMd">
                      <strong>New Product:</strong> Choose this to create a brand new customizable product from scratch.
                    </Text>
                  </BlockStack>
                </Card>
                
                <BlockStack gap="300">
                  <fieldset>
                    <legend className="sr-only">Product Creation Method</legend>
                    <InlineStack gap={isMobile ? "200" : "300"} wrap={isMobile}>
                      <Button
                        variant={!isCreatingProduct ? "primary" : "secondary"}
                        onClick={() => setIsCreatingProduct(false)}
                        size={isMobile ? "large" : "medium"}
                        ariaPressed={!isCreatingProduct}
                        ariaLabel="Select an existing product from your store"
                      >
                        Select Existing Product
                      </Button>
                      <Button
                        variant={isCreatingProduct ? "primary" : "secondary"}
                        onClick={() => setIsCreatingProduct(true)}
                        size={isMobile ? "large" : "medium"}
                        ariaPressed={isCreatingProduct}
                        ariaLabel="Create a new product for customization"
                      >
                        Create New Product
                      </Button>
                    </InlineStack>
                  </fieldset>
                  
                  {isCreatingProduct ? (
                    <BlockStack gap="200">
                      <TextField
                        label="Product Title"
                        value={newProductTitle}
                        onChange={setNewProductTitle}
                        placeholder="e.g., Custom T-Shirt, Personalized Mug, Custom Hoodie"
                        helpText="Choose a clear, descriptive name that customers will easily understand."
                        autoComplete="off"
                        error={showValidation && stepErrors.product ? stepErrors.product : undefined}
                        ariaDescribedBy="product-title-help"
                        required
                      />
                      <Text variant="bodyMd" tone="subdued" id="product-title-help">
                        💡 <strong>Examples:</strong> "Custom Logo T-Shirt", "Personalized Coffee Mug", "Custom Team Jersey"
                      </Text>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="200">
                      <Select
                        label="Select Product"
                        helpText="Choose from your existing products. Only active products are recommended for customization."
                        options={[
                          { label: "Choose a product...", value: "", key: "empty-option" },
                          ...products
                            .filter(product => product.id && product.title) // Filter out invalid products
                            .map((product, index) => ({
                              label: `${product.title} (${product.status})`,
                              value: product.id,
                              key: product.id || `product-${index}` // Ensure unique key
                            }))
                        ]}
                        value={selectedProduct || ""}
                        onChange={(value) => {
                          setSelectedProduct(value);
                          const product = products.find(p => p.id === value);
                          if (product) {
                            setProductId(value);
                            fetchExistingVariants(value);
                          } else {
                            setExistingVariants([]);
                          }
                        }}
                        placeholder="Choose a product..."
                        ariaDescribedBy="product-select-help"
                        required
                       />
                       {!selectedProduct && (
                         <Text variant="bodyMd" tone="subdued" id="product-select-help">
                           💡 <strong>Tip:</strong> Look for products that would benefit from customization options like t-shirts, mugs, or accessories.
                         </Text>
                       )}
                    </BlockStack>
                   )}
                   
                   {!isCreatingProduct && selectedProduct && (
                     <Card background="bg-surface-secondary">
                       <BlockStack gap="200">
                         <Text variant="headingSm">Selected Product Details</Text>
                         {(() => {
                           const product = products.find(p => p.id === selectedProduct);
                           return product ? (
                             <BlockStack gap="100">
                               <Text variant="bodyMd"><strong>Title:</strong> {product.title}</Text>
                               <Text variant="bodyMd"><strong>Status:</strong> <Badge status={product.status === 'ACTIVE' ? 'success' : 'attention'}>{product.status}</Badge></Text>
                               {product.productType && <Text variant="bodyMd"><strong>Type:</strong> {product.productType}</Text>}
                               {product.vendor && <Text variant="bodyMd"><strong>Vendor:</strong> {product.vendor}</Text>}
                             </BlockStack>
                           ) : null;
                         })()}
                       </BlockStack>
                     </Card>
                   )}

                   {!isCreatingProduct && selectedProduct && (
                     <Card background="bg-surface-secondary">
                       <BlockStack gap="300">
                         <InlineStack gap="200" align="space-between">
                         <Text variant="headingSm">Existing Variants</Text>
                           {productData?.metafields && (
                             <Button
                               variant="secondary"
                               onClick={() => populateFromMetafields(productData.metafields)}
                             >
                               📥 Populate from Metafields
                             </Button>
                           )}
                         </InlineStack>
                         {loadingVariants ? (
                           <Text variant="bodyMd" tone="subdued">Loading existing variants...</Text>
                         ) : existingVariants.length > 0 ? (
                           <BlockStack gap="200">
                             <Text variant="bodyMd" tone="subdued">
                               This product already has {existingVariants.length} variant(s). New variants with the same options will be skipped.
                             </Text>
                             <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                               <BlockStack gap="100">
                                 {existingVariants.map((variant, index) => (
                                   <div key={variant.id || index} style={{ 
                                     padding: '8px 12px', 
                                     backgroundColor: 'var(--p-color-bg-surface)', 
                                     borderRadius: '4px',
                                     border: '1px solid var(--p-color-border-subdued)'
                                   }}>
                                     <InlineStack gap="200" align="space-between">
                                       <Text variant="bodyMd">{variant.title}</Text>
                                       <Text variant="bodyMd" tone="subdued">${variant.price}</Text>
                                     </InlineStack>
                                   </div>
                                 ))}
                               </BlockStack>
                             </div>
                           </BlockStack>
                         ) : (
                           <Text variant="bodyMd" tone="subdued">
                             No existing variants found. You can create new variants for this product.
                           </Text>
                         )}
                       </BlockStack>
                     </Card>
                   )}
                </BlockStack>
              </BlockStack>
            </Card>
          )}
          
          {currentStep === 2 && (
            <Card>
              <BlockStack gap={isMobile ? "300" : "400"}>
                <BlockStack gap="200">
                  <div ref={stepRefs.step2} tabIndex={-1}>
                    <Text variant={isMobile ? "headingMd" : "headingLg"} as="h2">
                      Step 2: Configure Product Options
                    </Text>
                  </div>
                  <Text variant="bodyMd" tone="subdued">
                    Set up the customization options that customers can choose from. Add colors, sizes, decoration types, and set your pricing.
                  </Text>
                </BlockStack>
                
                {showValidation && Object.keys(stepErrors).length > 0 && (
                  <Banner status="critical">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Please fix the following issues:</Text>
                      {stepErrors.colors && <Text variant="bodyMd">• {stepErrors.colors}</Text>}
                      {stepErrors.sizes && <Text variant="bodyMd">• {stepErrors.sizes}</Text>}
                      {stepErrors.decorations && <Text variant="bodyMd">• {stepErrors.decorations}</Text>}
                      {stepErrors.price && <Text variant="bodyMd">• {stepErrors.price}</Text>}
                    </BlockStack>
                  </Banner>
                )}
                
                <Card background="bg-surface-info">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">📋 Quick Guide</Text>
                    <Text variant="bodyMd">
                      <strong>Colors:</strong> Available color options (e.g., Red, Blue, Black)
                    </Text>
                    <Text variant="bodyMd">
                      <strong>Sizes:</strong> Size variations (e.g., S, M, L, XL)
                    </Text>
                    <Text variant="bodyMd">
                      <strong>Decorations:</strong> Customization methods (e.g., Screen Print, Embroidery, Heat Transfer)
                    </Text>
                  </BlockStack>
                </Card>
                
                <BlockStack gap="400">
                  {/* Colors Section */}
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h3">🎨 Available Colors</Text>
                        <Text variant="bodyMd" tone="subdued">
                          Add color options that customers can choose from
                        </Text>
                      </BlockStack>
                      <ColorAutocomplete
                        value={newColor}
                        onChange={setNewColor}
                        onAdd={addColor}
                        existingColors={existingColors || []}
                        placeholder="e.g., Red, Navy Blue, Forest Green"
                        helpText="Enter color names that customers will understand"
                        error={showValidation && stepErrors.colors ? stepErrors.colors : undefined}
                      />
                      {colors.length === 0 && (
                        <Text variant="bodyMd" tone="subdued">
                          💡 <strong>Examples:</strong> Red, Blue, Black, White, Navy, Forest Green
                        </Text>
                      )}
                      <InlineStack gap="200" wrap>
                        {colors.map((color) => (
                          <Tag key={color} onRemove={() => removeColor(color)}>
                            {color}
                          </Tag>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                  
                  {/* Sizes Section */}
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h3">📏 Available Sizes</Text>
                        <Text variant="bodyMd" tone="subdued">
                          Add size options for your product
                        </Text>
                      </BlockStack>
                      <SizeAutocomplete
                        value={newSize}
                        onChange={setNewSize}
                        onAdd={addSize}
                        existingSizes={existingSizes}
                        placeholder="e.g., S, M, L, XL"
                        helpText="Use standard size abbreviations or measurements"
                        error={showValidation && stepErrors.sizes ? stepErrors.sizes : undefined}
                      />
                      {sizes.length === 0 && (
                        <Text variant="bodyMd" tone="subdued">
                          💡 <strong>Examples:</strong> XS, S, M, L, XL, XXL or 12oz, 16oz, 20oz
                        </Text>
                      )}
                      <InlineStack gap="200" wrap>
                        {sizes.map((size) => (
                          <Tag key={size} onRemove={() => removeSize(size)}>
                            {size}
                          </Tag>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                  
                  {/* Decorations Section */}
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <BlockStack gap="100">
                        <Text variant="headingSm" as="h3">✨ Decoration Methods</Text>
                        <Text variant="bodyMd" tone="subdued">
                          Add the customization methods you offer
                        </Text>
                      </BlockStack>
                      <DecorationAutocomplete
                        value={newDecoration}
                        onChange={setNewDecoration}
                        onAdd={addDecoration}
                        existingDecorations={existingDecorations}
                        placeholder="e.g., Screen Print, Embroidery, Heat Transfer"
                        helpText="How will the custom design be applied?"
                        error={showValidation && stepErrors.decorations ? stepErrors.decorations : undefined}
                      />
                      {decorations.length === 0 && (
                        <Text variant="bodyMd" tone="subdued">
                          💡 <strong>Examples:</strong> Screen Print, Embroidery, Heat Transfer, Digital Print, Vinyl
                        </Text>
                      )}
                      <InlineStack gap="200" wrap>
                        {decorations.map((decoration) => (
                          <Tag key={decoration} onRemove={() => removeDecoration(decoration)}>
                            {decoration}
                          </Tag>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                  
                  {/* Price Section */}
                  <BlockStack gap="200">
                    <TextField
                      label="💰 Base Price"
                      type="number"
                      value={price}
                      onChange={setPrice}
                      prefix="$"
                      step="0.01"
                      min="0"
                      helpText="Set the starting price for your customizable product"
                      placeholder="0.00"
                      autoComplete="off"
                      error={showValidation && stepErrors.price ? stepErrors.price : undefined}
                    />
                    <Text variant="bodyMd" tone="subdued">
                      💡 This is the base price before any customization options. Consider your costs and desired profit margin.
                    </Text>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          )}
          
          {currentStep === 3 && (
            <Card>
              <BlockStack gap={isMobile ? "300" : "400"}>
                <BlockStack gap="200">
                  <div ref={stepRefs.step3} tabIndex={-1}>
                    <Text variant={isMobile ? "headingMd" : "headingLg"} as="h2">
                      Step 3: Select Variants to Configure
                    </Text>
                  </div>
                  <Text variant="bodyMd" tone="subdued">
                    Choose which existing variants you want to configure with custom designs. You can select multiple variants to apply the same design to.
                  </Text>
                </BlockStack>

                {showValidation && Object.keys(stepErrors).length > 0 && (
                  <Banner status="critical">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Please fix the following issues:</Text>
                      {Object.entries(stepErrors).map(([key, error]) => (
                        <Text key={key} variant="bodyMd">• {error}</Text>
                      ))}
                    </BlockStack>
                  </Banner>
                )}

                <Card background="bg-surface-info">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">📋 Quick Guide</Text>
                    <Text variant="bodyMd">
                      Select the variants you want to configure with custom designs. Only variants that don't already have designs configured will be shown.
                    </Text>
                  </BlockStack>
                </Card>

                <BlockStack gap="400">
                  <Card>
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">Available Variants</Text>
                      {existingVariants.length > 0 ? (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <BlockStack gap="200">
                            {existingVariants.map((variant, index) => (
                              <div key={variant.id || index} style={{
                                padding: '12px',
                                border: '1px solid var(--p-color-border-subdued)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--p-color-bg-surface)'
                              }}>
                                <InlineStack gap="300" align="space-between">
                                  <BlockStack gap="100">
                                    <Text variant="bodyMd" fontWeight="semibold">{variant.title}</Text>
                                    <Text variant="bodySm" tone="subdued">${variant.price}</Text>
                                    {variant.selectedOptions && variant.selectedOptions.length > 0 && (
                                      <Text variant="bodySm" tone="subdued">
                                        Options: {variant.selectedOptions.map(opt => `${opt.name}: ${opt.value}`).join(', ')}
                                      </Text>
                                    )}
                                  </BlockStack>
                                  <Checkbox
                                    checked={selectedVariants.some(v => v.id === variant.id)}
                                    onChange={(checked) => {
                                      if (checked) {
                                        setSelectedVariants([...selectedVariants, variant]);
                                      } else {
                                        setSelectedVariants(selectedVariants.filter(v => v.id !== variant.id));
                                      }
                                    }}
                                  />
                                </InlineStack>
                              </div>
                            ))}
                          </BlockStack>
                        </div>
                      ) : (
                        <Text variant="bodyMd" tone="subdued">
                          No variants available. Please complete Step 2 to configure product options first.
                        </Text>
                      )}
                    </BlockStack>
                  </Card>

                  {selectedVariants.length > 0 && (
                    <Card background="bg-surface-success">
                      <BlockStack gap="200">
                        <Text variant="headingSm" as="h3">✅ Selected Variants ({selectedVariants.length})</Text>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <BlockStack gap="100">
                            {selectedVariants.map((variant, index) => (
                              <div key={variant.id || index} style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--p-color-bg-surface-secondary)',
                                borderRadius: '4px'
                              }}>
                                <Text variant="bodyMd">{variant.title}</Text>
                              </div>
                            ))}
                          </BlockStack>
                        </div>
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>

                <InlineStack gap="200">
                  <Button variant="secondary" onClick={prevStep}>
                    Previous
                  </Button>
                  <Button
                    primary
                    onClick={nextStep}
                    disabled={selectedVariants.length === 0}
                  >
                    Next: Upload Designs
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <BlockStack gap={isMobile ? "300" : "400"}>
                <BlockStack gap="200">
                  <div ref={stepRefs.step4} tabIndex={-1}>
                    <Text variant={isMobile ? "headingMd" : "headingLg"} as="h2">
                      Step 4: Upload Design Files
                    </Text>
                  </div>
                  <Text variant="bodyMd" tone="subdued">
                    Upload high-quality design files for each selected variant. These images will show customers what their customized product will look like.
                  </Text>
                </BlockStack>
                
                {showValidation && Object.keys(stepErrors).length > 0 && (
                  <Banner status="critical">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Please fix the following issues:</Text>
                      {Object.entries(stepErrors).map(([key, error]) => (
                        <Text key={key} variant="bodyMd">• {error}</Text>
                      ))}
                    </BlockStack>
                  </Banner>
                )}
                
                <Card background="bg-surface-info">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">📸 Image Guidelines</Text>
                    <Text variant="bodyMd">
                      <strong>Front View:</strong> Show the main design area where customization will appear
                    </Text>
                    <Text variant="bodyMd">
                      <strong>Back View:</strong> Show the back of the product (if applicable for your design)
                    </Text>
                    <Text variant="bodyMd">
                      <strong>Quality:</strong> Use high-resolution images (at least 1000x1000 pixels) for best results
                    </Text>
                    <Text variant="bodyMd">
                      <strong>Format:</strong> JPG, PNG, or WebP formats are supported
                    </Text>
                  </BlockStack>
                </Card>
                
                <BlockStack gap="400">
                  {colors.map((color) => (
                    <Card key={color} background="bg-surface-secondary">
                      <BlockStack gap="300">
                        <Text variant="headingSm" as="h3">{color}</Text>
                        <InlineStack gap={isMobile ? "200" : "400"} wrap={isMobile}>
                          <div style={{ flex: isMobile ? '1 1 100%' : 1, marginBottom: isMobile ? '16px' : '0' }}>
                            <Text variant="bodyMd" as="p">Front View</Text>
                            {uploadedFilesByColor[color]?.front ? (
                              <InlineStack gap="200" align="center">
                                <Text variant="bodySm">
                                  {uploadedFilesByColor[color].front.name}
                                </Text>
                                <Button
                                  size={isMobile ? "medium" : "micro"}
                                  onClick={() => handleFileRemove('front')}
                                >
                                  Remove
                                </Button>
                              </InlineStack>
                            ) : (
                              <input
                                type="file"
                                accept="image/*"
                                style={{ width: '100%', padding: isMobile ? '12px' : '8px' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileSelect(color, 'front', file);
                                  }
                                }}
                              />
                            )}
                          </div>
                          <div style={{ flex: isMobile ? '1 1 100%' : 1 }}>
                            <Text variant="bodyMd" as="p">Back View</Text>
                            {uploadedFilesByColor[color]?.back ? (
                              <InlineStack gap="200" align="center">
                                <Text variant="bodySm">
                                  {uploadedFilesByColor[color].back.name}
                                </Text>
                                <Button
                                  size={isMobile ? "medium" : "micro"}
                                  onClick={() => handleFileRemove('back')}
                                >
                                  Remove
                                </Button>
                              </InlineStack>
                            ) : (
                              <input
                                type="file"
                                accept="image/*"
                                style={{ width: '100%', padding: isMobile ? '12px' : '8px' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileSelect(color, 'back', file);
                                  }
                                }}
                              />
                            )}
                          </div>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          )}
          
          {currentStep === 4 && (
            <Card>
              <BlockStack gap={isMobile ? "300" : "400"}>
                <BlockStack gap="200">
                  <div ref={stepRefs.step4} tabIndex={-1}>
                    <Text variant={isMobile ? "headingMd" : "headingLg"} as="h2">
                      Step 4: Review & Launch Configuration
                    </Text>
                  </div>
                  <Text variant="bodyMd" tone="subdued">
                    Review all your settings before launching your customizable product. Once confirmed, product variants will be created in your store.
                  </Text>
                </BlockStack>
                
                {showValidation && Object.keys(stepErrors).length > 0 && (
                  <Banner status="critical">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Please fix the following issues:</Text>
                      {Object.entries(stepErrors).map(([key, error]) => (
                        <Text key={key} variant="bodyMd">• {error}</Text>
                      ))}
                    </BlockStack>
                  </Banner>
                )}
                
                <Card background="bg-surface-success">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">🎉 Almost Ready!</Text>
                    <Text variant="bodyMd">
                      Your customizable product is almost ready to go live. Review the details below and click "Generate Product Variants" to create all the combinations for your customers.
                    </Text>
                  </BlockStack>
                </Card>
                
                <BlockStack gap="400">
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">Product Information</Text>
                      <Text variant="bodyMd">
                        Product: {selectedProduct?.title || newProductTitle || 'Not selected'}
                      </Text>
                      <Text variant="bodyMd">Price: ${price}</Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">Options</Text>
                      <Text variant="bodyMd">Colors: {colors.join(', ')}</Text>
                      <Text variant="bodyMd">Sizes: {sizes.join(', ')}</Text>
                      <Text variant="bodyMd">Decorations: {decorations.join(', ')}</Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">Uploaded Files</Text>
                      {colors.map((color) => (
                        <div key={color}>
                          <Text variant="bodyMd" fontWeight="medium">{color}:</Text>
                          <Text variant="bodySm">
                            Front: {uploadedFilesByColor[color]?.front?.name || 'Not uploaded'}
                          </Text>
                          <Text variant="bodySm">
                            Back: {uploadedFilesByColor[color]?.back?.name || 'Not uploaded'}
                          </Text>
                        </div>
                      ))}
                    </BlockStack>
                  </Card>
                  
                  <Button
                    variant="primary"
                    size="large"
                    onClick={() => {
                      const errors = validateStep4();
                      setStepErrors(errors);
                      setShowValidation(true);
                      
                      if (Object.keys(errors).length === 0) {
                        setShowConfirmation(true);
                      }
                    }}
                  >
                    Launch Product Configuration
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
          )}
          
          {/* Navigation */}
          <Card>
            <InlineStack gap={isMobile ? "200" : "300"} align="space-between" wrap={isMobile}>
              <Button
                onClick={prevStep}
                disabled={currentStep === 0}
                size={isMobile ? "large" : "medium"}
              >
                Previous
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  size={isMobile ? "large" : "medium"}
                >
                  Next
                </Button>
              ) : null}
            </InlineStack>
          </Card>
          </main>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSubmission}
        productData={{
          title: selectedProduct?.title || newProductTitle,
          colors: colors.join(', '),
          sizes: sizes.join(', '),
          decorations: decorations.join(', '),
          price: price
        }}
      />
    </Page>
  );
}
