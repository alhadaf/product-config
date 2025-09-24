import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { createDesign } from "../utils/designs.server";

export const action = async ({ request }) => {
  // App proxy-safe (public) endpoint; verify HMAC if using app proxy in production.
  await unauthenticated.public.appProxy(request);
  const body = await request.json();
  const design = await createDesign(request, {
    productGID: body.productGID,
    customerEmail: body.customerEmail,
    decoration: body.decoration,
    notes: body.notes,
    status: "pending",
  });
  return json({ id: design.id, handle: design.handle, type: design.type });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });



