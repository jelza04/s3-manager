const API_BASE = "http://localhost:5000/api";

// ─── List all buckets ─────────────────────────────────────────────────────────
export const fetchBuckets = async () => {
  const response = await fetch(`${API_BASE}/buckets`);
  if (!response.ok) throw new Error("Failed to fetch buckets");
  const data = await response.json();
  return data.buckets || [];
};

// ─── List objects in a bucket ─────────────────────────────────────────────────
export const fetchObjects = async (bucketName) => {
  try {
    const response = await fetch(`${API_BASE}/buckets/${bucketName}/objects`);
    if (!response.ok) throw new Error("Failed to fetch objects");
    const data = await response.json();
    return data.objects || [];
  } catch {
    return [];
  }
};

// ─── Create a new bucket ──────────────────────────────────────────────────────
export const createBucket = async (bucketName, region, aclEnabled) => {
  const response = await fetch(`${API_BASE}/buckets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucketName, region, aclEnabled }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create bucket");
  }
  return response.json();
};

// ─── Upload a single file ─────────────────────────────────────────────────────
export const uploadFile = async (bucketName, file) => {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const response = await fetch(`${API_BASE}/buckets/${bucketName}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileContent: base64,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload file");
  }
  return response.json();
};

// ─── Change object ACL ────────────────────────────────────────────────────────
export const setObjectAcl = async (bucketName, objectKey, acl) => {
  const response = await fetch(
    `${API_BASE}/buckets/${bucketName}/objects/${encodeURIComponent(objectKey)}/acl`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acl }),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to set ACL");
  }
  return response.json();
};