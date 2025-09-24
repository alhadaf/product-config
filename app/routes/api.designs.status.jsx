import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { setDesignStatus } from "../utils/designs.server";

export const action = async ({ request, params }) => {
  await unauthenticated.public.appProxy(request);
  const { id } = params;
  const body = await request.json();
  const status = body?.status;
  if (!status || !["pending","approved","rejected"].includes(status)) {
    return json({ error: "Invalid status" }, { status: 400 });
  }
  await setDesignStatus(request, id, status, body?.message || "");
  return json({ ok: true });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });



