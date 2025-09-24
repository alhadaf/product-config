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
  Filters,
  TextField,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useCallback } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";
  const designStatus = url.searchParams.get("designStatus") || "";
  
  let query = `#graphql
    query getOrders($first: Int!, $query: String) {
      orders(first: $first, query: $query) {
        edges {
          node {
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
            customer {
              id
              firstName
              lastName
              email
            }
            lineItems(first: 10) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    id
                    title
                    product {
                      id
                      title
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
              address1
              city
              province
              country
              zip
            }
            metafield(namespace: "custom", key: "design_ids") {
              value
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

  // Build query string for filtering
  let queryString = "";
  if (status) {
    queryString += `fulfillment_status:${status}`;
  }
  if (search) {
    if (queryString) queryString += " AND ";
    queryString += `name:*${search}* OR email:*${search}*`;
  }

  const response = await admin.graphql(query, {
    variables: { 
      first: 50,
      query: queryString || undefined
    }
  });
  
  const data = await response.json();
  let orders = data?.data?.orders?.edges || [];

  // Get design information for orders that have designs
  const ordersWithDesigns = await Promise.all(
    orders.map(async ({ node: order }) => {
      let designInfo = { hasDesigns: false, designStatus: null, designCount: 0 };
      
      if (order.metafield?.value) {
        try {
          const designIds = JSON.parse(order.metafield.value);
          if (designIds.length > 0) {
            designInfo.hasDesigns = true;
            designInfo.designCount = designIds.length;
            
            // Get design statuses
            const designsResponse = await admin.graphql(`#graphql
              query getDesigns($ids: [ID!]!) {
                nodes(ids: $ids) {
                  ... on Metaobject {
                    id
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
            const designs = designsData?.data?.nodes || [];
            
            // Determine overall design status
            const statuses = designs.map(design => {
              const statusField = design.fields.find(f => f.key === 'status');
              return statusField?.value || 'pending';
            });
            
            if (statuses.every(s => s === 'approved')) {
              designInfo.designStatus = 'approved';
            } else if (statuses.some(s => s === 'rejected')) {
              designInfo.designStatus = 'rejected';
            } else {
              designInfo.designStatus = 'pending';
            }
          }
        } catch (e) {
          console.error("Error parsing design IDs:", e);
        }
      }
      
      return { node: order, designInfo };
    })
  );

  // Filter by design status if specified
  if (designStatus) {
    orders = ordersWithDesigns.filter(({ designInfo }) => {
      if (designStatus === 'with_designs') return designInfo.hasDesigns;
      if (designStatus === 'no_designs') return !designInfo.hasDesigns;
      return designInfo.designStatus === designStatus;
    });
  } else {
    orders = ordersWithDesigns;
  }

  return json({ orders, currentStatus: status, currentSearch: search, currentDesignStatus: designStatus });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const orderId = formData.get("orderId");

  if (action === "fulfill") {
    const mutation = `#graphql
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
    `;

    await admin.graphql(mutation, {
      variables: {
        fulfillment: {
          orderId: orderId,
          notifyCustomer: true
        }
      }
    });
  }

  return json({ success: true });
};

export default function OrdersIndex() {
  const { orders, currentStatus, currentSearch, currentDesignStatus } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const [queryValue, setQueryValue] = useState(currentSearch);
  const [statusFilter, setStatusFilter] = useState(currentStatus);
  const [designStatusFilter, setDesignStatusFilter] = useState(currentDesignStatus);

  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
  const handleQueryValueChange = useCallback((value) => setQueryValue(value), []);
  const handleStatusFilterChange = useCallback((value) => setStatusFilter(value), []);
  const handleStatusFilterRemove = useCallback(() => setStatusFilter(''), []);
  const handleDesignStatusFilterChange = useCallback((value) => setDesignStatusFilter(value), []);
  const handleDesignStatusFilterRemove = useCallback(() => setDesignStatusFilter(''), []);
  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
    handleStatusFilterRemove();
    handleDesignStatusFilterRemove();
  }, [handleQueryValueRemove, handleStatusFilterRemove, handleDesignStatusFilterRemove]);

  const handleFulfill = (orderId) => {
    if (confirm("Mark this order as fulfilled?")) {
      fetcher.submit(
        { action: "fulfill", orderId },
        { method: "post" }
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'FULFILLED': { tone: 'success', text: 'Fulfilled' },
      'UNFULFILLED': { tone: 'attention', text: 'Unfulfilled' },
      'PARTIALLY_FULFILLED': { tone: 'warning', text: 'Partial' },
      'RESTOCKED': { tone: 'info', text: 'Restocked' }
    };
    
    const config = statusMap[status] || { tone: 'info', text: status };
    return <Badge tone={config.tone}>{config.text}</Badge>;
  };

  const getFinancialStatusBadge = (status) => {
    const statusMap = {
      'PAID': { tone: 'success', text: 'Paid' },
      'PENDING': { tone: 'attention', text: 'Pending' },
      'PARTIALLY_PAID': { tone: 'warning', text: 'Partial' },
      'REFUNDED': { tone: 'critical', text: 'Refunded' },
      'VOIDED': { tone: 'critical', text: 'Voided' }
    };
    
    const config = statusMap[status] || { tone: 'info', text: status };
    return <Badge tone={config.tone}>{config.text}</Badge>;
  };

  const getDesignStatusBadge = (designInfo) => {
    if (!designInfo.hasDesigns) {
      return <Badge tone="info">No Designs</Badge>;
    }
    
    const statusMap = {
      'approved': { tone: 'success', text: 'Approved' },
      'rejected': { tone: 'critical', text: 'Rejected' },
      'pending': { tone: 'warning', text: 'Pending' }
    };
    
    const config = statusMap[designInfo.designStatus] || { tone: 'info', text: 'Unknown' };
    return <Badge tone={config.tone}>{config.text} ({designInfo.designCount})</Badge>;
  };

  const filters = [
    {
      key: 'status',
      label: 'Fulfillment Status',
      filter: (
        <Select
          label="Fulfillment Status"
          labelHidden
          options={[
            { label: 'All statuses', value: '' },
            { label: 'Unfulfilled', value: 'unfulfilled' },
            { label: 'Fulfilled', value: 'fulfilled' },
            { label: 'Partially fulfilled', value: 'partial' }
          ]}
          value={statusFilter}
          onChange={handleStatusFilterChange}
        />
      ),
      shortcut: true,
    },
    {
      key: 'designStatus',
      label: 'Design Status',
      filter: (
        <Select
          label="Design Status"
          labelHidden
          options={[
            { label: 'All orders', value: '' },
            { label: 'With designs', value: 'with_designs' },
            { label: 'No designs', value: 'no_designs' },
            { label: 'Approved designs', value: 'approved' },
            { label: 'Pending designs', value: 'pending' },
            { label: 'Rejected designs', value: 'rejected' }
          ]}
          value={designStatusFilter}
          onChange={handleDesignStatusFilterChange}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (statusFilter && statusFilter !== '') {
    appliedFilters.push({
      key: 'status',
      label: `Status: ${statusFilter}`,
      onRemove: handleStatusFilterRemove,
    });
  }
  if (designStatusFilter && designStatusFilter !== '') {
    const designFilterLabels = {
      'with_designs': 'With designs',
      'no_designs': 'No designs',
      'approved': 'Approved designs',
      'pending': 'Pending designs',
      'rejected': 'Rejected designs'
    };
    appliedFilters.push({
      key: 'designStatus',
      label: `Design: ${designFilterLabels[designStatusFilter]}`,
      onRemove: handleDesignStatusFilterRemove,
    });
  }

  const rows = orders.map(({ node: order, designInfo }) => {
    const customer = order.customer;
    const lineItem = order.lineItems.edges[0]?.node;
    const totalPrice = order.totalPriceSet.shopMoney;
    
    return [
      <Link to={`/app/orders/${encodeURIComponent(order.id)}`}>
        <Text variant="bodyMd" fontWeight="semibold">
          {order.name}
        </Text>
      </Link>,
      formatDate(order.createdAt),
      customer ? (
        <BlockStack gap="100">
          <Text variant="bodyMd">
            {customer.firstName} {customer.lastName}
          </Text>
          <Text variant="bodySm" color="subdued">
            {customer.email}
          </Text>
        </BlockStack>
      ) : (
        <Text color="subdued">Guest</Text>
      ),
      getStatusBadge(order.displayFulfillmentStatus),
      getFinancialStatusBadge(order.displayFinancialStatus),
      getDesignStatusBadge(designInfo),
      `${totalPrice.currencyCode} ${totalPrice.amount}`,
      lineItem ? (
        <BlockStack gap="100">
          <Text variant="bodyMd">{lineItem.title}</Text>
          <Text variant="bodySm" color="subdued">
            Qty: {lineItem.quantity}
          </Text>
        </BlockStack>
      ) : (
        <Text color="subdued">No items</Text>
      ),
      <InlineStack gap="200">
        <Button
          size="micro"
          onClick={() => navigate(`/app/orders/${encodeURIComponent(order.id)}`)}
        >
          View
        </Button>
        {designInfo.hasDesigns && designInfo.designStatus === 'pending' && (
          <Button
            size="micro"
            tone="warning"
            onClick={() => navigate('/designs')}
          >
            Review Designs
          </Button>
        )}
        {order.displayFulfillmentStatus === 'UNFULFILLED' && (
          <Button
            size="micro"
            tone="success"
            onClick={() => handleFulfill(order.id)}
            loading={fetcher.state === "submitting"}
          >
            Fulfill
          </Button>
        )}
      </InlineStack>
    ];
  });

  return (
    <Page>
      <TitleBar title="Orders" />
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Filters
                queryValue={queryValue}
                filters={filters}
                appliedFilters={appliedFilters}
                onQueryChange={handleQueryValueChange}
                onQueryClear={handleQueryValueRemove}
                onClearAll={handleFiltersClearAll}
                queryPlaceholder="Search orders..."
              />
              
              {orders.length > 0 ? (
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                    'text',
                    'text',
                    'text',
                    'numeric',
                    'text',
                    'text'
                  ]}
                  headings={[
                    'Order',
                    'Date',
                    'Customer',
                    'Fulfillment',
                    'Payment',
                    'Design Status',
                    'Total',
                    'Items',
                    'Actions'
                  ]}
                  rows={rows}
                />
              ) : (
                <EmptyState
                  heading="No orders yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Orders will appear here when customers make purchases.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

