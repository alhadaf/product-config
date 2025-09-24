import { json } from "@remix-run/node";
import { useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  Text,
  ProgressBar,
  List,
  Icon,
} from "@shopify/polaris";
import { CheckIcon, AlertTriangleIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

// Demo data structure
const DEMO_PRODUCTS = [
  {
    title: "Classic Cotton T-Shirt",
    description: "Comfortable 100% cotton t-shirt perfect for custom designs",
    productType: "T-Shirt",
    vendor: "Demo Vendor",
    tags: ["cotton", "basic", "customizable"],
    variants: [
      { option1: "Black", option2: "XS", price: "15.99", sku: "CT-BLK-XS" },
      { option1: "Black", option2: "S", price: "15.99", sku: "CT-BLK-S" },
      { option1: "Black", option2: "M", price: "15.99", sku: "CT-BLK-M" },
      { option1: "Black", option2: "L", price: "15.99", sku: "CT-BLK-L" },
      { option1: "Black", option2: "XL", price: "15.99", sku: "CT-BLK-XL" },
      { option1: "White", option2: "XS", price: "15.99", sku: "CT-WHT-XS" },
      { option1: "White", option2: "S", price: "15.99", sku: "CT-WHT-S" },
      { option1: "White", option2: "M", price: "15.99", sku: "CT-WHT-M" },
      { option1: "White", option2: "L", price: "15.99", sku: "CT-WHT-L" },
      { option1: "White", option2: "XL", price: "15.99", sku: "CT-WHT-XL" },
      { option1: "Navy", option2: "XS", price: "15.99", sku: "CT-NVY-XS" },
      { option1: "Navy", option2: "S", price: "15.99", sku: "CT-NVY-S" },
      { option1: "Navy", option2: "M", price: "15.99", sku: "CT-NVY-M" },
      { option1: "Navy", option2: "L", price: "15.99", sku: "CT-NVY-L" },
      { option1: "Navy", option2: "XL", price: "15.99", sku: "CT-NVY-XL" },
    ],
    options: [
      { name: "Color", values: ["Black", "White", "Navy", "Red", "Royal Blue"] },
      { name: "Size", values: ["XS", "S", "M", "L", "XL", "2XL"] }
    ]
  },
  {
    title: "Premium Hoodie",
    description: "Cozy fleece hoodie with kangaroo pocket",
    productType: "Hoodie",
    vendor: "Demo Vendor",
    tags: ["fleece", "premium", "customizable"],
    variants: [
      { option1: "Black", option2: "S", price: "35.99", sku: "PH-BLK-S" },
      { option1: "Black", option2: "M", price: "35.99", sku: "PH-BLK-M" },
      { option1: "Black", option2: "L", price: "35.99", sku: "PH-BLK-L" },
      { option1: "Black", option2: "XL", price: "35.99", sku: "PH-BLK-XL" },
      { option1: "Charcoal", option2: "S", price: "35.99", sku: "PH-CHR-S" },
      { option1: "Charcoal", option2: "M", price: "35.99", sku: "PH-CHR-M" },
      { option1: "Charcoal", option2: "L", price: "35.99", sku: "PH-CHR-L" },
      { option1: "Charcoal", option2: "XL", price: "35.99", sku: "PH-CHR-XL" },
    ],
    options: [
      { name: "Color", values: ["Black", "Charcoal", "Navy", "Maroon"] },
      { name: "Size", values: ["S", "M", "L", "XL", "2XL", "3XL"] }
    ]
  },
  {
    title: "Performance Polo",
    description: "Moisture-wicking polo shirt for active wear",
    productType: "Polo",
    vendor: "Demo Vendor",
    tags: ["performance", "polo", "customizable"],
    variants: [
      { option1: "White", option2: "S", price: "28.99", sku: "PP-WHT-S" },
      { option1: "White", option2: "M", price: "28.99", sku: "PP-WHT-M" },
      { option1: "White", option2: "L", price: "28.99", sku: "PP-WHT-L" },
      { option1: "Navy", option2: "S", price: "28.99", sku: "PP-NVY-S" },
      { option1: "Navy", option2: "M", price: "28.99", sku: "PP-NVY-M" },
      { option1: "Navy", option2: "L", price: "28.99", sku: "PP-NVY-L" },
    ],
    options: [
      { name: "Color", values: ["White", "Black", "Navy", "Red"] },
      { name: "Size", values: ["XS", "S", "M", "L", "XL", "2XL", "3XL"] }
    ]
  }
];

const DEMO_METAOBJECTS = [
  {
    type: "design",
    fields: {
      title: "Logo Design #1",
      status: "approved",
      customer_email: "john@example.com",
      design_notes: "Simple logo design for t-shirt front",
      product_id: "",
      decoration_type: "screenprint"
    }
  },
  {
    type: "design", 
    fields: {
      title: "Custom Artwork #2",
      status: "pending",
      customer_email: "sarah@example.com", 
      design_notes: "Full back design with multiple colors",
      product_id: "",
      decoration_type: "digital_print"
    }
  }
];

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const results = {
      products: [],
      metaobjects: [],
      errors: []
    };

    // Create products using the same pattern as app.setup.jsx
    for (const productData of DEMO_PRODUCTS) {
      try {
        // First create the basic product
        const productMutation = `#graphql
          mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
              product {
                id
                title
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const productInput = {
          title: productData.title,
          descriptionHtml: productData.description,
          productType: productData.productType,
          vendor: productData.vendor,
          tags: productData.tags,
          status: "ACTIVE"
        };

        const productResponse = await admin.graphql(productMutation, {
          variables: { input: productInput }
        });

        const productResult = await productResponse.json();
        const userErrors = productResult?.data?.productCreate?.userErrors || [];
        
        if (userErrors.length > 0) {
          results.errors.push(`Product creation errors for ${productData.title}: ${userErrors.map(e => e.message).join(', ')}`);
          continue;
        }
        
        const product = productResult?.data?.productCreate?.product;
        if (!product) {
          results.errors.push(`Failed to create product: ${productData.title}`);
          continue;
        }

        const productId = product.id;
        results.products.push(product);

        // Add product options
        for (const option of productData.options) {
          const optionMutation = `#graphql
            mutation productOptionCreate($productId: ID!, $option: ProductOptionInput!) {
              productOptionCreate(productId: $productId, option: $option) {
                productOption { id name values }
                userErrors { field message }
              }
            }
          `;
          
          await admin.graphql(optionMutation, {
            variables: {
              productId: productId,
              option: option
            }
          });
        }

        // Create variants
        const variantMutation = `#graphql
          mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkCreate(productId: $productId, variants: $variants) {
              productVariants {
                id
                title
                sku
                price
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variantsInput = productData.variants.map(variant => ({
          optionValues: [
            { optionName: "Color", name: variant.option1 },
            { optionName: "Size", name: variant.option2 }
          ],
          price: variant.price,
          sku: variant.sku
        }));

        await admin.graphql(variantMutation, {
          variables: {
            productId: productId,
            variants: variantsInput
          }
        });

      } catch (error) {
        results.errors.push(`Error creating product ${productData.title}: ${error.message}`);
      }
    }

    // Ensure design definition exists before creating designs
    const { ensureDesignDefinition } = await import("../utils/designs.server");
    await ensureDesignDefinition(request);

    // Create metaobjects (designs)
    for (const metaData of DEMO_METAOBJECTS) {
      try {
        const metaobjectMutation = `#graphql
          mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
            metaobjectCreate(metaobject: $metaobject) {
              metaobject {
                id
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const metaobjectInput = {
          type: metaData.type,
          fields: Object.entries(metaData.fields).map(([key, value]) => ({
            key,
            value: value.toString()
          }))
        };

        const metaResponse = await admin.graphql(metaobjectMutation, {
          variables: { metaobject: metaobjectInput }
        });

        const metaResult = await metaResponse.json();
        const userErrors = metaResult?.data?.metaobjectCreate?.userErrors || [];
        
        if (userErrors.length > 0) {
          results.errors.push(`Design creation errors for ${metaData.fields.title}: ${userErrors.map(e => e.message).join(', ')}`);
          continue;
        }
        
        if (metaResult.data?.metaobjectCreate?.metaobject) {
          results.metaobjects.push(metaResult.data.metaobjectCreate.metaobject);
        } else {
          results.errors.push(`Failed to create design: ${metaData.fields.title}`);
        }
      } catch (error) {
        results.errors.push(`Error creating design ${metaData.fields.title}: ${error.message}`);
      }
    }

    return json({ 
      success: true, 
      message: `Successfully imported ${results.products.length} products and ${results.metaobjects.length} designs`,
      results,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error) {
    return json({ 
      success: false, 
      message: `Import failed: ${error.message}`,
      error: error.message 
    }, { status: 500 });
  }
};

export default function ImportDemo() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isImporting = navigation.state === "submitting";

  return (
    <Page
      title="Demo Data Import"
      subtitle="Import sample products and designs with one click"
      backAction={{ content: "Back", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: "20px" }}>
              <Text variant="headingMd" as="h2">
                One-Click Demo Data Import
              </Text>
              <div style={{ marginTop: "16px", marginBottom: "20px" }}>
                <Text as="p">
                  This will import sample data to help you test the Product Configurator:
                </Text>
                <div style={{ marginTop: "12px" }}>
                  <List>
                    <List.Item>3 demo products (T-Shirt, Hoodie, Polo) with variants</List.Item>
                    <List.Item>Sample design submissions with different statuses</List.Item>
                    <List.Item>Decoration type configurations</List.Item>
                    <List.Item>Customer design orders and notes</List.Item>
                  </List>
                </div>
              </div>

              {isImporting && (
                <div style={{ marginBottom: "20px" }}>
                  <Text variant="headingMd" as="h3">
                    Importing Demo Data...
                  </Text>
                  <div style={{ marginTop: "8px" }}>
                    <ProgressBar progress={75} />
                  </div>
                  <Text as="p" tone="subdued" style={{ marginTop: "8px" }}>
                    Creating products and designs in your store...
                  </Text>
                </div>
              )}

              {actionData?.success && (
                <div style={{ marginBottom: "20px" }}>
                  <Banner status="success">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon source={CheckIcon} />
                      <Text variant="bodyMd">
                        {actionData.message}
                      </Text>
                    </div>
                  </Banner>
                </div>
              )}

              {actionData?.success === false && (
                <div style={{ marginBottom: "20px" }}>
                  <Banner status="critical">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon source={AlertTriangleIcon} />
                      <Text variant="bodyMd">
                        {actionData.message}
                      </Text>
                    </div>
                  </Banner>
                </div>
              )}

              <Form method="post">
                <Button
                  submit
                  primary
                  loading={isImporting}
                  disabled={isImporting}
                  size="large"
                >
                  {isImporting ? "Importing..." : "Import Demo Data"}
                </Button>
              </Form>

              <div style={{ marginTop: "20px" }}>
                <Text as="p" tone="subdued">
                  <strong>Note:</strong> This will create real products in your store. 
                  You can delete them later if needed.
                </Text>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}