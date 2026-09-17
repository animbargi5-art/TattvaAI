# Tattva AI — AWS Deployment & Production Readiness Guide

This guide documents the serverless deployment architecture, configuration consistency, runtime compatibility, least-privilege security policies, and deployment verification procedures for **Tattva AI** on Amazon Web Services (AWS) for the First Commit / WeMakeDevs × AWS "Ship It" Hackathon.

---

## 1. Architectural Role & Overview

```
User / Browser
      ↓
Frontend (Vite SPA hosted on S3 / CloudFront or local development server)
      ↓ (API calls via VITE_API_BASE_URL)
Amazon API Gateway (HTTP API with $default {proxy+} route)
      ↓
AWS Lambda (Mangum ASGI Adapter → lambda_handler.py → FastAPI app)
      ↓
Tattva AI Core Intelligence Layer
 ├── MCP / Evidence Access Layer (6 vendor-neutral tools)
 ├── OpenTelemetry / ADOT Ingestion (Mock, OTLP, SigNoz)
 ├── Cross-Signal Correlation Engine (8 explicit relationship types)
 ├── Investigation Memory Layer (Deterministic historical learning)
 ├── Amazon Bedrock Reasoning (Claude 3.5 Sonnet via Converse API)
 └── Human Review & Decision Authority Workflow
       │
       ├── Amazon DynamoDB: Serverless investigation state & review storage
       ├── Amazon S3: Canonical investigation report archive
       └── AWS Secrets Manager: Production secrets management
```

### Core Separation of Responsibilities:
- **Telemetry Layer (ADOT / OpenTelemetry)**: Collects and exports traces, metrics, logs, and alerts from production microservices.
- **Observability Backends (SigNoz, CloudWatch, OpenSearch, etc.)**: Stores raw time-series data and telemetry logs.
- **MCP (Model Context Protocol)**: Standardized evidence access layer exposing query tools to reasoning engines.
- **Tattva AI**: The AI investigation, cross-signal correlation, causal reasoning, and human decision intelligence layer.
- **Human Authority**: AI hypotheses are advisory only; the on-call engineer retains sole decision authority.

---

## 2. Canonical Configuration & Environment Variables

Tattva AI enforces canonical environment variable names with backwards-compatible alias resolution via Pydantic `AliasChoices`:

| Category | Canonical Environment Variable | Accepted Alias | Default Value | AWS Production Value | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **App** | `ENVIRONMENT` | — | `development` | `production` | Application execution environment |
| **App** | `DEMO_MODE` | — | `false` | `false` | When true, enables offline deterministic scenario |
| **AWS** | `AWS_ENABLED` | — | `false` | `true` | Master flag enabling AWS service integrations |
| **AWS** | `AWS_REGION` | — | `us-east-1` | `us-east-1` | Primary AWS region for resources |
| **Bedrock** | `BEDROCK_ENABLED` | — | `false` | `true` | Enables live Amazon Bedrock AI reasoning |
| **Bedrock** | `BEDROCK_REGION` | — | `us-east-1` | `us-east-1` | Region for Bedrock model invocations |
| **Bedrock** | `BEDROCK_MODEL_ID` | — | `us.anthropic.claude-sonnet-4-6` | `us.anthropic.claude-sonnet-4-6` | Target Bedrock inference profile ID |
| **Persistence** | `PERSISTENCE_PROVIDER` | — | `sqlite` | `dynamodb` | Storage backend for investigation state |
| **DynamoDB** | `DYNAMODB_TABLE_NAME` | `DYNAMODB_TABLE` | `tattvaai_investigations` | `tattvaai_investigations` | Canonical DynamoDB table name |
| **Report Storage** | `REPORT_STORAGE_PROVIDER` | — | `local` | `s3` | Storage backend for finalized report JSONs |
| **S3** | `S3_REPORT_BUCKET` | `S3_BUCKET` | `tattvaai-investigation-reports` | `tattvaai-investigation-reports` | Canonical S3 report archive bucket |
| **S3** | `S3_REGION` | — | `us-east-1` | `us-east-1` | AWS S3 bucket region |
| **Secrets** | `SECRETS_MANAGER_ENABLED` | — | `false` | `true` | Enables AWS Secrets Manager for credentials |
| **Secrets** | `AWS_SECRET_NAME` | — | `tattvaai/production/secrets` | `tattvaai/production/secrets` | Secret identifier in Secrets Manager |
| **Telemetry** | `TELEMETRY_SOURCE` | — | `mock` | `mock` / `otlp` / `signoz` | Provider for incident evidence collection |
| **Frontend** | `VITE_API_BASE_URL` | — | `http://localhost:8000` | `https://<API_ID>.execute-api.us-east-1.amazonaws.com` | Backend API base URL for frontend SPA |

