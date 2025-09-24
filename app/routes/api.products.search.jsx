import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { json } = await import("@remix-run/node");
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q || q.length < 2) return json({ items: [] });

  const gql = `#graphql
    query ($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges { node { id title handle status } }
      }
    }
  `;

  const res = await admin.graphql(gql, {
    variables: { first: 20, query: `title:*${q}*` },
  });
  const jr = await res.json();
  const items = (jr?.data?.products?.edges || []).map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    status: node.status,
  }));
  return json({ items });
};

export const action = async () => new Response("Method Not Allowed", { status: 405 });
