import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { uploadDataUrlToFilesCdn } from "../utils/files.server";
import { updateDesignFilesAndTransforms } from "../utils/designs.server";

export const action = async ({ request, params }) => {
  await unauthenticated.public.appProxy(request);
  const { id } = params;
  const body = await request.json();
  const sides = ["front","back","left","right"];
  const out = {};
  for (const side of sides) {
    const d = body?.images?.[side];
    if (!d) continue;
    const file = await uploadDataUrlToFilesCdn(request, {
      dataUrl: d,
      filename: body?.filenames?.[side] || `${side}.png`,
      mimeType: "image/png",
    });
    out[side] = { id: file.id, url: file.url };
  }
  await updateDesignFilesAndTransforms(request, id, {
    front: out.front?.id,
    back: out.back?.id,
    left: out.left?.id,
    right: out.right?.id,
    transforms: body?.transforms || null,
  });
  return json({ ok: true, files: out });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });


