# 🚀 TattvaAI

### AI-Powered Incident Investigation Platform

**Transform hours of manual incident investigation into minutes of intelligent analysis**

![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?style=for-the-badge&logo=amazon-aws)
![SigNoz](https://img.shields.io/badge/SigNoz-Integrated-FF6B35?style=for-the-badge)

---

## 🎯 What is TattvaAI?

TattvaAI is a comprehensive AI-powered incident investigation platform that automates the complex process of analyzing production incidents. Instead of manually searching through distributed traces, logs, and metrics for hours, our specialized AI agents work together to quickly identify root causes and provide actionable solutions.

### The Problem We Solve
When production systems fail, engineering teams typically spend 2-4 hours:
- 🔍 Searching through distributed traces across multiple services
- 📜 Reading thousands of log entries to find error patterns  
- 📊 Analyzing metric dashboards for performance anomalies
- 🌐 Checking service dependencies and failure propagation
- 🕐 Comparing with historical incidents and known patterns

### Our AI-Powered Solution
TattvaAI's multi-agent system completes this analysis in under 30 seconds:
- 🤖 **6 Specialized AI Agents** analyze different telemetry aspects
- 🧠 **Evidence-Based Reasoning** with transparent decision making
- 🎯 **Root Cause Identification** with confidence scoring
- 📋 **Actionable Recommendations** for immediate and long-term fixes
- 🔄 **Historical Pattern Learning** to improve future investigations

---

## ✨ Key Features

🎭 **Multi-Agent Investigation System**  
Six specialized AI agents collaborate to analyze traces, logs, metrics, dependencies, alerts, and historical patterns

🧠 **Intelligent Evidence Correlation**  
Advanced reasoning engine connects findings across all telemetry sources with transparent logic

🎯 **Automated Root Cause Analysis**  
AI-powered analysis identifies likely causes with confidence scores and supporting evidence

📊 **Complete SigNoz Integration**  
Native integration with SigNoz observability platform using Model Context Protocol (MCP)

⚡ **Lightning-Fast Results**  
Complete incident investigations in 10-30 seconds with detailed analysis and recommendations

🔄 **Learning Memory System**  
Builds knowledge from past incidents to improve accuracy and speed over time

🎨 **Professional Dashboard Interface**  
Modern React-based UI with real-time investigation tracking and comprehensive reporting

🔧 **Production-Ready Architecture**  
Serverless architecture on AWS Lambda, API Gateway, DynamoDB, S3, and AWS Amplify with end-to-end observability and resilience

---

## 🚀 Quick Start

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/animbargi5-art/AI-Observability-Agent-.git TattvaAI
cd TattvaAI

# 2. Start Backend (FastAPI)
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Start Frontend (React + Vite, in a new terminal)
cd ../frontend
npm install
npm run dev
```

### Access Your TattvaAI Instance
- **🎨 Main Dashboard**: http://localhost:5173 (or http://localhost:3001)
- **🔧 Backend API**: http://localhost:8000
- **📚 API Documentation**: http://localhost:8000/docs
- **❤️ Health Check**: http://localhost:8000/health

### Live AWS Serverless Deployment
TattvaAI is deployed natively on AWS serverless infrastructure:
- **Frontend**: AWS Amplify (React 19 + Vite + PrimeReact)
- **Backend**: AWS Lambda (`TattvaAI-Backend`) via API Gateway
- **API Gateway Endpoint**: `https://eodackuif2.execute-api.us-east-1.amazonaws.com`
- **Reasoning**: Amazon Bedrock (`Claude 3.7 Sonnet`)
- **Persistence**: DynamoDB (`tattvaai_investigations`) & S3 (`tattvaai-investigation-reports`)
- **Telemetry**: AWS Observability (CloudWatch / X-Ray) & SigNoz OTLP

For full deployment instructions, see [docs/AWS_DEPLOYMENT.md](file:///d:/Projects/TattvaAI/docs/AWS_DEPLOYMENT.md).

---

## 🎭 Live Demo Experience

### Scenario: E-commerce Platform Investigation
**Problem**: Customers reporting checkout failures and payment timeouts

### TattvaAI's 30-Second Investigation:

1. **🔍 Trace Agent Analysis**
   - Discovers 4.8s average latency (400% increase from baseline 120ms)  
   - Identifies timeout patterns in payment service calls
   - Maps request flow: Gateway → Order → Payment → Database

2. **📜 Logs Agent Findings**
   - Detects 143 Redis connection timeout errors
   - Correlates error spikes with traffic patterns
   - Identifies specific error codes and frequencies

3. **📊 Metrics Agent Insights** 
   - Reports 18% error rate across payment endpoints
   - Shows 98% Redis CPU utilization during incidents
   - Tracks memory usage spikes in payment service

4. **🌐 Dependency Agent Mapping**
   - Creates service dependency graph
   - Identifies failure propagation path
   - Highlights critical path vulnerabilities

5. **🚨 Alert Agent Correlation**
   - Links 7 related alerts across monitoring systems
   - Reduces alert noise by 85%
   - Prioritizes critical vs. secondary alerts

6. **🧠 Historical Agent Pattern Matching**
   - Finds 94% similarity to incident from 3 months ago
   - Retrieves previous resolution strategy
   - Suggests proven remediation steps

### Investigation Results:
**Root Cause**: Redis connection pool exhaustion causing cascading payment failures  
**Confidence Score**: 96%  
**Time to Resolution**: 28 seconds

**AI-Generated Recommendations**:
- **Immediate**: Restart Redis cluster and clear connection pool
- **Short-term**: Increase connection pool size and timeout thresholds  
- **Long-term**: Implement circuit breaker pattern and connection monitoring

---

## 🏗️ System Architecture

### Multi-Agent Intelligence Framework
```
Production Incident
         ↓
   AI Coordinator
         ↓
   ┌─────────────────────────┐
   │    Agent Ecosystem      │
   │                         │
   │  🔍 Trace Agent         │ ← Distributed traces analysis
   │  📜 Logs Agent          │ ← Error pattern detection  
   │  📊 Metrics Agent       │ ← Performance monitoring
   │  🌐 Dependency Agent    │ ← Service topology mapping
   │  🚨 Alert Agent         │ ← Multi-source alert correlation
   │  🧠 Historical Agent    │ ← Pattern matching & learning
   └─────────────────────────┘
         ↓
   Evidence Synthesis
         ↓
   Reasoning Engine
         ↓
   Root Cause + Confidence
         ↓
   Actionable Recommendations
```

### Technology Stack
- **🐍 Backend**: Python 3.12, FastAPI, LangGraph, LangChain
- **⚛️ Frontend**: React 19, TypeScript, Vite, Modern UI Components  
- **🤖 AI/ML**: Multi-Agent System, Evidence-Based Reasoning, Memory Networks
- **📊 Observability**: SigNoz Native Integration, OpenTelemetry, MCP Protocol
- **☁️ Infrastructure**: AWS Lambda, API Gateway, AWS Amplify, DynamoDB, S3, Secrets Manager
- **💾 Data**: PostgreSQL / DynamoDB, Investigation Memory, Historical Pattern Storage

### Microservices Demo Environment
TattvaAI includes a complete e-commerce microservices environment for realistic testing:
- **Gateway Service** (Port 8011): API routing and load balancing
- **Order Service** (Port 8003): Order processing and workflow management  
- **Payment Service** (Port 8004): Payment processing and validation
- **Inventory Service** (Port 8002): Stock management and allocation
- **All services** instrumented with OpenTelemetry for full observability

---

## 🛠️ Development & Integration

### Local Development Setup
```bash
# Backend development
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend development  
cd frontend
npm install
npm run dev
```

### Environment Configuration
Create `backend/.env`:
```env
APP_NAME=TattvaAI
APP_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=true
DEMO_MODE=false
```

### API Integration Examples

**Start Investigation**:
```python
import requests

# Start AI investigation
response = requests.post("http://localhost:8000/investigation/start", 
    json={"service_name": "payment-service"})

result = response.json()
print(f"Investigation ID: {result['id']}")
print(f"Status: {result['status']}")  
print(f"Root Cause: {result['root_cause']}")
print(f"Confidence: {result['confidence']}%")
```

**Get Dashboard Statistics**:
```bash
curl http://localhost:8000/dashboard/statistics
# Returns: investigation counts, severity breakdown, confidence metrics
```

**Retrieve Investigation Details**:
```bash
curl http://localhost:8000/investigation/{investigation_id}
# Returns: complete evidence, reasoning, timeline, recommendations
```

---

## 📊 Application Structure

```
TattvaAI/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── agents/            # 🤖 6 AI investigation agents
│   │   │   ├── trace_agent.py      # Distributed trace analysis
│   │   │   ├── logs_agent.py       # Log pattern detection
│   │   │   ├── metrics_agent.py    # Performance monitoring
│   │   │   ├── dependency_agent.py # Service mapping
│   │   │   ├── alert_agent.py      # Alert correlation
│   │   │   └── historical_agent.py # Pattern matching
│   │   ├── api/               # 🔧 REST API endpoints  
│   │   │   ├── investigation.py    # Investigation management
│   │   │   ├── dashboard.py        # Dashboard statistics
│   │   │   └── signoz.py          # SigNoz integration
│   │   ├── coordinator/       # 🎭 Multi-agent orchestration
│   │   ├── decision/          # 🧠 Reasoning engines
│   │   ├── memory/            # 💾 Investigation memory
│   │   ├── signoz/            # 📊 SigNoz MCP integration
│   │   ├── graph/             # 🌐 LangGraph workflows
│   │   └── models/            # 📋 Data models & schemas
│   └── requirements.txt       
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # ⚛️ React UI components
│   │   │   ├── Dashboard/         # Main dashboard interface
│   │   │   ├── Investigation/     # Investigation detail views
│   │   │   ├── History/           # Investigation history
│   │   │   └── Reports/           # Analytics & reporting
│   │   ├── pages/             # 📄 Application pages
│   │   ├── services/          # 🔌 API integration
│   │   └── styles/            # 🎨 Component styling
│   └── package.json           
├── services/                   # 🏪 Demo microservices environment
│   ├── gateway/               # API gateway service
│   ├── order/                 # Order processing service
│   ├── payment/               # Payment service
│   └── inventory/             # Inventory management
├── infra/                      # ☁️ AWS IAM & deployment policies
├── docs/AWS_DEPLOYMENT.md     # 📖 Complete AWS serverless guide
└── DEMO_GUIDE.txt            # 🎬 Complete demo instructions
```

---

## 🤝 Contributing

We welcome contributions to TattvaAI! Here's how to get started:

1. **Fork the Repository**: Click the fork button on GitHub
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Make Your Changes**: Implement your feature or fix
4. **Add Tests**: Ensure your changes are tested
5. **Commit Changes**: `git commit -m 'Add amazing feature'`
6. **Push to Branch**: `git push origin feature/amazing-feature`  
7. **Open Pull Request**: Submit your changes for review

### Development Guidelines
- Follow Python PEP 8 style guidelines
- Add docstrings to all functions and classes
- Include unit tests for new features  
- Update documentation for API changes
- Ensure frontend and backend validation checks pass successfully

---

## 🌟 Why Choose TattvaAI?

### For SRE & DevOps Teams
- **Faster Resolution**: Reduce MTTR from hours to minutes
- **Consistent Methodology**: Standardized investigation approach across team
- **Knowledge Preservation**: AI learns and retains team expertise
- **24/7 Availability**: AI agents work around the clock

### For Engineering Organizations  
- **Improved Productivity**: Less time firefighting, more time building features
- **Better Reliability**: Proactive issue identification and prevention
- **Cost Reduction**: Lower operational overhead and faster incident response
- **Enhanced Learning**: Continuous improvement from incident patterns

### For Technical Leaders
- **Data-Driven Insights**: Comprehensive incident analytics and trends
- **Scalable Solution**: Grows with your infrastructure complexity
- **Team Empowerment**: Junior engineers can investigate like seniors
- **ROI Tracking**: Measurable improvements in incident response metrics

---

## 📈 Roadmap & Future Enhancements

### Upcoming Features
- 🔄 **Auto-Remediation**: Automated fixes for common incident patterns
- 🔍 **Predictive Analytics**: Detect potential issues before they become incidents  
- 🌐 **Multi-Platform Support**: Integration with Prometheus, Grafana, Jaeger, Datadog
- 💬 **Natural Language Interface**: Chat-based incident investigation
- 🔐 **Enterprise Security**: RBAC, SSO, audit logging
- 📱 **Mobile Application**: Investigation management on mobile devices

### Integration Roadmap
- **Slack/Teams Bots**: Incident notifications and updates
- **PagerDuty/Opsgenie**: Alert management integration  
- **Jira/ServiceNow**: Automatic ticket creation and updates
- **GitHub/GitLab**: Link incidents to code deployments
- **Kubernetes**: Native container orchestration insights

---

## 📄 License & Acknowledgments

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Built with Amazing Open Source Tools
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework for building APIs
- [React](https://reactjs.org/) - JavaScript library for building user interfaces  
- [LangChain](https://langchain.com/) - Framework for developing AI applications
- [LangGraph](https://langchain.com/langgraph) - Multi-agent workflow orchestration
- [SigNoz](https://signoz.io/) - Open-source observability platform
- [AWS](https://aws.amazon.com/) - Serverless cloud infrastructure (Lambda, API Gateway, DynamoDB, S3, Amplify)
- [OpenTelemetry](https://opentelemetry.io/) - Observability framework and toolkit

### Community & Support
- **GitHub Repository**: Star ⭐ and watch for updates
- **Issue Tracking**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas
- **Documentation**: Comprehensive guides and API documentation

---

**🚀 Transform your incident response from reactive firefighting to intelligent, proactive investigation with TattvaAI.**

*Ready to reduce your MTTR by 90% and empower your team with AI-driven insights? Get started today!*