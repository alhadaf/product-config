import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Select,
  Checkbox,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Divider,
  FormLayout,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = decodeURIComponent(params.id);

  try {
    // Get product details including metafields
    const productQuery = `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          descriptionHtml
          handle
          vendor
          productType
          status
          tags
          options {
            id
            name
            values
          }
          variants(first: 250) {
            nodes {
              id
              title
              price
              sku
              inventoryQuantity
              selectedOptions {
                name
                value
              }
            }
          }
          images(first: 10) {
            nodes {
              id
              url
              altText
            }
          }
          metafields(first: 10, namespace: "custom") {
            nodes {
              key
              value
            }
          }
        }
      }
    `;

    const response = await admin.graphql(productQuery, {
      variables: { id: productId }
    });

    const result = await response.json();
    const product = result?.data?.product;

    if (!product) {
      throw new Response("Product not found", { status: 404 });
    }

    // Parse metafields to extract configuration data
    const metafields = product.metafields?.nodes || [];
    const metafieldData = Object.fromEntries(
      metafields.map(field => [field.key, field.value])
    );

    // Extract colors, sizes, and decorations from metafields
    const colors = metafieldData.colors ? JSON.parse(metafieldData.colors) : [];
    const sizes = metafieldData.sizes ? JSON.parse(metafieldData.sizes) : [];
    const decorations = metafieldData.decorations ? JSON.parse(metafieldData.decorations) : [];

    return json({ 
      product,
      configuration: {
        colors,
        sizes,
        decorations
      }
    });
  } catch (error) {
    console.error("Error loading product:", error);
    throw new Response("Error loading product", { status: 500 });
  }
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = decodeURIComponent(params.id);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "updateProduct") {
    try {
      const mutation = `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const input = {
        id: productId,
        title: formData.get("title"),
        descriptionHtml: formData.get("description"),
        vendor: formData.get("vendor"),
        productType: formData.get("productType"),
        status: formData.get("status"),
        tags: formData.get("tags")?.split(",").map(tag => tag.trim()).filter(Boolean) || [],
      };

      const response = await admin.graphql(mutation, {
        variables: { input }
      });

      const result = await response.json();
      const errors = result?.data?.productUpdate?.userErrors || [];

      if (errors.length > 0) {
        return json({ errors }, { status: 400 });
      }

      return json({ success: "Product updated successfully!" });
    } catch (error) {
      return json({ error: error.message }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function ProductEdit() {
  const { product, configuration } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    title: product.title || "",
    description: product.descriptionHtml || "",
    vendor: product.vendor || "",
    productType: product.productType || "",
    status: product.status || "DRAFT",
    tags: product.tags?.join(", ") || "",
  });

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const statusOptions = [
    { label: "Draft", value: "DRAFT" },
    { label: "Active", value: "ACTIVE" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  // Use configuration data from metafields
  const colors = configuration?.colors || [];
  const sizes = configuration?.sizes || [];
  const decorations = configuration?.decorations || [];

  return (
    <Page>
      <TitleBar title={`Edit Product: ${product.title}`}>
        <button 
          variant="primary" 
          onClick={() => window.open(`https://admin.shopify.com/store/${product.id.split('/')[4]}/products/${product.id.split('/')[5]}`, '_blank')}
        >
          View in Shopify Admin
        </button>
      </TitleBar>
      
      <Layout>
        <Layout.Section>
          <Form method="post">
            <input type="hidden" name="action" value="updateProduct" />
            
            <BlockStack gap="500">
              {actionData?.success && (
                <Banner tone="success">
                  <p>{actionData.success}</p>
                </Banner>
              )}

              {actionData?.errors && (
                <Banner tone="critical">
                  <BlockStack gap="200">
                    {actionData.errors.map((error, index) => (
                      <Text key={index}>{error.field}: {error.message}</Text>
                    ))}
                  </BlockStack>
                </Banner>
              )}

              {actionData?.error && (
                <Banner tone="critical">
                  <p>{actionData.error}</p>
                </Banner>
              )}

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Product Information</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Product Title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange("title")}
                      required
                    />

                    <TextField
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange("description")}
                      multiline={4}
                    />

                    <InlineStack gap="400">
                      <TextField
                        label="Vendor"
                        name="vendor"
                        value={formData.vendor}
                        onChange={handleInputChange("vendor")}
                      />

                      <TextField
                        label="Product Type"
                        name="productType"
                        value={formData.productType}
                        onChange={handleInputChange("productType")}
                      />
                    </InlineStack>

                    <InlineStack gap="400">
                      <Select
                        label="Status"
                        name="status"
                        options={statusOptions}
                        value={formData.status}
                        onChange={handleInputChange("status")}
                      />

                      <TextField
                        label="Tags (comma separated)"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange("tags")}
                        placeholder="tag1, tag2, tag3"
                      />
                    </InlineStack>
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Product Configuration Display */}
              {(colors.length > 0 || sizes.length > 0 || decorations.length > 0) && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Product Configuration</Text>
                    
                    {colors.length > 0 && (
                      <BlockStack gap="200">
                        <Text variant="headingSm">Colors</Text>
                        <Text>{colors.join(", ")}</Text>
                      </BlockStack>
                    )}

                    {sizes.length > 0 && (
                      <BlockStack gap="200">
                        <Text variant="headingSm">Sizes</Text>
                        <Text>{sizes.join(", ")}</Text>
                      </BlockStack>
                    )}

                    {decorations.length > 0 && (
                      <BlockStack gap="200">
                        <Text variant="headingSm">Decoration Methods</Text>
                        <Text>{decorations.join(", ")}</Text>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* Variants Display */}
              {product.variants?.nodes?.length > 0 && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd">Variants ({product.variants.nodes.length})</Text>
                    
                    <BlockStack gap="300">
                      {product.variants.nodes.slice(0, 10).map((variant) => (
                        <Card key={variant.id} background="bg-surface-secondary">
                          <InlineStack gap="400" align="space-between">
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="semibold">
                                {variant.title}
                              </Text>
                              <Text variant="bodySm" tone="subdued">
                                SKU: {variant.sku || "N/A"} | Inventory: {variant.inventoryQuantity || 0}
                              </Text>
                            </BlockStack>
                            <Text variant="bodyMd" fontWeight="semibold">
                              ${variant.price}
                            </Text>
                          </InlineStack>
                        </Card>
                      ))}
                      
                      {product.variants.nodes.length > 10 && (
                        <Text variant="bodySm" tone="subdued">
                          ... and {product.variants.nodes.length - 10} more variants
                        </Text>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  submit
                  loading={isSubmitting}
                >
                  Update Product
                </Button>
                
                <Button
                  onClick={() => navigate('/app/products')}
                >
                  Back to Products
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}