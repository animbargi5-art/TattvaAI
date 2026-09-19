# TattvaAI Web Dashboard

The web frontend for **TattvaAI** — an autonomous incident investigation platform. It provides SRE and on-call engineering teams with real-time incident tracking, multi-agent investigation graphs, evidence correlation, root cause analysis, and one-click mitigation reviews.

Built with **React 19**, **Vite**, and **PrimeReact**, designed to run against both a local FastAPI development server and our live AWS serverless backend (API Gateway + Lambda).

---

## ⚡ Tech Stack

- **Framework**: React 19 with Vite 8 (fast HMR, Rolldown/ESBuild bundling)
- **UI Components**: PrimeReact 10 + PrimeIcons + PrimeFlex
- **Typography & Theming**: Outfit & Inter fonts with a curated dark cyberpunk / glassmorphic palette
- **Graph & Visualizations**:
  - React Flow (service topology & dependency graph)
  - Chart.js (incident trends, severity metrics, and MTTR distribution)
- **Data & State**: TanStack React Query + Axios + native WebSocket client for live telemetry streams
- **Exporting**: Direct JSON, Markdown, and PDF report downloads

---

## 🧭 Application Features & Pages

### 1. Investigation Dashboard (`/dashboard`)
- High-level health counters: Active incidents, Mean Time to Resolve (MTTR), resolution rate, and AI confidence score.
- Active incident monitor with quick-action triggers to start fresh multi-agent investigations.
- Live telemetry badge indicating the connected telemetry provider (**AWS Observability**, **SigNoz**, or **Demo/Mock**).

### 2. Live Investigation Workspace (`/investigation/:id`)
- **Multi-Agent Pipeline**: Step-by-step progress tracking across specialized agents (Trace, Logs, Metrics, Dependency, Alert, and Historical agents).
- **Interactive Evidence Panel**: Real telemetry records retrieved directly from CloudWatch, X-Ray, or SigNoz, mapped with latency, error rates, and raw payload inspection.
- **Root Cause & Confidence Analysis**: Clear explanation of the underlying failure mechanism, ranked by AI confidence with Amazon Bedrock reasoning.
- **Human-in-the-Loop Review**: Allows engineers to approve, reject, or comment on recommended remediations before automated actions are triggered.
- **Downloadable Incident Reports**: Immediate export to PDF, JSON, or Markdown for post-mortems and compliance.

### 3. Investigation History & Analytics (`/history`, `/reports`)
- Searchable, filterable audit log of all previous investigations stored in AWS DynamoDB.
- Trend charts analyzing failure hotspots, frequently failing services, and average time spent investigating.

### 4. Settings & Provider Configuration (`/settings`)
- Switch telemetry sources on the fly:
  - **AWS Observability** (Amazon CloudWatch Logs/Metrics + AWS X-Ray traces)
  - **SigNoz** (Distributed tracing & OpenTelemetry metrics)
  - **OpenTelemetry-compatible Backend** (Generic OTLP collector)
  - **Mock / Demo** (Deterministic offline scenarios for training and demos)

---

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets and icons
├── src/
│   ├── api/                # Axios instance with auth/error interceptors
│   ├── components/         # Reusable PrimeReact UI components
│   │   ├── Dashboard/      # Dashboard cards, status counters, recent list
│   │   ├── Investigation/  # Pipeline, Evidence, Root Cause, Action panels
│   │   ├── Navbar/         # Top navigation bar with provider status
│   │   └── Sidebar/        # Collapsible application navigation
│   ├── hooks/              # Custom React hooks (useDashboard, useInvestigation, useWebSocket)
│   ├── pages/              # Primary route views (Dashboard, Investigation, History, Reports, Settings)
│   ├── services/           # API service modules interfacing with FastAPI endpoints
│   ├── styles/             # Modular CSS stylesheets and PrimeReact theme overrides
│   ├── utils/              # Telemetry formatting, dates, and severity helper utilities
│   ├── App.jsx             # Top-level router and layout shell
│   └── main.jsx            # Application entry point
├── .env.example            # Environment variable template
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite build and dev server configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- Running TattvaAI backend (either local FastAPI server or live AWS API Gateway)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set the backend API endpoint in `.env`:
```env
# Point to local backend:
VITE_API_BASE_URL=http://localhost:8000

# OR point to the live AWS Lambda / API Gateway production deployment:
# VITE_API_BASE_URL=https://eodackuif2.execute-api.us-east-1.amazonaws.com

VITE_APP_NAME=TattvaAI
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEMO_MODE=true
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```
Production artifacts will be bundled cleanly into `dist/`.

To preview the production build locally:
```bash
npm run preview
```

---

## ☁️ Deployment

The frontend is deployed to **AWS Amplify** via continuous Git integration or manual zip upload.

Amplify build specifications are defined in the repository root `amplify.yml`:
- **Build command**: `npm run build`
- **Output directory**: `frontend/dist`
- **Node version**: 20+

Rewrite rules are pre-configured to route all Single Page Application (SPA) paths back to `/index.html`.

---

## 🧪 Testing & Code Quality

```bash
# Run unit tests
npm test

# Run ESLint validation
npm run lint

# Automatically fix linting issues
npm run lint:fix

# TypeScript check (if applicable)
npm run type-check
```

---

## 💡 Tips & Troubleshooting

- **CORS Issues in Local Dev**: Ensure the backend's `FRONTEND_ORIGIN` matches your Vite port (`http://localhost:5173`).
- **Telemetry Not Refreshing**: In the Settings tab, make sure the desired Telemetry Provider is selected and that the backend has valid AWS IAM credentials or SigNoz connectivity.
- **PrimeReact Styling**: Theme tokens and glassmorphism overrides are centralized in `src/styles/polish.css` and `src/styles/components/`.
