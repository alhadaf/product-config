import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { unauthenticated, authenticate } from "../shopify.server";
import { setDesignStatus } from "../utils/designs.server";

// Public proof page via app proxy
export const loader = async ({ request, params }) => {
  await unauthenticated.public.appProxy(request);
  const { admin } = await authenticate.admin(request);
  const q = `#graphql
    query($id: ID!) { metaobject(id: $id) { id fields { key value } } }
  `;
  const res = await admin.graphql(q, { variables: { id: params.id } });
  const jr = await res.json();
  const mo = jr?.data?.metaobject;
  return json({ design: mo });
};

export default function ProofPage() {
  const { design } = useLoaderData();
  const get = (k) => design?.fields?.find(f=>f.key===k)?.value || "";
  return (
    <div style={{ padding: 24 }}>
      <h1>Design Proof</h1>
      <p>Status: {get("status")}</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap: 16 }}>
        {['front','back','left','right'].map(s => (
          <div key={s}><h3>{s}</h3><p>{get(`${s}_file`)}</p></div>
        ))}
      </div>
      <Form method="post" style={{ marginTop: 24 }}>
        <input type="hidden" name="status" value="approved" />
        <button type="submit">Approve</button>
      </Form>
      <Form method="post" style={{ marginTop: 12 }}>
        <input type="hidden" name="status" value="rejected" />
        <input name="message" placeholder="Reason" />
        <button type="submit">Reject</button>
      </Form>
    </div>
  );
}

export const action = async ({ request, params }) => {
  await unauthenticated.public.appProxy(request);
  const form = await request.formData();
  const status = form.get('status');
  const message = form.get('message') || '';
  if (!status) return json({ error: 'Missing status' }, { status: 400 });
  await setDesignStatus(request, params.id, status, message);
  return json({ ok: true });
};


