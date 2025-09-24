import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { json } = await import("@remix-run/node");
  const { admin } = await authenticate.admin(request);

  const gql = `#graphql
    query ($first: Int!) {
      products(first: $first, sortKey: TITLE) {
        edges { node { id title handle status } }
      }
    }
  `;

  const res = await admin.graphql(gql, { variables: { first: 100 } });
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