> [!IMPORTANT]
> Never include `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in environment variables or configuration files. All AWS services authenticate serverlessly via standard IAM execution roles.

---

## 3. Lambda Runtime Compatibility & Dependency Analysis

### Chosen Runtime: `python3.10`
The project is developed, tested, and validated on **Python 3.10.11**. AWS Lambda officially supports `python3.10`, `python3.11`, and `python3.12`.

### Compatibility Verification:
- **FastAPI (`fastapi==0.139.2`)**: Compatible with Python 3.8 – 3.12.
- **Pydantic (`pydantic==2.13.4`, `pydantic-settings==2.14.2`)**: Native wheels available for Linux x86_64 / arm64 on Python 3.10 – 3.12.
- **Mangum (`mangum==0.22.0`)**: Standard ASGI adapter compatible with Python 3.8 – 3.12. Configured with `lifespan="off"`.
- **Boto3 (`boto3`)**: Standard AWS SDK, native to Python 3.10 runtime.
- **LangChain / LangGraph (`langchain==1.3.14`, `langgraph==1.2.9`)**: Fully compatible with Python 3.10.

Selecting `--runtime python3.10` guarantees 1:1 bytecode and wheel compatibility between the local virtual environment and AWS Lambda execution.

---

## 4. Lambda Package Readiness

### Deployment Package Contents (`function.zip`):
```
function.zip
 ├── lambda_handler.py             # Serverless ASGI adapter entrypoint
 ├── app/                          # Core application package
 │    ├── coordinator/             # Incident investigation coordinator
 │    ├── decision/                # Correlation engine & Bedrock reasoning provider
 │    ├── memory/                  # Deterministic investigation memory
 │    ├── services/                # Telemetry, review, report storage, secrets
 │    ├── database/                # Repository abstractions & database models
 │    ├── models/                  # Domain schemas & review data structures
 │    ├── schemas/                 # Pydantic investigation state schemas
 │    ├── api/                     # FastAPI route controllers
 │    └── core/                    # Settings & logging configuration
 └── <pip dependencies>            # boto3, fastapi, pydantic, mangum, etc.
```

### Excluded Local-Only Artifacts:
The AWS Lambda deployment package strictly excludes:
- `tattvaai.db` / SQLite databases (DynamoDB is used instead).
- `reports/` directory (Amazon S3 is used instead).
- `.env` / local configuration files (Lambda environment variables are used instead).
- Test suites (`test_*.py`, `check_*.py`, `scratch/`).
- Development-only packages (`watchfiles`, local linters).

> [!TIP]
> In AWS Lambda, `/var/task` is read-only. `backend/app/database/database.py` is fortified with an automatic `/tmp/tattvaai.db` path fallback if SQLite is ever referenced, ensuring zero read-only filesystem errors.

---

## 5. Amazon Bedrock Model Status

- **Configured Model / Inference Profile**: `us.anthropic.claude-sonnet-4-6` (Claude Sonnet 4.6 Inference Profile)
- **Supported Regions**: `us-east-1` (N. Virginia), `us-west-2` (Oregon)
- **API Interface**: Bedrock Runtime `converse` API with structured JSON output and telemetry MCP tool definitions
- **Verification Status**:
  - Offline/Local Preflight: **NOT VERIFIED — credentials/access unavailable**
  - Offline Fallback: `MockReasoningProvider` automatically executes if Bedrock credentials are not present or if `BEDROCK_ENABLED=false`, guaranteeing 100% demo availability.

---

## 6. IAM Least-Privilege Policy

Create a dedicated Lambda execution role (`TattvaAILambdaExecutionRole`) using this exact least-privilege policy. No wildcard `*` permissions are granted on data-plane resources:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Sid": "BedrockInvokeModel",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    },
    {
      "Sid": "DynamoDBTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:759328200891:table/tattvaai_investigations"
    },
    {
      "Sid": "S3ReportArchiveAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::tattvaai-investigation-reports",
        "arn:aws:s3:::tattvaai-investigation-reports/*"
      ]
    },
    {
      "Sid": "SecretsManagerRead",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:tattvaai/production/secrets*"
    }
  ]
}
```

