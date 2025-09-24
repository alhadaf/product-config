import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { completeStagedUpload } from "../utils/files.server";

export const action = async ({ request }) => {
  await unauthenticated.public.appProxy(request);
  const body = await request.json();
  const created = await completeStagedUpload(request, body.files || []);
  return json({ files: created });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });



