# 🚀 TattvaAI

### AI-Powered Incident Investigation Platform for SREs & On-Call Teams

**From alert to verified root cause in 30 seconds — backed by real telemetry, zero hallucinations.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-AWS%20Amplify-0EA5E9?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://main.d3g1wefvf7qg71.amplifyapp.com)
[![Production API](https://img.shields.io/badge/Production%20API-AWS%20API%20Gateway-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://eodackuif2.execute-api.us-east-1.amazonaws.com)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com)

---

> 🌐 **Public Live Application:** [https://main.d3g1wefvf7qg71.amplifyapp.com](https://main.d3g1wefvf7qg71.amplifyapp.com)  
> ⚡ **Live Production API Gateway:** `https://eodackuif2.execute-api.us-east-1.amazonaws.com`

---

## 🎯 What is TattvaAI?

When production breaks at 2 AM, on-call engineers typically spend 2 to 4 hours frantically juggling tools:
- Digging through distributed traces across multiple microservices
- Grepping through megabytes of CloudWatch or SigNoz logs
- Comparing metric spikes and dashboards against normal baselines
- Trying to remember if this exact issue happened three months ago

**TattvaAI automates this entire triage and investigation process in under 30 seconds.**

Instead of manual guessing, TattvaAI orchestrates an **8-stage multi-agent telemetry pipeline** that simultaneously queries and correlates traces, logs, metrics, service dependencies, active alerts, and past incident history. An evidence-based reasoning engine links data points into an unambiguous causal chain, estimates confidence scores, and generates prioritized, actionable remediation steps.

---

## ✨ Core Highlights

- 🔐 **Persistent JWT Authentication**: Secure, bcrypt-hashed engineer authentication stored in Amazon DynamoDB (`tattvaai_users`) with 7-day persistent session management and protected client-side routing.
- 🤖 **8-Stage Multi-Agent Pipeline**: Dedicated analysis agents process Traces, Logs, Metrics, Service Dependencies, Alerts, Historical Incident Patterns, Cross-Correlation, and Causal Reasoning.
- 🔒 **Zero Telemetry Hallucinations**: Every observation, hypothesis, and recommendation is strictly linked to a concrete `evidence_id` retrieved directly from your observability stack.
- 🧠 **Explainable AI Reasoning**: Formulates step-by-step causal explanations, separates symptoms from root causes, and highlights known uncertainties.
- 👤 **Human-in-the-Loop Review**: AI never blindly modifies production. SREs can accept, reject, or comment on findings before any remediation executes.
- ☁️ **100% Serverless on AWS**: Runs on AWS Lambda, Amazon API Gateway, DynamoDB, S3, and AWS Amplify Hosting — zero servers to patch or idle compute costs.
- 📄 **One-Click Post-Mortem Reports**: Instantly export complete investigation reports to PDF, JSON, or Markdown for post-mortems and compliance.
- 🔌 **Multi-Provider Telemetry**: Works seamlessly with **AWS Observability** (CloudWatch Logs/Metrics + AWS X-Ray), **SigNoz OTLP**, or an offline **Demo/Mock mode** for training.
- 🎨 **Modern Developer UI**: Linear/Vercel-inspired clean blue/white palette, responsive layout, information-rich data tables, and dynamic React Flow dependency graphs.

---

## 🏗️ Architecture

```
                       ┌─────────────────────────┐
                       │     React 19 + Vite     │
                       │      (AWS Amplify)      │
                       └────────────┬────────────┘
                                    │ HTTPS REST / SSE
                                    ▼
                       ┌─────────────────────────┐
                       │   Amazon API Gateway    │
                       └────────────┬────────────┘
                                    │ AWS Proxy
                                    ▼
                       ┌─────────────────────────┐
                       │   FastAPI on Lambda     │
                       │    (TattvaAI-Backend)   │
                       └────────────┬────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│   Telemetry Source    │  │   Reasoning Engine    │  │     Persistence       │
│  - AWS CloudWatch     │  │  - Amazon Bedrock     │  │  - AWS DynamoDB       │
│  - AWS X-Ray          │  │    (Claude Sonnet)    │  │    (Investigations)   │
│  - SigNoz / OTLP      │  │  - Offline Fallback   │  │  - AWS S3 (Reports)   │
│  - Mock / Demo Mode   │  │                       │  │  - Secrets Manager    │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

## 🤖 The 8-Stage Multi-Agent Pipeline

1. **🔍 Trace Agent**: Analyzes distributed traces across service boundaries, flags slow endpoints, HTTP 5xx spikes, and highlights where latency compounds.
2. **📜 Logs Agent**: Scans application log streams for fatal exceptions, timeout patterns, and error frequency bursts.
3. **📊 Metrics Agent**: Tracks CPU saturation, memory leaks, throughput cliffs, and threshold violations against historical baselines.
4. **🌐 Dependency Agent**: Generates real-time service dependency graphs to distinguish root failure originators from cascading downstream victims.
5. **🚨 Alert Agent**: Groups related alerts across monitoring systems, calculates noise reduction, and isolates the trigger alert.
6. **📚 Historical Agent**: Matches current telemetry anomalies against resolved past incidents to surface proven runbooks and mitigations.
7. **🔗 Evidence Correlation Agent**: Cross-correlates multi-source telemetry signals into coherent symptom clusters, discarding noise.
8. **🧠 AI Reasoning & Decision Engine**: Evaluates the evidence chain, forms the primary root-cause hypothesis, scores confidence, and recommends remediations.

---

## 🚀 Getting Started

You can run TattvaAI locally for development or access the deployed AWS serverless environment.

### Option 1: Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/animbargi5-art/TattvaAI.git
cd TattvaAI
```

#### 2. Start Backend (FastAPI)
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be running at `http://localhost:8000` (OpenAPI docs at `http://localhost:8000/docs`).

#### 3. Start Frontend (React + Vite)
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to access the TattvaAI dashboard.

---

### Option 2: Live AWS Serverless Deployment

TattvaAI is deployed in `us-east-1` using native AWS services:

| Component | AWS Resource | Status |
| :--- | :--- | :--- |
| **Frontend UI** | AWS Amplify Hosting: [https://main.d3g1wefvf7qg71.amplifyapp.com](https://main.d3g1wefvf7qg71.amplifyapp.com) | **LIVE** |
| **API Gateway** | `https://eodackuif2.execute-api.us-east-1.amazonaws.com` | **LIVE** |
| **Backend Lambda** | `TattvaAI-Backend` (Python 3.10 + Mangum) | **LIVE** |
| **Authentication DB** | DynamoDB table `tattvaai_users` (JWT sessions) | **ACTIVE** |
| **Investigations DB** | DynamoDB table `tattvaai_investigations` | **ACTIVE** |
| **Reports Bucket** | S3 bucket `tattvaai-investigation-reports` | **ACTIVE** |
| **AI Reasoning** | Multi-Provider Reasoning Engine (Bedrock / Fallback) | **ACTIVE** |
| **Telemetry** | AWS Observability (CloudWatch + AWS X-Ray) | **LIVE** |

For detailed AWS setup, IAM policies, and infrastructure configuration, see [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md).

---

## 🎭 Live Incident Walkthrough

### Scenario: Payment Service Outage
**Symptom**: Customer checkouts are failing with HTTP 504 Gateway Timeouts.

1. **Investigation Triggered**:
   ```bash
   curl -X POST "https://eodackuif2.execute-api.us-east-1.amazonaws.com/investigation/start?service_name=payment-service" \
     -H "Content-Type: application/json" \
     -d '{"telemetry_source": "aws", "environment": "Production", "time_window": "1h"}'
   ```
2. **Investigation Findings**:
   - **X-Ray**: Discovers 6,697ms latency on downstream `TattvaAI-Backend` call (`ev-trace-1-6aaed111-1439dcb00f13d6242225c3b2`).
   - **CloudWatch**: Detects active `AWS/Lambda/Errors` alarm (`ev-metric-AWS/Lambda/Errors-2`).
   - **Dependency Graph**: Reveals `payment-service` waiting on external partner response, exhausting connection pool.
   - **Historical Match**: Correlates 40% pattern similarity with past resolved incident `INC-HIST-082`.
3. **Diagnosis**:
   - **Root Cause**: Downstream latency and error propagation in `TattvaAI-Backend` causing connection pool starvation in `payment-service`.
   - **Confidence**: 88%
   - **Immediate Fix**: Enable circuit breaker with fast-fallback on partner integration.
4. **Human Review**:
   On-call engineer reviews the evidence in the UI, clicks **Accept Mitigation**, and downloads the post-mortem PDF.

---

## 🛠️ REST API Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Create an engineer account (bcrypt password hashing) |
| `POST` | `/auth/login` | Authenticate credentials and receive persistent 7-day JWT |
| `GET` | `/auth/me` | Fetch authenticated operator profile |
| `GET` | `/health` | System health check (`{"status": "healthy"}`) |
| `GET` | `/telemetry/providers` | List available telemetry sources and status |
| `POST` | `/telemetry/providers/test` | Test live connectivity to AWS, SigNoz, or OTLP |
| `POST` | `/investigation/start` | Launch a new multi-agent investigation |
| `GET` | `/investigation/{id}` | Get full investigation state, evidence, and root causes |
| `GET` | `/investigation/history` | Query past investigations from DynamoDB |
| `GET` | `/investigation/{id}/review` | Fetch human review status and notes |
| `POST` | `/investigation/{id}/review` | Submit human engineer decision (`ACCEPTED` / `REJECTED`) |
| `GET` | `/investigation/{id}/export/pdf` | Download formatted PDF incident post-mortem |
| `GET` | `/investigation/{id}/export/json` | Export raw JSON investigation report |
| `GET` | `/investigation/{id}/export/markdown` | Export Markdown post-mortem document |

---

## 📁 Repository Structure

```
TattvaAI/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── agents/            # Specialized AI investigation agents
│   │   ├── api/               # REST API route handlers (Auth, Telemetry, Investigation)
│   │   ├── coordinator/       # Agent pipeline orchestrator
│   │   ├── database/          # DynamoDB & SQLite repository layer
│   │   ├── decision/          # Reasoning provider & decision engine
│   │   ├── models/            # Pydantic & SQLAlchemy data models
│   │   ├── schemas/           # Request/response schemas & contracts
│   │   ├── services/          # DynamoDB, S3, Secrets Manager, and export services
│   │   └── telemetry/         # AWS Observability (X-Ray/CW) & SigNoz providers
│   ├── lambda_handler.py      # AWS Lambda entrypoint (Mangum ASGI adapter)
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React 19 + Vite developer dashboard
│   ├── src/
│   │   ├── components/        # PrimeReact UI components, Navbar, Sidebar
│   │   ├── contexts/          # AuthContext (JWT persistence, protected routing)
│   │   ├── layouts/           # MainLayout (Linear/Vercel-inspired developer shell)
│   │   ├── pages/             # Dashboard, Investigation, History, Reports, Settings, Login, Signup
│   │   ├── services/          # API service clients
│   │   └── styles/            # Polish design system (clean blue/white palette)
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js          # Vite bundler configuration
├── amplify.yml                 # AWS Amplify frontend build & CI/CD specification
├── docs/                       # Comprehensive documentation
│   └── AWS_DEPLOYMENT.md      # Step-by-step AWS deployment guide
├── DEMO_GUIDE.txt             # Manual testing and demo walkthrough guide
└── README.md                  # Project overview (this file)
```

---

## 📄 License & Acknowledgments

This project is licensed under the [MIT License](LICENSE).

Built with pride using open-source technologies:
- [FastAPI](https://fastapi.tiangolo.com/) & [Uvicorn](https://www.uvicorn.org/)
- [React](https://react.dev/) & [Vite](https://vitejs.dev/)
- [PrimeReact](https://primereact.org/) & [React Flow](https://reactflow.dev/)
- [OpenTelemetry](https://opentelemetry.io/) & [SigNoz](https://signoz.io/)
- [Amazon Web Services](https://aws.amazon.com/) (Lambda, API Gateway, DynamoDB, S3, Bedrock, Amplify)