import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  PutObjectAclCommand,
  PutBucketOwnershipControlsCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Helper to create S3 Client for a specific region ────────────────────────
function createS3Client(region = "us-east-1") {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.VITE_AWS_SESSION_TOKEN,
    },
  });
}

// Default client for ListBuckets (always use us-east-1 endpoint)
const client = createS3Client("us-east-1");

// ─── List all buckets ─────────────────────────────────────────────────────────
app.get("/api/buckets", async (req, res) => {
  try {
    const response = await client.send(new ListBucketsCommand({}));
    res.json({ buckets: response.Buckets || [] });
  } catch (err) {
    res.status(500).json({ error: err.message, name: err.name });
  }
});

// ─── List objects in a bucket ─────────────────────────────────────────────────
app.get("/api/buckets/:bucketName/objects", async (req, res) => {
  const { bucketName } = req.params;
  try {
    const response = await client.send(
      new ListObjectsV2Command({ Bucket: bucketName })
    );
    const objects = (response.Contents || []).map((o) => ({
      name: o.Key,
      size: o.Size,
      acl: "private",
      uploadedAt: o.LastModified,
    }));
    res.json({ objects });
  } catch (err) {
    res.status(500).json({ error: err.message, name: err.name });
  }
});

// ─── Create a new bucket ──────────────────────────────────────────────────────
app.post("/api/buckets", async (req, res) => {
  const { bucketName, region, aclEnabled } = req.body;

  if (!bucketName) {
    return res.status(400).json({ error: "Bucket name is required" });
  }

  try {
    // Create client with the specified region
    const regionClient = createS3Client(region || "us-east-1");

    const params = {
      Bucket: bucketName,
      ...(region !== "us-east-1" && {
        CreateBucketConfiguration: { LocationConstraint: region },
      }),
    };

    await regionClient.send(new CreateBucketCommand(params));

    if (aclEnabled) {
      await regionClient.send(
        new PutBucketOwnershipControlsCommand({
          Bucket: bucketName,
          OwnershipControls: {
            Rules: [{ ObjectOwnership: "BucketOwnerPreferred" }],
          },
        })
      );

      await regionClient.send(
        new PutPublicAccessBlockCommand({
          Bucket: bucketName,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            IgnorePublicAcls: false,
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false,
          },
        })
      );
    }

    res.json({ success: true, bucket: bucketName });
  } catch (err) {
    res.status(500).json({ error: err.message, name: err.name });
  }
});

// ─── Upload a file ────────────────────────────────────────────────────────────
app.post("/api/buckets/:bucketName/upload", async (req, res) => {
  const { bucketName } = req.params;
  const { fileName, fileContent, contentType } = req.body;

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: "File name and content are required" });
  }

  try {
    const buffer = Buffer.from(fileContent, "base64");
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
      })
    );

    res.json({ success: true, fileName });
  } catch (err) {
    res.status(500).json({ error: err.message, name: err.name });
  }
});

// ─── Change object ACL ────────────────────────────────────────────────────────
app.put("/api/buckets/:bucketName/objects/:objectKey/acl", async (req, res) => {
  const { bucketName, objectKey } = req.params;
  const { acl } = req.body;

  if (!acl) {
    return res.status(400).json({ error: "ACL is required" });
  }

  try {
    await client.send(
      new PutObjectAclCommand({
        Bucket: bucketName,
        Key: decodeURIComponent(objectKey),
        ACL: acl,
      })
    );

    res.json({ success: true, acl });
  } catch (err) {
    res.status(500).json({ error: err.message, name: err.name });
  }
});

app.listen(PORT, () => {
  console.log(`✓ S3 Manager API server running at http://localhost:${PORT}`);
});
