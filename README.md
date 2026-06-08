# ☁️ S3 Manager - AWS Bucket Management Dashboard

A modern, full-stack web application for managing Amazon S3 buckets with an intuitive UI. Create buckets, upload files, and control access permissions across multiple AWS regions.

![React](https://img.shields.io/badge/React-19.2.6-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![AWS SDK](https://img.shields.io/badge/AWS%20SDK-S3-orange?logo=amazon)
![Vite](https://img.shields.io/badge/Vite-8.0-blueviolet?logo=vite)

---

## 📋 Features

✅ **Bucket Management**
- Create S3 buckets in 10+ AWS regions
- View all existing buckets with metadata
- Display object counts and creation dates
- Real-time bucket status

⬆️ **File Upload**
- Drag-and-drop file uploads
- Multi-file batch uploads
- Upload progress tracking
- File type icons and size formatting

🔐 **Access Control**
- Set per-object ACL (Access Control Lists)
- 4 access levels: Private, Public Read, Public Read/Write, Authenticated Read
- Batch ACL updates on multiple objects
- Enable/disable ACL during bucket creation

📊 **Activity Logging**
- Real-time operation logs with timestamps
- Color-coded success, error, warning, and info messages
- Up to 100 log entries stored in-session

---

## 💡 What We're Building

### The Problem
Managing AWS S3 buckets through the AWS Console is powerful but can be cumbersome for developers. You need to:
- Navigate multiple AWS Console pages
- Handle complex permission models
- Deal with regional configurations
- Manage multiple files and ACLs manually

### The Solution
**S3 Manager** is a **modern, user-friendly web dashboard** that simplifies S3 operations into a few clicks:

```
AWS Console (Complex) → S3 Manager (Simple)
  ├─ Click 5+ times to create bucket    │    ├─ 1. Enter name
  ├─ Navigate regions carefully         │    ├─ 2. Pick region
  ├─ Upload each file individually      │    ├─ 3. Drag & drop multiple files
  ├─ Set ACL in separate menu          │    └─ 4. Batch set permissions
  └─ No visual feedback                 │    └─ Real-time logs ✅
```

### What You Can Do

**1. Create Buckets in Any Region**
```
Frontend UI: "Create Bucket" tab
  → Enter bucket name (e.g., "my-app-assets")
  → Select region (e.g., ap-south-1 for Mumbai)
  → Toggle ACL support
  → Click "Create"
  → Backend makes regional API call to AWS
  → Bucket created! ✅
```

**2. Upload Files with Drag & Drop**
```
Frontend UI: "Upload Objects" tab
  → Select target bucket
  → Drag files or click to browse
  → See upload progress for each file
  → Automatically refresh bucket contents
  → Files ready to use! ✅
```

**3. Control Who Can Access Your Files**
```
Frontend UI: "Manage Access" tab
  → Pick bucket → Select files
  → Choose access level:
      🔒 Private (only you)
      🌐 Public Read (anyone can read)
      ✏️  Public Read/Write (anyone can upload)
      🔑 Authenticated Read (AWS users only)
  → Apply to multiple files at once
  → Permissions updated! ✅
```

**4. Monitor All Operations in Real-Time**
```
Activity Log (right panel):
  ✅ "Created bucket 'my-app-assets' in us-east-1"
  ✅ "Uploaded 3 files to my-app-assets"
  🔐 "ACL set to public-read for index.html"
  ⚠️  "Session expired - update .env credentials"
```

### Why Full-Stack?

**Frontend (React):**
- Beautiful, responsive UI
- Real-time status updates
- Instant feedback on user actions
- Dark theme with glassmorphism design

**Backend (Express):**
- Secure credential handling (not exposed in browser)
- Routes requests to correct AWS regional endpoints
- Handles CORS restrictions
- Centralizes error handling and logging

**AWS S3:**
- Actual bucket storage
- Multi-region support
- ACL management
- Object versioning

### Real-World Use Cases

✅ **Web Developers** - Host static assets, manage CDN origins
✅ **Data Scientists** - Upload datasets, share research files
✅ **DevOps Engineers** - Manage backups, config files, logs
✅ **AWS Learners** - Learn S3 APIs without AWS Console
✅ **Teams** - Collaborative file management with ACL control

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19.2.6 - UI components
- Vite 8.0 - Fast build tool with HMR
- CSS-in-JS - Inline styled components with glassmorphism design

**Backend:**
- Express 5.2.1 - REST API server
- Node.js - Runtime
- CORS - Cross-origin request handling

**AWS:**
- AWS SDK v3 (Client S3) - S3 operations
- Direct bucket/object API calls with regional endpoints

### How It Works

```
Browser (React UI)
    ↓ HTTP/CORS
Node.js Backend (Express API)
    ↓ AWS SDK
AWS S3 (Regional Endpoints)
```

**Why a backend?**
- Browser cannot make direct AWS API calls (CORS restriction)
- Backend securely handles credentials server-side
- Handles regional endpoint routing
- Unified error handling and logging

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- AWS credentials (Access Key ID, Secret Key, optional Session Token)
- AWS Learner's Lab or personal AWS account

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd s3-manager
   npm install
   ```

2. **Configure AWS credentials in `.env`:**
   ```env
   VITE_AWS_ACCESS_KEY_ID=your_access_key
   VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
   VITE_AWS_SESSION_TOKEN=your_session_token (if using Learner's Lab)
   VITE_AWS_REGION=us-east-1
   ```

   ⚠️ **Important:** Variables must have `VITE_` prefix for Vite to expose them!

3. **Start the backend server** (Terminal 1):
   ```bash
   npm run server
   # Server runs on http://localhost:5000
   ```

4. **Start the frontend dev server** (Terminal 2):
   ```bash
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

5. **Open browser:**
   ```
   http://localhost:5173
   ```

---

## 📖 Usage Guide

### Create Bucket
1. Navigate to **Create Bucket** tab
2. Enter unique bucket name (lowercase, 3-63 chars)
3. Select AWS region (defaults to us-east-1)
4. Toggle ACL if you need per-object access control
5. Click "🪣 Create Bucket"

### Upload Files
1. Go to **Upload Objects** tab
2. Select target bucket
3. Drop files or click to browse
4. Click "⬆️ Upload Files"
5. Monitor progress and logs

### Manage Access
1. Open **Manage Access** tab
2. Select bucket and objects
3. Choose access level (🔒 🌐 ✏️ 🔑)
4. Click "🔐 Apply Permission"

### View Logs
- Real-time activity log on the right panel
- Tracks all operations with timestamps
- Color-coded: ✅ success, ❌ error, ⚠️ warning, ℹ️ info

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buckets` | List all S3 buckets |
| GET | `/api/buckets/:bucketName/objects` | List objects in bucket |
| POST | `/api/buckets` | Create new bucket |
| POST | `/api/buckets/:bucketName/upload` | Upload file |
| PUT | `/api/buckets/:bucketName/objects/:key/acl` | Set object ACL |

---

## 🎨 Design Highlights

- **Dark theme** with glassmorphism effects
- **Responsive UI** optimized for desktop
- **Syne font** for headers, JetBrains Mono for code/values
- **Smooth animations** and transitions
- **Accessible color scheme** with accent gradients

---

## ⚙️ Environment Variables

```env
# AWS Credentials (required)
VITE_AWS_ACCESS_KEY_ID=<your_key>
VITE_AWS_SECRET_ACCESS_KEY=<your_secret>
VITE_AWS_SESSION_TOKEN=<optional_session_token>
VITE_AWS_REGION=<default_region>

# Server Config (optional)
PORT=5000  # Backend API port
```

---

## 📝 Error Handling

The app gracefully handles AWS errors:
- `BucketAlreadyOwnedByYou` - Bucket exists
- `BucketAlreadyExists` - Name taken globally
- `AccessDenied` - IAM permission issue
- `ExpiredTokenException` - Session expired
- `InvalidClientTokenId` - Bad credentials

All errors are logged with actionable messages.

---

## 🔒 Security Notes

- ✅ Credentials stored server-side (.env)
- ✅ No credentials exposed in frontend code
- ✅ No credentials in version control (.gitignore)
- ✅ CORS restricted to localhost in dev
- ⚠️ For production: Add authentication & env var management

---

## 📦 Scripts

```bash
npm run dev        # Start Vite dev server
npm run server     # Start Express backend
npm run dev-full   # Start both (requires concurrently)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "fail to fetch" | Start backend server on port 5000 |
| "endpoint must be specified" | Check region is correct in .env |
| "Invalid credentials" | Verify .env has VITE_ prefix |
| "Access denied" | Check IAM permissions for your AWS user |
| "Session expired" | Refresh credentials in .env (Learner's Lab) |

---

## 🚀 Future Enhancements

- [ ] Bucket versioning & lifecycle policies
- [ ] Server-side encryption options
- [ ] CloudFront distribution integration
- [ ] Multi-part uploads for large files
- [ ] Bucket analytics & usage metrics
- [ ] User authentication & role-based access
- [ ] Deployment to AWS Lambda/ECS

---

## 📄 License

MIT - Feel free to use this project as a template or learning resource.

---

## 👤 Author

Built with ☁️ for AWS cloud enthusiasts

**Questions?** Check the logs, verify your credentials, and ensure both servers are running!

