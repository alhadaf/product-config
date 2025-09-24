import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
  BlockStack,
  Banner,
  Checkbox,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Get current settings from metafields
  const query = `#graphql
    query {
      shop {
        id
        metafields(first: 20, namespace: "custom") {
          nodes {
            key
            value
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query);
  const data = await response.json();
  const metafields = data?.data?.shop?.metafields?.nodes || [];
  
  const settings = Object.fromEntries(
    metafields.map(field => [field.key, field.value])
  );

  return json({ settings });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    app_name: formData.get("app_name") || "Product Configurator",
    default_decoration_type: formData.get("default_decoration_type") || "screenprint",
    auto_approve_designs: formData.get("auto_approve_designs") === "on",
    notification_email: formData.get("notification_email") || "",
    max_file_size_mb: formData.get("max_file_size_mb") || "10",
    allowed_file_types: formData.get("allowed_file_types") || "jpg,png,pdf,ai",
    design_approval_required: formData.get("design_approval_required") === "on",
    customer_notifications: formData.get("customer_notifications") === "on",
  };

  try {
    // Get shop ID first
    const shopQuery = `#graphql
      query {
        shop { id }
      }
    `;
    
    const shopResponse = await admin.graphql(shopQuery);
    const shopData = await shopResponse.json();
    const shopId = shopData?.data?.shop?.id;

    if (!shopId) {
      return json({ error: "Could not get shop ID" }, { status: 400 });
    }

    // Update metafields
    const mutation = `#graphql
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

    const metafields = Object.entries(settings).map(([key, value]) => ({
      ownerId: shopId,
      namespace: "custom",
      key,
      type: typeof value === "boolean" ? "boolean" : "single_line_text_field",
      value: String(value)
    }));

    const response = await admin.graphql(mutation, {
      variables: { metafields }
    });

    const result = await response.json();
    const errors = result?.data?.metafieldsSet?.userErrors || [];

    if (errors.length > 0) {
      return json({ errors }, { status: 400 });
    }

    return json({ success: true, message: "Settings saved successfully!" });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    app_name: settings.app_name || "Product Configurator",
    default_decoration_type: settings.default_decoration_type || "screenprint",
    auto_approve_designs: settings.auto_approve_designs === "true",
    notification_email: settings.notification_email || "",
    max_file_size_mb: settings.max_file_size_mb || "10",
    allowed_file_types: settings.allowed_file_types || "jpg,png,pdf,ai",
    design_approval_required: settings.design_approval_required === "true",
    customer_notifications: settings.customer_notifications === "true",
  });

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const decorationTypeOptions = [
    { label: "Screenprint", value: "screenprint" },
    { label: "Embroidery", value: "embroidery" },
    { label: "Heat Transfer", value: "heat_transfer" },
    { label: "Digital Print", value: "digital_print" },
  ];

  return (
    <Page>
      <TitleBar title="Settings" />
      
      <Layout>
        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              {actionData?.success && (
                <Banner tone="success">
                  <p>{actionData.message}</p>
                </Banner>
              )}
              
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
                  <Text variant="headingMd">General Settings</Text>
                  
                  <FormLayout>
                    <TextField
                      label="App Name"
                      name="app_name"
                      value={formData.app_name}
                      onChange={handleInputChange("app_name")}
                      placeholder="Product Configurator"
                    />
                    
                    <Select
                      label="Default Decoration Type"
                      name="default_decoration_type"
                      options={decorationTypeOptions}
                      value={formData.default_decoration_type}
                      onChange={handleInputChange("default_decoration_type")}
                    />

                    <TextField
                      label="Notification Email"
                      name="notification_email"
                      type="email"
                      value={formData.notification_email}
                      onChange={handleInputChange("notification_email")}
                      placeholder="admin@yourstore.com"
                      helpText="Email address to receive design notifications"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Design Settings</Text>
                  
                  <FormLayout>
                    <Checkbox
                      label="Auto-approve designs"
                      name="auto_approve_designs"
                      checked={formData.auto_approve_designs}
                      onChange={handleInputChange("auto_approve_designs")}
                      helpText="Automatically approve submitted designs without manual review"
                    />
                    
                    <Checkbox
                      label="Design approval required"
                      name="design_approval_required"
                      checked={formData.design_approval_required}
                      onChange={handleInputChange("design_approval_required")}
                      helpText="Require admin approval before designs can be processed"
                    />

                    <Checkbox
                      label="Send customer notifications"
                      name="customer_notifications"
                      checked={formData.customer_notifications}
                      onChange={handleInputChange("customer_notifications")}
                      helpText="Send email notifications to customers about design status"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">File Upload Settings</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Maximum File Size (MB)"
                      name="max_file_size_mb"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.max_file_size_mb}
                      onChange={handleInputChange("max_file_size_mb")}
                    />
                    
                    <TextField
                      label="Allowed File Types"
                      name="allowed_file_types"
                      value={formData.allowed_file_types}
                      onChange={handleInputChange("allowed_file_types")}
                      placeholder="jpg,png,pdf,ai"
                      helpText="Comma-separated list of allowed file extensions"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Button
                variant="primary"
                submit
                loading={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

