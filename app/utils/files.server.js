import { authenticate } from "../shopify.server";

/**
 * Stages an upload with Shopify Admin GraphQL stagedUploadsCreate.
 * Returns the staged upload target and required form fields.
 */
export async function stagedUpload(request, { filename, mimeType, fileSize }) {
  const { admin } = await authenticate.admin(request);

  const mutation = `#graphql
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: [
      {
        filename,
        mimeType,
        resource: "FILE",
        fileSize: fileSize ? String(fileSize) : undefined,
        httpMethod: "POST",
      },
    ],
  };

  const res = await admin.graphql(mutation, { variables });
  const json = await res.json();
  const errors = json?.data?.stagedUploadsCreate?.userErrors || [];
  if (errors.length) {
    throw new Response(JSON.stringify({ errors }), { status: 400 });
  }
  const target = json?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) throw new Response("No staged target returned", { status: 500 });
  return target;
}

/**
 * Completes a staged upload by creating a File object in Shopify Files via fileCreate.
 * Accepts one or more resource URLs returned by the staged upload POST.
 */
export async function completeStagedUpload(request, files) {
  const { admin } = await authenticate.admin(request);

  const mutation = `#graphql
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { __typename ... on GenericFile { id url } }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    files: files.map((f) => ({
      alt: f.alt || undefined,
      contentType: "FILE",
      originalSource: f.resourceUrl,
    })),
  };

  const res = await admin.graphql(mutation, { variables });
  const json = await res.json();
  const errors = json?.data?.fileCreate?.userErrors || [];
  if (errors.length) {
    throw new Response(JSON.stringify({ errors }), { status: 400 });
  }
  const out = (json?.data?.fileCreate?.files || []).map((x) => ({
    id: x?.id,
    url: x?.url,
  }));
  return out;
}

/**
 * Convenience: accepts a data URL or Buffer and uploads to staged target, then fileCreate.
 * Returns { id, url } for the created file.
 */
export async function uploadDataUrlToFilesCdn(request, { dataUrl, filename, mimeType }) {
  const target = await stagedUpload(request, { filename, mimeType });

  const url = target.url;
  const params = Object.fromEntries((target.parameters || []).map((p) => [p.name, p.value]));

  // Convert data URL to Blob
  let bodyBlob;
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
    const comma = dataUrl.indexOf(",");
    const base64 = dataUrl.slice(comma + 1);
    const binary = Buffer.from(base64, "base64");
    bodyBlob = new Blob([binary], { type: mimeType });
  } else if (dataUrl instanceof Blob) {
    bodyBlob = dataUrl;
  } else if (Buffer.isBuffer(dataUrl)) {
    bodyBlob = new Blob([dataUrl], { type: mimeType });
  } else {
    throw new Response("Unsupported dataUrl input", { status: 400 });
  }

  const form = new FormData();
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  form.append("file", bodyBlob, filename);

  const putRes = await fetch(url, { method: "POST", body: form });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Response(JSON.stringify({ message: "Staged upload POST failed", text }), { status: 502 });
  }

  const created = await completeStagedUpload(request, [
    { resourceUrl: params["key"] ? `${url}/${params["key"]}` : url },
  ]);
  return created[0];
}



