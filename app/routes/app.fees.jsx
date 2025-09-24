import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const scrHandle = form.get("screenprint_handle");
  const tiersJson = form.get("tiers_json");

  // Build fee maps for Screenprint: Quantity Range × Colors => Variant GID
  const q = `#graphql
    query($handle: String!) {
      productByHandle(handle: $handle) {
        id options name variants(first: 250) { nodes { id price title selectedOptions { name value } } }
      }
    }
  `;
  const r = await admin.graphql(q, { variables: { handle: scrHandle } });
  const jr = await r.json();
  const product = jr?.data?.productByHandle;
  if (!product) return json({ error: "Fee product not found" }, { status: 400 });

  const idMap = {};
  for (const v of product.variants.nodes) {
    const so = Object.fromEntries(v.selectedOptions.map(o => [o.name, o.value]));
    const tier = so["Quantity Range"]; const colors = parseInt(so["Colors"], 10);
    if (!tier || !Number.isInteger(colors)) continue;
    (idMap[tier] ||= {})[colors] = v.id;
  }

  const setMf = `#graphql
    mutation setMf($mf:[MetafieldsSetInput!]!) { metafieldsSet(metafields:$mf){ userErrors { field message } } }
  `;
  const mfVars = { mf: [
    { ownerId: (await admin.graphql(`#graphql{ shop { id } }`)).then(r=>r.json()).then(j=>j.data.shop.id), key: "fee_map_scr", namespace: "custom", type: "json", value: JSON.stringify(idMap) },
    { ownerId: (await admin.graphql(`#graphql{ shop { id } }`)).then(r=>r.json()).then(j=>j.data.shop.id), key: "screenprint_tiers", namespace: "custom", type: "json", value: tiersJson || "[]" },
  ]};
  await admin.graphql(setMf, { variables: mfVars });
  return redirect("/app/fees");
};

export default function Fees() {
  const {} = useLoaderData();
  return (
    <div style={{ padding: 24 }}>
      <h1>Fees Settings</h1>
      <Form method="post">
        <div>
          <label>Screenprint fee product handle</label>
          <input name="screenprint_handle" required placeholder="screenprint" />
        </div>
        <div>
          <label>Screenprint tiers JSON</label>
          <textarea name="tiers_json" placeholder='["24-71","72-299","300-749","750+"]' />
        </div>
        <button type="submit">Build & Save</button>
      </Form>
    </div>
  );
}



