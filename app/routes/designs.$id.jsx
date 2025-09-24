import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { setDesignStatus } from "../utils/designs.server";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const q = `#graphql
    query($id: ID!) {
      metaobject(id: $id) { id handle fields { key value } }
    }
  `;
  const res = await admin.graphql(q, { variables: { id: params.id } });
  const jsonRes = await res.json();
  const design = jsonRes?.data?.metaobject;
  return json({ design });
};

export const action = async ({ request, params }) => {
  const form = await request.formData();
  const status = form.get("status");
  const message = form.get("message") || "";
  await setDesignStatus(request, params.id, status, message);
  return json({ ok: true });
};

export default function DesignDetail() {
  const { design } = useLoaderData();
  const get = (k) => design?.fields?.find((f) => f.key === k)?.value || "";
  const sides = ["front","back","left","right"];
  return (
    <div style={{ padding: 24 }}>
      <h1>Design {design?.handle || design?.id}</h1>
      <p>Status: {get("status")}</p>
      <p>Customer: {get("customer_email")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {sides.map((s) => {
          const fileGid = get(`${s}_file`);
          return (
            <div key={s}>
              <h3>{s}</h3>
              {fileGid ? (
                <p>{fileGid}</p>
              ) : (
                <p>No file</p>
              )}
            </div>
          );
        })}
      </div>
      <Form method="post" style={{ marginTop: 24 }}>
        <select name="status" defaultValue={get("status") || "pending"}>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <input name="message" placeholder="Message" />
        <button type="submit">Update</button>
      </Form>
    </div>
  );
}



