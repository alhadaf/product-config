import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
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
  Select,
  AppProvider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import { setDesignStatus } from "../utils/designs.server";
import { useState, useCallback } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  
  const q = `#graphql
    query {
      metaobjects(type: "design", first: 100) {
        nodes { 
          id 
          handle 
          fields { key value }
          updatedAt
        }
      }
    }
  `;
  const res = await admin.graphql(q);
  const jsonRes = await res.json();
  const allDesigns = jsonRes?.data?.metaobjects?.nodes || [];
  
  // Parse design data
  const designs = allDesigns.map(design => {
    const fields = Object.fromEntries(design.fields.map(f => [f.key, f.value]));
    return {
      id: design.id,
      handle: design.handle,
      customerEmail: fields.customer_email || '',
      status: fields.status || 'pending',
      decoration: fields.decoration || '',
      notes: fields.notes || '',
      productId: fields.product || '',
      updatedAt: design.updatedAt,
      ...fields
    };
  });

  // Filter by status if provided
  const filteredDesigns = status ? 
    designs.filter(d => d.status.toLowerCase() === status.toLowerCase()) : 
    designs;

  return json({ designs: filteredDesigns, currentStatus: status, polarisTranslations });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const designId = formData.get("designId");
  const newStatus = formData.get("status");
  const message = formData.get("message");

  if (action === "updateStatus") {
    try {
      await setDesignStatus(request, designId, newStatus, message);
      return json({ success: true });
    } catch (error) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  return json({ success: true });
};

export default function DesignsIndex() {
  const { designs, currentStatus, polarisTranslations } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const [statusFilter, setStatusFilter] = useState(currentStatus);

  const handleStatusFilterChange = useCallback((value) => setStatusFilter(value), []);
  const handleStatusFilterRemove = useCallback(() => setStatusFilter(''), []);

  const handleStatusUpdate = (designId, newStatus) => {
    const message = prompt(`Add a note for this status change (optional):`);
    fetcher.submit(
      { 
        action: "updateStatus", 
        designId, 
        status: newStatus,
        message: message || ""
      },
      { method: "post" }
    );
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
      'pending': { tone: 'attention', text: 'Pending' },
      'approved': { tone: 'success', text: 'Approved' },
      'rejected': { tone: 'critical', text: 'Rejected' },
      'in_production': { tone: 'info', text: 'In Production' },
      'completed': { tone: 'success', text: 'Completed' }
    };
    
    const config = statusMap[status.toLowerCase()] || { tone: 'info', text: status };
    return <Badge tone={config.tone}>{config.text}</Badge>;
  };

  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <Select
          label="Status"
          labelHidden
          options={[
            { label: 'All statuses', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'In Production', value: 'in_production' },
            { label: 'Completed', value: 'completed' }
          ]}
          value={statusFilter}
          onChange={handleStatusFilterChange}
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

  const rows = designs.map((design) => [
    <BlockStack gap="100">
      <Text variant="bodyMd" fontWeight="semibold">
        {design.handle || design.id.split('/').pop()}
      </Text>
      <Text variant="bodySm" color="subdued">
        {design.customerEmail}
      </Text>
    </BlockStack>,
    design.decoration || "—",
    getStatusBadge(design.status),
    formatDate(design.updatedAt),
    design.notes ? (
      <Text variant="bodySm" truncate>
        {design.notes}
      </Text>
    ) : "—",
    <InlineStack gap="200">
      <Button
        size="micro"
        onClick={() => navigate(`/designs/${encodeURIComponent(design.id)}`)}
      >
        View
      </Button>
      {design.status === 'pending' && (
        <>
          <Button
            size="micro"
            tone="success"
            onClick={() => handleStatusUpdate(design.id, 'approved')}
            loading={fetcher.state === "submitting"}
          >
            Approve
          </Button>
          <Button
            size="micro"
            tone="critical"
            onClick={() => handleStatusUpdate(design.id, 'rejected')}
            loading={fetcher.state === "submitting"}
          >
            Reject
          </Button>
        </>
      )}
      {design.status === 'approved' && (
        <Button
          size="micro"
          tone="info"
          onClick={() => handleStatusUpdate(design.id, 'in_production')}
          loading={fetcher.state === "submitting"}
        >
          Start Production
        </Button>
      )}
      {design.status === 'in_production' && (
        <Button
          size="micro"
          tone="success"
          onClick={() => handleStatusUpdate(design.id, 'completed')}
          loading={fetcher.state === "submitting"}
        >
          Complete
        </Button>
      )}
    </InlineStack>
  ]);

  return (
    <AppProvider i18n={polarisTranslations}>
      <Page>
        <TitleBar title="Design Management" />
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Filters
                  filters={filters}
                  appliedFilters={appliedFilters}
                  onClearAll={() => setStatusFilter('')}
                />
                
                {designs.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      'text',
                      'text',
                      'text',
                      'text',
                      'text',
                      'text'
                    ]}
                    headings={[
                      'Design',
                      'Decoration',
                      'Status',
                      'Updated',
                      'Notes',
                      'Actions'
                    ]}
                    rows={rows}
                  />
                ) : (
                  <EmptyState
                    heading="No designs found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Design submissions will appear here when customers upload their custom designs.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}


