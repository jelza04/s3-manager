import { useState, useRef, useCallback, useEffect } from "react";
import {
  createBucket as awsCreateBucket,
  uploadFile as awsUploadFile,
  setObjectAcl as awsSetObjectAcl,
  fetchBuckets,
  fetchObjects,
} from "./awsConfig";

// ─── Constants ────────────────────────────────────────────────────────────────
const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

const ACCESS_LEVELS = [
  { value: "private", label: "Private", icon: "🔒", desc: "Only owner can access" },
  { value: "public-read", label: "Public Read", icon: "🌐", desc: "Anyone can read" },
  { value: "public-read-write", label: "Public Read/Write", icon: "✏️", desc: "Anyone can read & write" },
  { value: "authenticated-read", label: "Authenticated Read", icon: "🔑", desc: "Authenticated AWS users" },
];

const TABS = ["Create Bucket", "Upload Files", "Manage Access", "Activity Log"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map = { pdf: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", mp4: "🎬", mp3: "🎵", zip: "📦", txt: "📝", js: "📜", json: "📋", csv: "📊", html: "🌐", py: "🐍" };
  return map[ext] || "📁";
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function parseAwsError(err) {
  if (err.name === "BucketAlreadyOwnedByYou") return "You already own this bucket.";
  if (err.name === "BucketAlreadyExists") return "Bucket name is taken globally — try another name.";
  if (err.name === "NoSuchBucket") return "Bucket does not exist.";
  if (err.name === "AccessDenied") return "Access denied — check your IAM permissions.";
  if (err.name === "InvalidBucketName") return "Invalid bucket name.";
  if (err.name === "NoSuchKey") return "Object not found.";
  if (err.name === "ExpiredTokenException") return "Session expired — update your .env credentials.";
  if (err.name === "InvalidClientTokenId") return "Invalid credentials — check your .env file.";
  return err.message || "Unknown AWS error.";
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #1a1a24;
    --border: #2a2a3a;
    --accent: #ff6b35;
    --accent2: #7c3aed;
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #eab308;
    --text: #e8e8f0;
    --muted: #6b6b80;
    --font: 'Syne', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

  .app {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(124,58,237,0.15) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(255,107,53,0.1) 0%, transparent 60%);
  }

  .header {
    display: flex; align-items: center; gap: 16px;
    padding: 20px 40px;
    border-bottom: 1px solid var(--border);
    background: rgba(10,10,15,0.9);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 10;
  }

  .logo {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }

  .header h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .header h1 span { color: var(--accent); }

  .header-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }

  .badge {
    font-size: 11px; font-family: var(--mono);
    padding: 4px 10px; border-radius: 20px;
    display: flex; align-items: center; gap: 6px;
  }

  .badge-live { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: var(--green); }
  .badge-warn { background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); color: var(--yellow); }

  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

  .main { display: flex; min-height: calc(100vh - 65px); }

  .sidebar {
    width: 220px; flex-shrink: 0;
    border-right: 1px solid var(--border);
    padding: 20px 14px;
    display: flex; flex-direction: column; gap: 3px;
    overflow-y: auto;
  }

  .sidebar-label {
    font-size: 10px; letter-spacing: 2px; color: var(--muted);
    text-transform: uppercase; font-family: var(--mono);
    padding: 0 8px; margin: 10px 0 6px;
  }

  .tab-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 8px;
    border: none; background: none;
    color: var(--muted); font-family: var(--font);
    font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    text-align: left; width: 100%;
  }

  .tab-btn:hover { background: var(--surface2); color: var(--text); }
  .tab-btn.active { background: rgba(255,107,53,0.12); color: var(--accent); border: 1px solid rgba(255,107,53,0.2); }
  .tab-icon { font-size: 15px; width: 20px; text-align: center; }

  .bucket-pill {
    padding: 8px 10px; font-size: 11px;
    font-family: var(--mono); color: var(--muted);
    border-radius: 7px; background: var(--surface2);
    margin-bottom: 4px; border: 1px solid var(--border);
  }

  .bucket-pill-name { color: var(--text); font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .content { flex: 1; padding: 32px 36px; max-width: 820px; overflow-y: auto; }

  .page-title { font-size: 26px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
  .page-sub { color: var(--muted); font-size: 13px; margin-bottom: 28px; font-family: var(--mono); }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 18px; }
  .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); font-family: var(--mono); margin-bottom: 18px; }

  .field { margin-bottom: 18px; }
  .field label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 7px; letter-spacing: 0.5px; }

  .field input, .field select {
    width: 100%;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); font-family: var(--mono); font-size: 13px;
    padding: 11px 13px; border-radius: 9px; outline: none; transition: border-color 0.2s;
  }

  .field input:focus, .field select:focus { border-color: var(--accent); }
  .field input::placeholder { color: var(--muted); }
  .hint { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 5px; }

  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .btn {
    padding: 11px 24px; border-radius: 9px; border: none;
    font-family: var(--font); font-weight: 700; font-size: 13px;
    cursor: pointer; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 8px;
  }

  .btn-primary { background: linear-gradient(135deg, var(--accent), #ff8c5a); color: #fff; }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,107,53,0.3); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }

  .btn-ghost { background: none; color: var(--muted); border: 1px solid var(--border); }
  .btn-ghost:hover { color: var(--text); border-color: var(--muted); }

  .btn-sm { padding: 6px 12px; font-size: 11px; border-radius: 7px; }

  .btn-danger { background: rgba(239,68,68,0.12); color: var(--red); border: 1px solid rgba(239,68,68,0.25); }
  .btn-danger:hover { background: rgba(239,68,68,0.22); }

  .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  .spinner-dark { border-color: rgba(0,0,0,0.2); border-top-color: #000; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .drop-zone {
    border: 2px dashed var(--border); border-radius: 12px;
    padding: 36px; text-align: center; cursor: pointer;
    transition: all 0.2s; background: var(--surface2);
  }

  .drop-zone:hover, .drop-zone.drag-over { border-color: var(--accent); background: rgba(255,107,53,0.05); }
  .drop-icon { font-size: 32px; margin-bottom: 8px; }
  .drop-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
  .drop-sub { font-size: 12px; color: var(--muted); font-family: var(--mono); }

  .file-list { margin-top: 14px; display: flex; flex-direction: column; gap: 7px; }

  .file-item {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 9px; padding: 9px 12px;
  }

  .file-icon { font-size: 18px; }
  .file-info { flex: 1; min-width: 0; }
  .file-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-size { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  .file-status { font-size: 11px; font-family: var(--mono); padding: 3px 8px; border-radius: 5px; white-space: nowrap; }
  .status-ready { background: rgba(107,107,128,0.2); color: var(--muted); }
  .status-uploading { background: rgba(234,179,8,0.15); color: var(--yellow); }
  .status-done { background: rgba(34,197,94,0.15); color: var(--green); }
  .status-error { background: rgba(239,68,68,0.15); color: var(--red); }

  .progress-bar { height: 3px; background: var(--border); border-radius: 3px; margin-top: 5px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 3px; transition: width 0.3s; }

  .bucket-select { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }

  .bucket-option {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 9px;
    cursor: pointer; transition: all 0.2s;
  }

  .bucket-option:hover { border-color: var(--accent2); }
  .bucket-option.selected { border-color: var(--accent2); background: rgba(124,58,237,0.08); }

  .bucket-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; }
  .bucket-option.selected .bucket-dot { background: var(--accent2); border-color: var(--accent2); }

  .bucket-name-text { font-size: 13px; font-weight: 600; font-family: var(--mono); }
  .bucket-region-text { font-size: 11px; color: var(--muted); }

  .acl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

  .acl-option {
    padding: 13px; border: 1px solid var(--border);
    border-radius: 9px; cursor: pointer; transition: all 0.2s;
    background: var(--surface2);
  }

  .acl-option:hover { border-color: var(--muted); }
  .acl-option.selected { border-color: var(--accent); background: rgba(255,107,53,0.08); }
  .acl-icon { font-size: 20px; margin-bottom: 5px; }
  .acl-label { font-size: 13px; font-weight: 700; }
  .acl-desc { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 2px; }

  .object-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }

  .object-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 9px;
    cursor: pointer; transition: all 0.2s;
  }

  .object-item:hover { border-color: var(--muted); }
  .object-item.selected { border-color: var(--accent); background: rgba(255,107,53,0.06); }

  .check-box {
    width: 17px; height: 17px; border: 2px solid var(--border);
    border-radius: 5px; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; font-size: 10px;
  }

  .object-item.selected .check-box { background: var(--accent); border-color: var(--accent); }

  .acl-badge { font-size: 11px; font-family: var(--mono); padding: 3px 8px; border-radius: 5px; margin-left: auto; white-space: nowrap; }
  .badge-private { background: rgba(107,107,128,0.2); color: var(--muted); }
  .badge-public { background: rgba(34,197,94,0.15); color: var(--green); }
  .badge-auth { background: rgba(234,179,8,0.15); color: var(--yellow); }

  .log-panel {
    width: 270px; flex-shrink: 0;
    border-left: 1px solid var(--border);
    padding: 20px 16px;
    font-family: var(--mono); font-size: 11px;
    overflow-y: auto; max-height: calc(100vh - 65px);
  }

  .log-title { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }

  .log-entry {
    display: flex; gap: 8px; margin-bottom: 10px;
    padding-bottom: 10px; border-bottom: 1px solid var(--border);
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:translateY(0)} }

  .log-time { color: var(--muted); flex-shrink: 0; }
  .log-text { line-height: 1.5; word-break: break-all; }
  .log-success { color: var(--green); }
  .log-error { color: var(--red); }
  .log-info { color: #a78bfa; }
  .log-warn { color: var(--yellow); }

  .alert {
    padding: 11px 14px; border-radius: 9px;
    font-size: 13px; margin-bottom: 14px;
    display: flex; align-items: flex-start; gap: 9px;
    animation: fadeIn 0.3s ease;
  }

  .alert-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: var(--green); }
  .alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--red); }
  .alert-warn { background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); color: var(--yellow); }

  .empty-state { text-align: center; padding: 36px 20px; color: var(--muted); }
  .empty-icon { font-size: 36px; margin-bottom: 9px; }
  .empty-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; color: var(--text); }
  .empty-sub { font-size: 12px; font-family: var(--mono); }

  .toggle-wrap {
    display: flex; align-items: center; gap: 12px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 9px; padding: 11px 13px; margin-bottom: 14px;
  }

  .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; flex-shrink: 0; }
  .toggle input { display: none; }
  .toggle-track { position: absolute; inset: 0; background: var(--border); border-radius: 10px; transition: background 0.2s; }
  .toggle input:checked ~ .toggle-track { background: var(--accent2); }
  .toggle-thumb { position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
  .toggle input:checked ~ .toggle-thumb { transform: translateX(16px); }

  .acl-text strong { display: block; font-size: 13px; margin-bottom: 2px; }
  .acl-text span { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  .select-all-row {
    display: flex; align-items: center; gap: 9px;
    margin-bottom: 7px; font-size: 12px; color: var(--muted);
    cursor: pointer; padding: 0 2px;
  }

  .loading-overlay {
    display: flex; align-items: center; gap: 10px;
    padding: 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 9px;
    font-size: 13px; color: var(--muted); font-family: var(--mono);
    margin-bottom: 14px;
  }

  .btn-row { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 14px; }

  .cred-banner {
    background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.25);
    border-radius: 10px; padding: 12px 16px; margin-bottom: 18px;
    font-size: 12px; color: var(--yellow); font-family: var(--mono);
    display: flex; gap: 10px; align-items: flex-start;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function S3Manager() {
  const [tab, setTab] = useState(0);
  const [buckets, setBuckets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loadingBuckets, setLoadingBuckets] = useState(false);

  // Create bucket state
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [aclEnabled, setAclEnabled] = useState(true);
  const [creating, setCreating] = useState(false);

  // Upload state
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  // ACL state
  const [aclBucket, setAclBucket] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [selectedAcl, setSelectedAcl] = useState("private");
  const [applying, setApplying] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const log = useCallback((msg, type = "info") => {
    setLogs((prev) => [{ time: nowTime(), msg, type, id: Date.now() + Math.random() }, ...prev].slice(0, 100));
  }, []);

  const showAlert = useCallback((msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // ── Load buckets from AWS on mount ─────────────────────────────────────────
  useEffect(() => {
    loadAllBuckets();
  }, []);

  const loadAllBuckets = async () => {
    setLoadingBuckets(true);
    log("Connecting to AWS S3…", "info");
    try {
      const awsBuckets = await fetchBuckets();
      log(`Found ${awsBuckets.length} bucket(s) on AWS`, "info");

      const bucketsWithObjects = await Promise.all(
        awsBuckets.map(async (b) => {
          const objects = await fetchObjects(b.Name);
          return {
            name: b.Name,
            region: "us-east-1",
            aclEnabled: true,
            createdAt: b.CreationDate,
            objects,
          };
        })
      );

      setBuckets(bucketsWithObjects);
      log(`✓ Loaded ${awsBuckets.length} bucket(s) from AWS`, "success");
    } catch (err) {
      log(`✗ ${parseAwsError(err)}`, "error");
      showAlert(parseAwsError(err), "error");
    } finally {
      setLoadingBuckets(false);
    }
  };

  // ── Create bucket ──────────────────────────────────────────────────────────
  const handleCreateBucket = async () => {
    if (!bucketName.trim()) return showAlert("Please enter a bucket name.", "error");
    if (!/^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/.test(bucketName))
      return showAlert("Invalid name — use lowercase letters, numbers, hyphens (3-63 chars).", "error");

    setCreating(true);
    log(`Creating bucket "${bucketName}" in ${region}…`, "info");

    try {
      await awsCreateBucket(bucketName, region, aclEnabled);
      log(`✓ Bucket "${bucketName}" created`, "success");
      if (aclEnabled) log(`✓ ACL enabled on "${bucketName}"`, "success");
      showAlert(`Bucket "${bucketName}" created successfully!`);
      setBucketName("");
      await loadAllBuckets(); // Refresh list from AWS
    } catch (err) {
      const msg = parseAwsError(err);
      log(`✗ ${msg}`, "error");
      showAlert(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  // ── Upload files ───────────────────────────────────────────────────────────
  const addFiles = (newFiles) => {
    const mapped = Array.from(newFiles).map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      status: "ready",
      progress: 0,
      key: Date.now() + Math.random(),
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const handleUpload = async () => {
    if (!selectedBucket) return showAlert("Please select a target bucket.", "error");
    const readyFiles = files.filter((f) => f.status === "ready");
    if (readyFiles.length === 0) return showAlert("No files ready to upload.", "error");

    setUploading(true);

    for (const f of readyFiles) {
      setFiles((prev) => prev.map((x) => x.key === f.key ? { ...x, status: "uploading", progress: 30 } : x));
      log(`Uploading "${f.name}" → s3://${selectedBucket}/…`, "info");

      try {
        await awsUploadFile(selectedBucket, f.file);

        setFiles((prev) => prev.map((x) => x.key === f.key ? { ...x, status: "done", progress: 100 } : x));
        log(`✓ Uploaded "${f.name}" (${formatSize(f.size)})`, "success");
      } catch (err) {
        const msg = parseAwsError(err);
        setFiles((prev) => prev.map((x) => x.key === f.key ? { ...x, status: "error", progress: 0 } : x));
        log(`✗ Failed "${f.name}": ${msg}`, "error");
        showAlert(`Upload failed: ${msg}`, "error");
      }
    }

    // Refresh objects for this bucket from AWS
    try {
      const updated = await fetchObjects(selectedBucket);
      setBuckets((prev) =>
        prev.map((b) => (b.name === selectedBucket ? { ...b, objects: updated } : b))
      );
      log(`✓ Object list refreshed for "${selectedBucket}"`, "success");
    } catch (err) {
      log(`Could not refresh object list: ${parseAwsError(err)}`, "warn");
    }

    showAlert(`Upload complete for "${selectedBucket}"!`);
    setUploading(false);
  };

  // ── Apply ACL ──────────────────────────────────────────────────────────────
  const handleApplyAcl = async () => {
    if (!aclBucket) return showAlert("Please select a bucket.", "error");
    if (selectedObjects.length === 0) return showAlert("Please select at least one object.", "error");

    setApplying(true);
    log(`Applying ACL "${selectedAcl}" to ${selectedObjects.length} object(s)…`, "info");

    let successCount = 0;
    for (const objectName of selectedObjects) {
      try {
        await awsSetObjectAcl(aclBucket, objectName, selectedAcl);
        log(`✓ ACL updated: "${objectName}" → ${selectedAcl}`, "success");
        successCount++;
      } catch (err) {
        const msg = parseAwsError(err);
        log(`✗ Failed "${objectName}": ${msg}`, "error");
        showAlert(`ACL failed: ${msg}`, "error");
      }
    }

    // Reflect ACL change in local state (AWS doesn't return ACL in ListObjects)
    setBuckets((prev) =>
      prev.map((b) =>
        b.name === aclBucket
          ? {
              ...b,
              objects: b.objects.map((o) =>
                selectedObjects.includes(o.name) ? { ...o, acl: selectedAcl } : o
              ),
            }
          : b
      )
    );

    if (successCount > 0) {
      showAlert(`ACL set to "${selectedAcl}" for ${successCount} object(s)!`);
    }

    setSelectedObjects([]);
    setApplying(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentBucketObj = buckets.find((b) => b.name === aclBucket);
  const tabIcons = ["🪣", "⬆️", "🔐", "📋"];

  const aclBadge = (acl) => {
    if (acl === "private") return <span className="acl-badge badge-private">🔒 private</span>;
    if (acl === "public-read" || acl === "public-read-write") return <span className="acl-badge badge-public">🌐 {acl}</span>;
    return <span className="acl-badge badge-auth">🔑 {acl}</span>;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* Header */}
        <header className="header">
          <div className="logo">☁️</div>
          <h1>S3 <span>Manager</span></h1>
          <div className="header-right">
            <div className={`badge ${loadingBuckets ? "badge-warn" : "badge-live"}`}>
              <div className="dot" />
              {loadingBuckets ? "Connecting…" : "AWS Live"}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={loadAllBuckets} disabled={loadingBuckets}>
              {loadingBuckets ? <><div className="spinner spinner-dark" />Refreshing</> : "🔄 Refresh"}
            </button>
          </div>
        </header>

        <div className="main">
          {/* Sidebar */}
          <nav className="sidebar">
            <div className="sidebar-label">Operations</div>
            {TABS.map((t, i) => (
              <button key={t} className={`tab-btn ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
                <span className="tab-icon">{tabIcons[i]}</span>
                {t}
              </button>
            ))}

            {buckets.length > 0 && (
              <>
                <div className="sidebar-label" style={{ marginTop: 16 }}>
                  Your Buckets ({buckets.length})
                </div>
                {buckets.map((b) => (
                  <div key={b.name} className="bucket-pill">
                    <div className="bucket-pill-name">{b.name}</div>
                    <div>{b.region} · {b.objects.length} obj</div>
                  </div>
                ))}
              </>
            )}
          </nav>

          {/* Main Content */}
          <main className="content">
            {alert && (
              <div className={`alert alert-${alert.type}`}>
                <span>{alert.type === "success" ? "✅" : alert.type === "warn" ? "⚠️" : "❌"}</span>
                {alert.msg}
              </div>
            )}

            {/* ── TAB 0: Create Bucket ── */}
            {tab === 0 && (
              <>
                <div className="page-title">Create Bucket</div>
                <div className="page-sub">aws s3api create-bucket</div>

                <div className="cred-banner">
                  ⚠️ Using AWS Learner's Lab? Paste fresh credentials into .env each session and restart the dev server.
                </div>

                <div className="card">
                  <div className="card-title">Bucket Configuration</div>
                  <div className="row">
                    <div className="field">
                      <label>Bucket Name *</label>
                      <input
                        value={bucketName}
                        onChange={(e) => setBucketName(e.target.value.toLowerCase())}
                        placeholder="my-bucket-name"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateBucket()}
                      />
                      <div className="hint">Globally unique · lowercase · 3-63 chars</div>
                    </div>
                    <div className="field">
                      <label>AWS Region *</label>
                      <select value={region} onChange={(e) => setRegion(e.target.value)}>
                        {AWS_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <div className="hint">Learner's Lab: keep us-east-1</div>
                    </div>
                  </div>

                  <div className="toggle-wrap">
                    <label className="toggle">
                      <input type="checkbox" checked={aclEnabled} onChange={(e) => setAclEnabled(e.target.checked)} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                    <div className="acl-text">
                      <strong>Enable ACL (Access Control Lists)</strong>
                      <span>Required for per-object access control · Disables Block Public Access</span>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleCreateBucket} disabled={creating}>
                    {creating ? <><div className="spinner" />Creating…</> : <>🪣 Create Bucket</>}
                  </button>
                </div>

                {/* Existing Buckets */}
                {loadingBuckets ? (
                  <div className="loading-overlay">
                    <div className="spinner" style={{ borderTopColor: "var(--accent)" }} />
                    Fetching buckets from AWS…
                  </div>
                ) : buckets.length > 0 && (
                  <div className="card">
                    <div className="card-title">Your AWS Buckets</div>
                    {buckets.map((b) => (
                      <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", background: "var(--surface2)", borderRadius: 9, marginBottom: 7, border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 18 }}>🪣</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                            {b.region} · {b.objects.length} objects · Created {new Date(b.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── TAB 1: Upload Files ── */}
            {tab === 1 && (
              <>
                <div className="page-title">Upload Objects</div>
                <div className="page-sub">aws s3 cp · PutObjectCommand</div>

                {buckets.length === 0 ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-icon">🪣</div>
                      <div className="empty-title">No buckets found</div>
                      <div className="empty-sub">Create a bucket first, or check your AWS credentials</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card">
                      <div className="card-title">Target Bucket</div>
                      <div className="bucket-select">
                        {buckets.map((b) => (
                          <div key={b.name} className={`bucket-option ${selectedBucket === b.name ? "selected" : ""}`} onClick={() => setSelectedBucket(b.name)}>
                            <div className="bucket-dot" />
                            <div>
                              <div className="bucket-name-text">{b.name}</div>
                              <div className="bucket-region-text">{b.region} · {b.objects.length} objects</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-title">Select Files</div>
                      <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
                      <div
                        className={`drop-zone ${dragOver ? "drag-over" : ""}`}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                      >
                        <div className="drop-icon">⬆️</div>
                        <div className="drop-title">Drop files here or click to browse</div>
                        <div className="drop-sub">Any file type · Multiple files supported</div>
                      </div>

                      {files.length > 0 && (
                        <div className="file-list">
                          {files.map((f) => (
                            <div key={f.key} className="file-item">
                              <span className="file-icon">{getFileIcon(f.name)}</span>
                              <div className="file-info">
                                <div className="file-name">{f.name}</div>
                                <div className="file-size">{formatSize(f.size)}</div>
                                {f.status === "uploading" && (
                                  <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: f.progress + "%" }} />
                                  </div>
                                )}
                              </div>
                              <span className={`file-status status-${f.status}`}>{f.status}</span>
                              {f.status === "ready" && (
                                <button className="btn btn-danger btn-sm" onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))}>✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="btn-row">
                        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || files.filter((f) => f.status === "ready").length === 0}>
                          {uploading ? <><div className="spinner" />Uploading…</> : <>⬆️ Upload {files.filter((f) => f.status === "ready").length || ""} File(s)</>}
                        </button>
                        {files.some((f) => f.status === "done" || f.status === "error") && (
                          <button className="btn btn-secondary" onClick={() => setFiles((prev) => prev.filter((f) => f.status === "ready"))}>Clear Finished</button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── TAB 2: Manage Access ── */}
            {tab === 2 && (
              <>
                <div className="page-title">Manage Access</div>
                <div className="page-sub">aws s3api put-object-acl · PutObjectAclCommand</div>

                {buckets.length === 0 ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-icon">🔐</div>
                      <div className="empty-title">No buckets found</div>
                      <div className="empty-sub">Create a bucket and upload files first</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card">
                      <div className="card-title">Select Bucket</div>
                      <div className="bucket-select">
                        {buckets.map((b) => (
                          <div key={b.name} className={`bucket-option ${aclBucket === b.name ? "selected" : ""}`} onClick={() => { setAclBucket(b.name); setSelectedObjects([]); }}>
                            <div className="bucket-dot" />
                            <div style={{ flex: 1 }}>
                              <div className="bucket-name-text">{b.name}</div>
                              <div className="bucket-region-text">{b.region} · {b.objects.length} objects</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aclBucket && (
                      <>
                        <div className="card">
                          <div className="card-title">Objects in {aclBucket}</div>
                          {currentBucketObj?.objects.length === 0 ? (
                            <div className="empty-state" style={{ padding: 20 }}>
                              <div className="empty-icon">📭</div>
                              <div className="empty-title">No objects</div>
                              <div className="empty-sub">Upload files to this bucket first</div>
                            </div>
                          ) : (
                            <>
                              <div className="select-all-row" onClick={() => {
                                const all = currentBucketObj?.objects.map((o) => o.name) || [];
                                setSelectedObjects(selectedObjects.length === all.length ? [] : all);
                              }}>
                                <div className="check-box" style={{
                                  background: selectedObjects.length === currentBucketObj?.objects.length ? "var(--accent)" : "none",
                                  borderColor: selectedObjects.length === currentBucketObj?.objects.length ? "var(--accent)" : "var(--border)",
                                }}>
                                  {selectedObjects.length === currentBucketObj?.objects.length ? "✓" : ""}
                                </div>
                                Select all ({currentBucketObj?.objects.length} objects)
                              </div>
                              <div className="object-list">
                                {currentBucketObj?.objects.map((o) => (
                                  <div key={o.name} className={`object-item ${selectedObjects.includes(o.name) ? "selected" : ""}`} onClick={() => {
                                    setSelectedObjects((prev) =>
                                      prev.includes(o.name) ? prev.filter((x) => x !== o.name) : [...prev, o.name]
                                    );
                                  }}>
                                    <div className="check-box">{selectedObjects.includes(o.name) ? "✓" : ""}</div>
                                    <span>{getFileIcon(o.name)}</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)" }}>{o.name}</div>
                                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatSize(o.size)}</div>
                                    </div>
                                    {aclBadge(o.acl)}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {selectedObjects.length > 0 && (
                          <div className="card">
                            <div className="card-title">Set Access — {selectedObjects.length} object(s) selected</div>
                            <div className="acl-grid">
                              {ACCESS_LEVELS.map((a) => (
                                <div key={a.value} className={`acl-option ${selectedAcl === a.value ? "selected" : ""}`} onClick={() => setSelectedAcl(a.value)}>
                                  <div className="acl-icon">{a.icon}</div>
                                  <div className="acl-label">{a.label}</div>
                                  <div className="acl-desc">{a.desc}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 14 }}>
                              <button className="btn btn-primary" onClick={handleApplyAcl} disabled={applying}>
                                {applying ? <><div className="spinner" />Applying…</> : <>🔐 Apply Permission</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── TAB 3: Activity Log ── */}
            {tab === 3 && (
              <>
                <div className="page-title">Activity Log</div>
                <div className="page-sub">All AWS API calls and responses</div>
                <div className="card" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                  {logs.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <div className="empty-title">No activity yet</div>
                      <div className="empty-sub">Operations will be logged here</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setLogs([])}>Clear Log</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {logs.map((l) => (
                          <div key={l.id} className="log-entry">
                            <span className="log-time">{l.time}</span>
                            <span className={`log-text log-${l.type}`}>{l.msg}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </main>

          {/* Live Console Sidebar */}
          <aside className="log-panel">
            <div className="log-title">Live Console</div>
            {logs.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>Waiting for operations…</div>
            ) : (
              logs.slice(0, 20).map((l) => (
                <div key={l.id} className="log-entry">
                  <span className="log-time">{l.time}</span>
                  <span className={`log-text log-${l.type}`}>{l.msg}</span>
                </div>
              ))
            )}
          </aside>
        </div>
      </div>
    </>
  );
}