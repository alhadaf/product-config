import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, session } = await authenticate.webhook(request);
  if (topic !== "ORDERS_CREATE") return json({ ok: true });
  const payload = await request.json();
  const designIds = [];
  for (const li of payload?.line_items || []) {
    for (const p of li?.properties || []) {
      if (p?.name === "_Design ID" && p?.value) designIds.push(p.value);
    }
  }
  if (!designIds.length) return json({ ok: true });

  const { admin } = await authenticate.admin(request);
  const m = `#graphql
    mutation setOrderMetafield($id: ID!, $mf: MetafieldsSetInput!) {
      metafieldsSet(metafields: [$mf]) { metafields { id } userErrors { field message } }
    }
  `;
  const orderGID = `gid://shopify/Order/${payload.id}`;
  const variables = {
    id: orderGID,
    mf: {
      ownerId: orderGID,
      key: "design_ids",
      namespace: "custom",
      type: "list.single_line_text_field",
      value: JSON.stringify(designIds),
    },
  };
  await admin.graphql(m, { variables });
  return json({ ok: true });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });


