import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request }) => {
	await unauthenticated.public.appProxy(request);
	const { admin } = await (await import("../shopify.server")).authenticate.admin(request);
	const q = `#graphql
	  query { shop { id metafields(first: 20, namespace: "custom") { nodes { key value } } } }
	`;
	const res = await admin.graphql(q);
	const jr = await res.json();
	const nodes = jr?.data?.shop?.metafields?.nodes || [];
	const byKey = Object.fromEntries(nodes.map(n => [n.key, n.value]));
	return json({
	  screenprint: safeJson(byKey["fee_map_scr"]) || {},
	  embroidery: safeJson(byKey["fee_map_emb"]) || {},
	  tiers: safeJson(byKey["screenprint_tiers"]) || [],
	});
};

function safeJson(v){ try { return JSON.parse(v || ""); } catch { return null; } }

export const action = () => new Response("Method Not Allowed", { status: 405 });
