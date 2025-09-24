import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Grid,
  Thumbnail,
  EmptyState,
  Banner,
  Modal,
  TextField,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useCallback } from "react";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const orderId = params.id;

  // Get order details
  const orderResponse = await admin.graphql(`#graphql
    query getOrder($id: ID!) {
      order(id: $id) {
        id
        name
        email
        phone
        createdAt
        updatedAt
        displayFulfillmentStatus
        displayFinancialStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        subtotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalShippingPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalTaxSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          firstName
          lastName
          email
          phone
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              variant {
                id
                title
                product {
                  id
                  title
                  featuredImage {
                    url
                    altText
                  }
                }
              }
              customAttributes {
                key
                value
              }
            }
          }
        }
        shippingAddress {
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        billingAddress {
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        metafield(namespace: "custom", key: "design_ids") {
          value
        }
      }
    }
  `, {
    variables: { id: orderId }
  });

  const orderData = await orderResponse.json();
  const order = orderData?.data?.order;

  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  // Get design information if available
  let designs = [];
  if (order.metafield?.value) {
    try {
      const designIds = JSON.parse(order.metafield.value);
      if (designIds.length > 0) {
        const designsResponse = await admin.graphql(`#graphql
          query getDesigns($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Metaobject {
                id
                handle
                fields {
                  key
                  value
                }
              }
            }
          }
        `, {
          variables: { ids: designIds }
        });
        
        const designsData = await designsResponse.json();
        designs = designsData?.data?.nodes || [];
      }
    } catch (e) {
      console.error("Error parsing design IDs:", e);
    }
  }

  return json({ order, designs });
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const orderId = params.id;

  if (action === "fulfill") {
    try {
      const fulfillmentResponse = await admin.graphql(`#graphql
        mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
          fulfillmentCreate(fulfillment: $fulfillment) {
            fulfillment {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          fulfillment: {
            orderId: orderId,
            notifyCustomer: true,
          }
        }
      });

      const fulfillmentData = await fulfillmentResponse.json();
      
      if (fulfillmentData?.data?.fulfillmentCreate?.userErrors?.length > 0) {
        return json({ 
          error: fulfillmentData.data.fulfillmentCreate.userErrors[0].message 
        }, { status: 400 });
      }

      return json({ success: true });
    } catch (error) {
      return json({ error: "Failed to fulfill order" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function OrderDetail() {
  const { order, designs } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [fulfillModalOpen, setFulfillModalOpen] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'FULFILLED': { tone: 'success', children: 'Fulfilled' },
      'UNFULFILLED': { tone: 'attention', children: 'Unfulfilled' },
      'PARTIALLY_FULFILLED': { tone: 'warning', children: 'Partially Fulfilled' }
    };
    return statusMap[status] || { tone: 'info', children: status };
  };

  const getFinancialStatusBadge = (status) => {
    const statusMap = {
      'PAID': { tone: 'success', children: 'Paid' },
      'PENDING': { tone: 'warning', children: 'Pending' },
      'REFUNDED': { tone: 'critical', children: 'Refunded' },
      'PARTIALLY_PAID': { tone: 'warning', children: 'Partially Paid' },
      'PARTIALLY_REFUNDED': { tone: 'warning', children: 'Partially Refunded' }
    };
    return statusMap[status] || { tone: 'info', children: status };
  };

  const handleFulfill = useCallback(() => {
    setFulfillModalOpen(true);
  }, []);

  const handleFulfillConfirm = useCallback(() => {
    fetcher.submit(
      { action: "fulfill" },
      { method: "post" }
    );
    setFulfillModalOpen(false);
  }, [fetcher]);

  const getDesignFiles = (design) => {
    const files = [];
    design.fields.forEach(field => {
      if (field.key.includes('_file') && field.value) {
        files.push({
          side: field.key.replace('_file', ''),
          url: field.value
        });
      }
    });
    return files;
  };

  return (
    <Page>
      <TitleBar title={`Order #${order?.name || id}`}>
        <button variant="primary" onClick={() => navigate('/app/orders')}>
          Back to Orders
        </button>
      </TitleBar>
      
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Order Status Banner */}
            {order.displayFulfillmentStatus === 'UNFULFILLED' && (
              <Banner tone="warning">
                <p>This order is unfulfilled and ready for processing.</p>
              </Banner>
            )}

            {/* Order Summary */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Order Summary</Text>
                  <InlineStack gap="200">
                    <Badge {...getStatusBadge(order.displayFulfillmentStatus)} />
                    <Badge {...getFinancialStatusBadge(order.displayFinancialStatus)} />
                  </InlineStack>
                </InlineStack>
                
                <Grid>
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" color="subdued">Order Number</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{order.name}</Text>
                    </BlockStack>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" color="subdued">Order Date</Text>
                      <Text variant="bodyMd">{formatDate(order.createdAt)}</Text>
                    </BlockStack>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" color="subdued">Total</Text>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {order.totalPriceSet.shopMoney.currencyCode} {order.totalPriceSet.shopMoney.amount}
                      </Text>
                    </BlockStack>
                  </Grid.Cell>
                </Grid>

                {order.displayFulfillmentStatus === 'UNFULFILLED' && (
                  <InlineStack gap="200">
                    <Button 
                      variant="primary" 
                      onClick={handleFulfill}
                      loading={fetcher.state === "submitting"}
                    >
                      Fulfill Order
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>

            {/* Customer Information */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Customer Information</Text>
                
                {order.customer ? (
                  <Grid>
                    <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Customer</Text>
                        <Text variant="bodyMd">
                          {order.customer.firstName} {order.customer.lastName}
                        </Text>
                        <Text variant="bodyMd" color="subdued">{order.customer.email}</Text>
                        {order.customer.phone && (
                          <Text variant="bodyMd" color="subdued">{order.customer.phone}</Text>
                        )}
                      </BlockStack>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" color="subdued">Shipping Address</Text>
                        {order.shippingAddress ? (
                          <BlockStack gap="100">
                            <Text variant="bodyMd">
                              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                            </Text>
                            {order.shippingAddress.company && (
                              <Text variant="bodyMd">{order.shippingAddress.company}</Text>
                            )}
                            <Text variant="bodyMd">{order.shippingAddress.address1}</Text>
                            {order.shippingAddress.address2 && (
                              <Text variant="bodyMd">{order.shippingAddress.address2}</Text>
                            )}
                            <Text variant="bodyMd">
                              {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                            </Text>
                            <Text variant="bodyMd">{order.shippingAddress.country}</Text>
                          </BlockStack>
                        ) : (
                          <Text color="subdued">No shipping address</Text>
                        )}
                      </BlockStack>
                    </Grid.Cell>
                  </Grid>
                ) : (
                  <Text color="subdued">Guest customer</Text>
                )}
              </BlockStack>
            </Card>

            {/* Order Items */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Order Items</Text>
                
                <BlockStack gap="300">
                  {order.lineItems.edges.map(({ node: item }) => (
                    <Card key={item.id} background="bg-surface-secondary">
                      <InlineStack gap="400" align="space-between">
                        <InlineStack gap="300">
                          {item.variant?.product?.featuredImage && (
                            <Thumbnail
                              source={item.variant.product.featuredImage.url}
                              alt={item.variant.product.featuredImage.altText || item.title}
                              size="medium"
                            />
                          )}
                          <BlockStack gap="100">
                            <Text variant="bodyMd" fontWeight="semibold">
                              {item.title}
                            </Text>
                            {item.variant?.title && item.variant.title !== 'Default Title' && (
                              <Text variant="bodySm" color="subdued">
                                {item.variant.title}
                              </Text>
                            )}
                            <Text variant="bodySm" color="subdued">
                              Quantity: {item.quantity}
                            </Text>
                            {item.customAttributes.length > 0 && (
                              <BlockStack gap="050">
                                {item.customAttributes.map((attr, index) => (
                                  <Text key={index} variant="bodySm" color="subdued">
                                    {attr.key}: {attr.value}
                                  </Text>
                                ))}
                              </BlockStack>
                            )}
                          </BlockStack>
                        </InlineStack>
                        
                        <Text variant="bodyMd" fontWeight="semibold">
                          {item.originalUnitPriceSet.shopMoney.currencyCode} {item.originalUnitPriceSet.shopMoney.amount}
                        </Text>
                      </InlineStack>
                    </Card>
                  ))}
                </BlockStack>

                <Divider />
                
                {/* Order Totals */}
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">Subtotal</Text>
                    <Text variant="bodyMd">
                      {order.subtotalPriceSet.shopMoney.currencyCode} {order.subtotalPriceSet.shopMoney.amount}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">Shipping</Text>
                    <Text variant="bodyMd">
                      {order.totalShippingPriceSet.shopMoney.currencyCode} {order.totalShippingPriceSet.shopMoney.amount}
                    </Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">Tax</Text>
                    <Text variant="bodyMd">
                      {order.totalTaxSet.shopMoney.currencyCode} {order.totalTaxSet.shopMoney.amount}
                    </Text>
                  </InlineStack>
                  
                  <Divider />
                  
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" fontWeight="semibold">Total</Text>
                    <Text variant="bodyMd" fontWeight="semibold">
                      {order.totalPriceSet.shopMoney.currencyCode} {order.totalPriceSet.shopMoney.amount}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Design Attachments */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Design Attachments</Text>
                
                {designs.length > 0 ? (
                  <BlockStack gap="300">
                    {designs.map((design) => {
                      const files = getDesignFiles(design);
                      const statusField = design.fields.find(f => f.key === 'status');
                      const status = statusField?.value || 'pending';
                      
                      return (
                        <Card key={design.id} background="bg-surface-secondary">
                          <BlockStack gap="300">
                            <InlineStack align="space-between">
                              <Text variant="bodyMd" fontWeight="semibold">
                                Design {design.handle}
                              </Text>
                              <Badge tone={status === 'approved' ? 'success' : status === 'rejected' ? 'critical' : 'warning'}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Badge>
                            </InlineStack>
                            
                            {files.length > 0 && (
                              <InlineStack gap="200">
                                {files.map((file, index) => (
                                  <Thumbnail
                                    key={index}
                                    source={file.url}
                                    alt={`${file.side} design`}
                                    size="medium"
                                  />
                                ))}
                              </InlineStack>
                            )}
                            
                            <InlineStack gap="200">
                              <Button
                                size="micro"
                                onClick={() => navigate(`/designs/${encodeURIComponent(design.id)}`)}
                              >
                                View Design
                              </Button>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                ) : (
                  <EmptyState
                    heading="No designs attached"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>This order doesn't have any custom designs attached.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Fulfill Order Modal */}
      <Modal
        open={fulfillModalOpen}
        onClose={() => setFulfillModalOpen(false)}
        title="Fulfill Order"
        primaryAction={{
          content: "Fulfill Order",
          onAction: handleFulfillConfirm,
          loading: fetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setFulfillModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <Text>
            Are you sure you want to fulfill this order? The customer will be notified that their order has been shipped.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}