import { json, redirect } from "@remix-run/node";
import { useActionData, Form, useNavigation, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const productData = {
    title: formData.get("title"),
    descriptionHtml: formData.get("description"),
    vendor: formData.get("vendor"),
    productType: formData.get("productType"),
    handle: formData.get("handle"),
    status: formData.get("status"),
    tags: formData.get("tags")?.split(",").map(tag => tag.trim()).filter(Boolean) || [],
  };

  // Validate required fields
  if (!productData.title) {
    return json({ error: "Product title is required" }, { status: 400 });
  }

  try {
    const mutation = `#graphql
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        input: productData
      }
    });

    const result = await response.json();
    const errors = result?.data?.productCreate?.userErrors || [];
    
    if (errors.length > 0) {
      return json({ errors }, { status: 400 });
    }

    const product = result?.data?.productCreate?.product;
    
    // Create default variant if product was created successfully
    if (product?.id) {
      const variantMutation = `#graphql
        mutation productVariantCreate($input: ProductVariantInput!) {
          productVariantCreate(input: $input) {
            productVariant {
              id
              price
              sku
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variantData = {
        productId: product.id,
        price: formData.get("price") || "0.00",
        sku: formData.get("sku") || "",
        inventoryQuantities: [{
          availableQuantity: parseInt(formData.get("inventory") || "0"),
          locationId: "gid://shopify/Location/1" // You might want to get actual location
        }],
        inventoryPolicy: "DENY",
        requiresShipping: formData.get("requiresShipping") === "on",
        taxable: formData.get("taxable") === "on",
        weight: parseFloat(formData.get("weight") || "0"),
        weightUnit: formData.get("weightUnit") || "POUNDS"
      };

      await admin.graphql(variantMutation, {
        variables: { input: variantData }
      });
    }

    return redirect(`/app/products/${encodeURIComponent(product.id)}`);
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

export default function NewProduct() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    vendor: "",
    productType: "",
    handle: "",
    status: "DRAFT",
    tags: "",
    price: "0.00",
    sku: "",
    inventory: "0",
    requiresShipping: true,
    taxable: true,
    weight: "0",
    weightUnit: "POUNDS"
  });

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate handle from title
    if (field === "title") {
      const handle = value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, handle }));
    }
  };

  const statusOptions = [
    { label: "Draft", value: "DRAFT" },
    { label: "Active", value: "ACTIVE" },
    { label: "Archived", value: "ARCHIVED" }
  ];

  const weightUnitOptions = [
    { label: "Pounds", value: "POUNDS" },
    { label: "Ounces", value: "OUNCES" },
    { label: "Kilograms", value: "KILOGRAMS" },
    { label: "Grams", value: "GRAMS" }
  ];

  return (
    <Page>
      <TitleBar title="Add Product" />
      
      <Layout>
        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              {actionData?.error && (
                <Banner tone="critical">
                  <p>{actionData.error}</p>
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

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Product Information</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Product Title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange("title")}
                      placeholder="e.g. Custom T-Shirt"
                      requiredIndicator
                    />
                    
                    <TextField
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange("description")}
                      multiline={4}
                      placeholder="Describe your product..."
                    />

                    <InlineStack gap="400">
                      <TextField
                        label="Vendor"
                        name="vendor"
                        value={formData.vendor}
                        onChange={handleInputChange("vendor")}
                        placeholder="Brand or manufacturer"
                      />
                      
                      <TextField
                        label="Product Type"
                        name="productType"
                        value={formData.productType}
                        onChange={handleInputChange("productType")}
                        placeholder="e.g. Apparel, Accessories"
                      />
                    </InlineStack>

                    <TextField
                      label="Handle"
                      name="handle"
                      value={formData.handle}
                      onChange={handleInputChange("handle")}
                      placeholder="product-url-handle"
                      helpText="This will be used in the product URL"
                    />

                    <InlineStack gap="400">
                      <Select
                        label="Status"
                        name="status"
                        options={statusOptions}
                        value={formData.status}
                        onChange={handleInputChange("status")}
                      />
                      
                      <TextField
                        label="Tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange("tags")}
                        placeholder="custom, apparel, personalized"
                        helpText="Separate tags with commas"
                      />
                    </InlineStack>
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Pricing & Inventory</Text>
                  
                  <FormLayout>
                    <InlineStack gap="400">
                      <TextField
                        label="Price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleInputChange("price")}
                        prefix="$"
                      />
                      
                      <TextField
                        label="SKU"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange("sku")}
                        placeholder="Product SKU"
                      />
                    </InlineStack>

                    <TextField
                      label="Inventory Quantity"
                      name="inventory"
                      type="number"
                      min="0"
                      value={formData.inventory}
                      onChange={handleInputChange("inventory")}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Shipping & Tax</Text>
                  
                  <FormLayout>
                    <InlineStack gap="400">
                      <Checkbox
                        label="This product requires shipping"
                        name="requiresShipping"
                        checked={formData.requiresShipping}
                        onChange={handleInputChange("requiresShipping")}
                      />
                      
                      <Checkbox
                        label="This product is taxable"
                        name="taxable"
                        checked={formData.taxable}
                        onChange={handleInputChange("taxable")}
                      />
                    </InlineStack>

                    <InlineStack gap="400">
                      <TextField
                        label="Weight"
                        name="weight"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight}
                        onChange={handleInputChange("weight")}
                      />
                      
                      <Select
                        label="Weight Unit"
                        name="weightUnit"
                        options={weightUnitOptions}
                        value={formData.weightUnit}
                        onChange={handleInputChange("weightUnit")}
                      />
                    </InlineStack>
                  </FormLayout>
                </BlockStack>
              </Card>

              <InlineStack gap="300" align="end">
                <Button onClick={() => navigate('/app/products')}>Cancel</Button>
                <Button
                  variant="primary"
                  submit
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Product"}
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