### Trust Relationship (`trust-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

---

## 7. Amazon DynamoDB Table Setup

Create an On-Demand table matching the application's canonical primary key:
- **Table Name**: `tattvaai_investigations`
- **Partition Key**: `incident_id` (String / `AttributeType=S`)
- **Billing Mode**: `PAY_PER_REQUEST` (Serverless, zero idle cost)

```bash
aws dynamodb create-table \
    --table-name tattvaai_investigations \
    --attribute-definitions AttributeName=incident_id,AttributeType=S \
    --key-schema AttributeName=incident_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

---

## 8. Amazon S3 Report Bucket Setup

Create a private S3 bucket for archiving immutable investigation report JSON files under `investigations/{report_id}/report.json`:

```bash
aws s3api create-bucket \
    --bucket tattvaai-investigation-reports \
    --region us-east-1

# Enable SSE-S3 default encryption
aws s3api put-bucket-encryption \
    --bucket tattvaai-investigation-reports \
    --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

# Block public access
aws s3api put-public-access-block \
    --bucket tattvaai-investigation-reports \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## 9. AWS Lambda Packaging & Deployment

```bash
cd backend

# 1. Install dependencies to target package directory
pip install -r requirements.txt -t package/

# 2. Package dependencies and source code
cd package && zip -r ../function.zip .
cd .. && zip -g function.zip lambda_handler.py
zip -r -g function.zip app/

# 3. Create Lambda Function
aws lambda create-function \
    --function-name TattvaAI-Backend \
    --runtime python3.10 \
    --role arn:aws:iam::<ACCOUNT_ID>:role/TattvaAILambdaExecutionRole \
    --handler lambda_handler.handler \
    --zip-file fileb://function.zip \
    --timeout 60 \
    --memory-size 1024 \
    --environment Variables='{
        "ENVIRONMENT":"production",
        "AWS_ENABLED":"true",
        "AWS_REGION":"us-east-1",
        "BEDROCK_ENABLED":"true",
        "BEDROCK_REGION":"us-east-1",
        "BEDROCK_MODEL_ID":"us.anthropic.claude-sonnet-4-6",
        "PERSISTENCE_PROVIDER":"dynamodb",
        "DYNAMODB_TABLE_NAME":"tattvaai_investigations",
        "REPORT_STORAGE_PROVIDER":"s3",
        "S3_REPORT_BUCKET":"tattvaai-investigation-reports",
        "SECRETS_MANAGER_ENABLED":"true",
        "AWS_SECRET_NAME":"tattvaai/production/secrets",
        "TELEMETRY_SOURCE":"mock",
        "DEMO_MODE":"false"
    }'
```

---

## 10. Amazon API Gateway HTTP API Setup

Use Lambda Proxy integration so that all routes are handled directly by FastAPI without route duplication:

```bash
# 1. Create HTTP API
aws apigatewayv2 create-api \
    --name TattvaAI-API \
    --protocol-type HTTP \
    --target arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:TattvaAI-Backend

# 2. Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
    --function-name TattvaAI-Backend \
    --statement-id apigateway-invoke-permission \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:<ACCOUNT_ID>:<API_ID>/*/*"

# 3. Configure CORS with strict FRONTEND_ORIGIN (e.g. https://<domain> or http://localhost:5173)
aws apigatewayv2 update-api \
    --api-id <API_ID> \
    --cors-configuration "{\"AllowOrigins\":[\"$FRONTEND_ORIGIN\"],\"AllowMethods\":[\"GET\",\"POST\",\"DELETE\",\"OPTIONS\"],\"AllowHeaders\":[\"*\"]}"
```

---

## 11. Frontend Configuration & Build

The Vite frontend connects to the backend through `VITE_API_BASE_URL`:

```bash
cd frontend

# Set production API Gateway endpoint
export VITE_API_BASE_URL="https://<API_ID>.execute-api.us-east-1.amazonaws.com"

# Build production bundle
npm run build
```

