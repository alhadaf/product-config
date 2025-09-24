import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { unauthenticated, authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await unauthenticated.public.appProxy(request);
  const { admin } = await authenticate.admin(request);
  const customerEmail = new URL(request.url).searchParams.get('email') || '';
  const q = `#graphql
    query($first:Int!) { metaobjects(type: "design", first: $first) { nodes { id fields { key value } } } }
  `;
  const res = await admin.graphql(q, { variables: { first: 100 } });
  const jr = await res.json();
  const all = (jr?.data?.metaobjects?.nodes || []).map(n => ({
    id: n.id,
    email: n.fields.find(f=>f.key==='customer_email')?.value,
    status: n.fields.find(f=>f.key==='status')?.value,
  }));
  const items = customerEmail ? all.filter(i => (i.email||'').toLowerCase() === customerEmail.toLowerCase()) : all;
  return json({ items, email: customerEmail });
};

export default function MyDesigns() {
  const { items, email } = useLoaderData();
  return (
    <div style={{ padding: 24 }}>
      <h1>My Designs</h1>
      {email ? <p>Email: {email}</p> : null}
      <ul>
        {items.map(it => (
          <li key={it.id}>
            <Link to={`/apps/proof/${encodeURIComponent(it.id)}`}>{it.id}</Link> ({it.status || 'pending'})
          </li>
        ))}
      </ul>
    </div>
  );
}


