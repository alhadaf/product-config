import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Grid,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Get dashboard statistics
  const [productsResponse, ordersResponse, designsResponse] = await Promise.all([
    admin.graphql(`#graphql
      query {
        products(first: 1) {
          edges { node { id } }
        }
        productsCount: products(first: 0) {
          edges { node { id } }
        }
      }
    `),
    admin.graphql(`#graphql
      query {
        orders(first: 1) {
          edges { node { id } }
        }
        ordersCount: orders(first: 0) {
          edges { node { id } }
        }
      }
    `),
    admin.graphql(`#graphql
      query {
        metaobjects(type: "design", first: 1) {
          nodes { id }
        }
      }
    `)
  ]);

  const [productsData, ordersData, designsData] = await Promise.all([
    productsResponse.json(),
    ordersResponse.json(),
    designsResponse.json()
  ]);

  const stats = {
    totalProducts: productsData?.data?.products?.edges?.length || 0,
    totalOrders: ordersData?.data?.orders?.edges?.length || 0,
    totalDesigns: designsData?.data?.metaobjects?.nodes?.length || 0,
  };

  // Get recent orders
  const recentOrdersResponse = await admin.graphql(`#graphql
    query {
      orders(first: 5, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
            }
          }
        }
      }
    }
  `);

  const recentOrdersData = await recentOrdersResponse.json();
  const recentOrders = recentOrdersData?.data?.orders?.edges || [];

  return json({ stats, recentOrders });
};

export default function Index() {
  const { stats, recentOrders } = useLoaderData();
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'FULFILLED': 'success',
      'UNFULFILLED': 'attention',
      'PARTIALLY_FULFILLED': 'warning'
    };
    return statusMap[status] || 'info';
  };

  return (
    <Page>
      <TitleBar title="Dashboard" />
      
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Statistics Cards */}
            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd">Products</Text>
                    <Text variant="heading2xl">{stats.totalProducts}</Text>
                    <Button onClick={() => navigate('/app/products')} variant="plain">
                      View all products
                    </Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd">Orders</Text>
                    <Text variant="heading2xl">{stats.totalOrders}</Text>
                    <Button onClick={() => navigate('/app/orders')} variant="plain">
                      View all orders
                    </Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd">Designs</Text>
                    <Text variant="heading2xl">{stats.totalDesigns}</Text>
                    <Button onClick={() => navigate('/designs')} variant="plain">
                      View all designs
                    </Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>

            {/* Quick Actions */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Quick Actions</Text>
                <InlineStack gap="300">
                  <Button variant="primary" onClick={() => navigate('/app/products/new')}>
                    Add Product
                  </Button>
                  <Button onClick={() => navigate('/app/fees')}>
                    Configure Fees
                  </Button>
                  <Button onClick={() => navigate('/designs')}>
                    Manage Designs
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Recent Orders */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">Recent Orders</Text>
                  <Button onClick={() => navigate('/app/orders')} variant="plain">
                    View all
                  </Button>
                </InlineStack>
                
                {recentOrders.length > 0 ? (
                  <BlockStack gap="300">
                    {recentOrders.map(({ node: order }) => (
                      <Card key={order.id} background="bg-surface-secondary">
                        <InlineStack align="space-between">
                          <BlockStack gap="100">
                            <Text variant="bodyMd" fontWeight="semibold">
                              {order.name}
                            </Text>
                            <Text variant="bodySm" color="subdued">
                              {order.customer ? 
                                `${order.customer.firstName} ${order.customer.lastName}` : 
                                'Guest'
                              } • {formatDate(order.createdAt)}
                            </Text>
                          </BlockStack>
                          <InlineStack gap="200" align="center">
                            <Text variant="bodyMd">
                              {order.totalPriceSet.shopMoney.currencyCode} {order.totalPriceSet.shopMoney.amount}
                            </Text>
                            <Button
                              size="micro"
                              onClick={() => navigate(`/app/orders/${encodeURIComponent(order.id)}`)}
                            >
                              View
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Card>
                    ))}
                  </BlockStack>
                ) : (
                  <Text color="subdued">No recent orders</Text>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