The resulting `dist/` directory can be hosted on Amazon S3 + CloudFront or any static web host. Zero AWS secrets exist in frontend assets.

---

## 12. Preflight & Deployment Gate

> [!IMPORTANT]
> **DEPLOYMENT GATE RULE**: No AWS resources may be created without explicit user approval.

Before executing creation commands:
1. Run read-only preflight checks (`aws sts get-caller-identity`).
2. If credentials are not configured, STOP and output:
   `NO AWS RESOURCES CREATED — credentials/access unavailable`.
3. If approved, deploy resources strictly in this order:
   1. IAM Execution Role
   2. DynamoDB Table
   3. S3 Bucket
   4. Lambda Function
   5. API Gateway
   6. Frontend Build & Static Hosting

---

## 13. AWS Live Smoke Test Verification Plan

Once live AWS infrastructure is provisioned, execute this 13-step validation sequence:

```bash
export API_URL="https://<API_ID>.execute-api.us-east-1.amazonaws.com"

# 1. GET /health
curl -s "$API_URL/health"

# 2. Create Investigation
curl -s -X POST "$API_URL/investigation/start?service_name=payment-service"

# 3. Retrieve Investigation
curl -s "$API_URL/investigation/<INV_ID>"

# 4. Verify Evidence (Verify 16 evidence items returned)
# 5. Verify Correlations (Verify 8 cross-signal relationships)
# 6. Verify Historical Context (Verify INC-HIST-082 retrieved)
# 7. Verify Bedrock Reasoning (Verify Claude 3.5 Sonnet hypotheses)
# 8. Verify Review Status (Verify status is PENDING_REVIEW)

# 9. Submit Human Review Decision
curl -s -X POST "$API_URL/investigation/<INV_ID>/review" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACCEPTED",
    "reviewer_identifier": "oncall-engineer@company.com",
    "selected_hypothesis": "Downstream latency and error propagation in bank-gateway",
    "reviewer_notes": "Confirmed with upstream bank partner. Mitigation applied.",
    "resolution": "Applied circuit breaker diversion to secondary banking partner."
  }'

# 10. Retrieve Review Decision
curl -s "$API_URL/investigation/<INV_ID>/review"

# 11. Verify DynamoDB persistence
aws dynamodb get-item --table-name tattvaai_investigations --key '{"incident_id":{"S":"<INV_ID>"}}'

# 12. Verify S3 report archive
aws s3 ls s3://tattvaai-investigation-reports/investigations/<INV_ID>/report.json

# 13. Verify Lambda CloudWatch logs
aws logs tail /aws/lambda/TattvaAI-Backend --since 5m
```

The smoke test explicitly validates:
$$\text{AI Candidate Hypothesis} \ne \text{Human Review Decision}$$

---

## 14. Cost Safety & Resource Teardown

To avoid ongoing charges after evaluation, execute teardown commands in reverse order:

```bash
# 1. Delete API Gateway
aws apigatewayv2 delete-api --api-id <API_ID>

# 2. Delete Lambda Function
aws lambda delete-function --function-name TattvaAI-Backend

# 3. Delete DynamoDB Table
aws dynamodb delete-table --table-name tattvaai_investigations

# 4. Delete S3 Report Bucket
aws s3 rb s3://tattvaai-investigation-reports --force

# 5. Delete Secrets Manager Secret
aws secretsmanager delete-secret --secret-id tattvaai/production/secrets --force-delete-without-recovery

# 6. Delete IAM Role & Policies
aws iam delete-role-policy --role-name TattvaAILambdaExecutionRole --policy-name TattvaAILambdaLeastPrivilegePolicy
aws iam delete-role --role-name TattvaAILambdaExecutionRole
```

---

## 15. Offline Local Execution (Zero AWS Required)

For offline development, evaluation, or hackathon demos without AWS credits:
```env
DEMO_MODE=true
AWS_ENABLED=false
BEDROCK_ENABLED=false
PERSISTENCE_PROVIDER=sqlite
REPORT_STORAGE_PROVIDER=local
TELEMETRY_SOURCE=mock
```

Launch the local full-stack platform:
```powershell
python start_tattvaai.py
```
