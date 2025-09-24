import { json } from "@remix-run/node";
import { useLoaderData, Link, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Text,
  Badge,
  InlineStack,
  BlockStack,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  const query = `#graphql
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            status
            totalInventory
            vendor
            productType
            createdAt
            updatedAt
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  inventoryQuantity
                  sku
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `;

  const response = await admin.graphql(query, {
    variables: { first: 50 }
  });
  
  const data = await response.json();
  const products = data?.data?.products?.edges || [];

  return json({ products });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const productId = formData.get("productId");

  if (action === "delete") {
    const mutation = `#graphql
      mutation productDelete($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `;

    await admin.graphql(mutation, {
      variables: {
        input: { id: productId }
      }
    });
  }

  return json({ success: true });
};

export default function ProductsIndex() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleDelete = (productId) => {
    if (confirm("Are you sure you want to delete this product?")) {
      fetcher.submit(
        { action: "delete", productId },
        { method: "post" }
      );
    }
  };

  const rows = products.map(({ node: product }) => {
    const image = product.images.edges[0]?.node;
    const variant = product.variants.edges[0]?.node;
    
    return [
      <InlineStack gap="300" align="start">
        {image && (
          <img 
            src={image.url} 
            alt={image.altText || product.title}
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
          />
        )}
        <BlockStack gap="100">
          <Text variant="bodyMd" fontWeight="semibold">
            {product.title}
          </Text>
          <Text variant="bodySm" color="subdued">
            {product.handle}
          </Text>
        </BlockStack>
      </InlineStack>,
      <Badge tone={product.status === 'ACTIVE' ? 'success' : 'critical'}>
        {product.status}
      </Badge>,
      product.productType || "—",
      product.vendor || "—",
      variant ? `$${variant.price}` : "—",
      product.totalInventory || 0,
      <InlineStack gap="200">
        <Button
          size="micro"
          onClick={() => navigate(`/app/products/${encodeURIComponent(product.id)}`)}
        >
          Edit
        </Button>
        <Button
          size="micro"
          tone="critical"
          onClick={() => handleDelete(product.id)}
          loading={fetcher.state === "submitting"}
        >
          Delete
        </Button>
      </InlineStack>
    ];
  });

  return (
    <Page>
      <TitleBar title="Products">
        <button variant="primary" onClick={() => navigate('/app/products/new')}>
          Add Product
        </button>
      </TitleBar>
      
      <Layout>
        <Layout.Section>
          <Card>
            {products.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text', 
                  'text',
                  'text',
                  'numeric',
                  'numeric',
                  'text'
                ]}
                headings={[
                  'Product',
                  'Status',
                  'Type',
                  'Vendor',
                  'Price',
                  'Inventory',
                  'Actions'
                ]}
                rows={rows}
              />
            ) : (
              <EmptyState
                heading="No products yet"
                action={{
                  content: 'Add Product',
                  onAction: () => navigate('/app/products/new')
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Start by adding your first product to manage your inventory.</p>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

