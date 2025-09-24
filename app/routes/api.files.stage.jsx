import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { stagedUpload } from "../utils/files.server";

export const action = async ({ request }) => {
  await unauthenticated.public.appProxy(request);
  const body = await request.json();
  const target = await stagedUpload(request, {
    filename: body.filename,
    mimeType: body.mimeType,
    fileSize: body.fileSize,
  });
  return json(target);
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });



