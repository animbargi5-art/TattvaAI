# TattvaAI - AWS Telemetry Integration Guide

## Overview

TattvaAI's Incident Lab generates **REAL AWS telemetry** from controlled incident scenarios. This document explains the complete telemetry flow from service execution to investigation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Incident Lab Services                     │
│  (Gateway, Order, Payment, Inventory - OpenTelemetry)       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ OpenTelemetry Protocol (OTLP)
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
┌──────────────┐   ┌──────────────────┐
│  AWS X-Ray   │   │ CloudWatch Logs  │
│   (Traces)   │   │    (Logs)        │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       │  boto3 SDK APIs    │
       │                    │
       └────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │   TattvaAI Backend    │
    │  AWS Telemetry Source │
    └───────────────────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Investigation Pipeline│
    │   8-Stage Agents      │
    └───────────────────────┘
```

---

## Telemetry Flow

### 1. **Incident Triggered**
User triggers incident via TattvaAI backend:
```
POST /incident-lab/trigger/PAYMENT_TIMEOUT
```

### 2. **Services Execute**
TattvaAI backend calls Gateway service with incident parameter:
```
GET http://gateway:8001/api/orders?incident_mode=PAYMENT_TIMEOUT
```

Gateway → Order → Payment (with TIMEOUT scenario)

### 3. **Real Telemetry Generated**

#### **OpenTelemetry Spans** (via instrumentation)
- Service entry/exit spans
- HTTP request/response spans  
- Latency timing
- Error/fault annotations
- Service dependency relationships

#### **CloudWatch Logs** (via Python logging)
```python
logger.info("Payment request started for order_id=1")
logger.warning("Simulating payment gateway timeout")
logger.error("Payment gateway timeout for order_id=1")
```

These logs go to:
- **stdout** (captured by AWS Lambda / ECS)
- **CloudWatch Log Groups**: `/aws/lambda/payment-service`

#### **AWS X-Ray Traces**
- Distributed trace across Gateway → Order → Payment → Inventory
- Subsegments for each service call
- Fault annotations on errors
- Duration/latency measurements

### 4. **TattvaAI Retrieves Telemetry**

When investigation starts, TattvaAI backend uses `AWSObservabilitySource`:

```python
# backend/app/telemetry/sources/aws_source.py

# Retrieve X-Ray traces
traces = await aws_source.get_traces(service_name="payment-service")

# Retrieve CloudWatch logs  
logs = await aws_source.get_logs(service_name="payment-service")

# Retrieve CloudWatch metrics
metrics = await aws_source.get_metrics(service_name="payment-service")

# Retrieve X-Ray service graph
dependencies = await aws_source.get_dependencies(service_name="payment-service")
```

### 5. **Evidence Normalization**

Raw AWS telemetry is normalized into TattvaAI domain models:

```python
Trace(
    trace_id="1-67f3a2c1-2e5b8f9a4c1d3e5f",  # Real X-Ray trace ID
    service_name="payment-service",
    duration_ms=12045.67,  # Real measured duration
    status_code=504,  # Real HTTP status
    attributes={
        "provider": "aws",
        "source": "aws_xray",
        "mode": "LIVE",  # NOT mock/demo
        "region": "us-east-1"
    }
)

Log(
    log_id="cw-event-123456",  # Real CloudWatch event ID
    service_name="payment-service",
    severity="ERROR",
    message="Payment gateway timeout for order_id=1",  # Real log message
    attributes={
        "provider": "aws",
        "source": "aws_cloudwatch_logs",
        "mode": "LIVE",
        "log_group": "/aws/lambda/payment-service"
    }
)
```

### 6. **Investigation Pipeline**

Evidence flows through 8-stage pipeline:
1. **Trace Agent** - Analyzes X-Ray spans
2. **Logs Agent** - Scans CloudWatch logs
3. **Metrics Agent** - Evaluates CloudWatch metrics
4. **Dependency Agent** - Maps X-Ray service graph
5. **Alert Agent** - Checks CloudWatch alarms
6. **Historical Agent** - Matches past incidents
7. **Correlation Agent** - Links evidence
8. **Reasoning Engine** - Generates hypothesis

### 7. **Evidence Provenance**

Every evidence item maintains full provenance:

```python
{
    "provider": "AWS X-Ray / CloudWatch",
    "signal_type": "Distributed Trace",
    "target_service": "payment-service",
    "source_identifier": "1-67f3a2c1-2e5b8f9a4c1d3e5f",
    "region": "us-east-1",
    "analysis_window": "2024-01-15T10:30:00Z - 2024-01-15T11:00:00Z",
    "mode": "LIVE",  # Never labeled as DEMO/MOCK
    "console_link": "https://console.aws.amazon.com/xray/home?region=us-east-1#/traces/1-67f3a2c1-2e5b8f9a4c1d3e5f"
}
```

---

## Incident Scenarios & Expected Telemetry

### Scenario 1: HEALTHY
**Trigger**: Normal request
**Expected AWS Telemetry**:
- ✓ X-Ray trace: 1-2s duration, all segments healthy
- ✓ CloudWatch logs: INFO level, successful processing
- ✓ CloudWatch metrics: Normal latency, zero errors
- ✓ X-Ray service map: All services healthy

### Scenario 2: PAYMENT_TIMEOUT  
**Trigger**: Payment gateway delay
**Expected AWS Telemetry**:
- ✓ X-Ray trace: 12+ second duration
- ✓ X-Ray fault annotation on payment segment
- ✓ CloudWatch logs: "Payment gateway timeout" ERROR
- ✓ CloudWatch metrics: P99 latency spike
- ✓ HTTP 504 Gateway Timeout response

### Scenario 3: PAYMENT_FAILURE
**Trigger**: Payment service crash
**Expected AWS Telemetry**:
- ✓ X-Ray trace: error annotation
- ✓ X-Ray fault segment for payment service
- ✓ CloudWatch logs: "Payment service internal error" ERROR
- ✓ CloudWatch metrics: Error count spike
- ✓ HTTP 500 Internal Server Error

### Scenario 4: HIGH_LATENCY
**Trigger**: Slow order processing
**Expected AWS Telemetry**:
- ✓ X-Ray trace: 5-7s duration (order segment)
- ✓ CloudWatch logs: "High latency delay completed" WARNING
- ✓ CloudWatch metrics: Elevated duration
- ✓ All segments complete, no faults

### Scenario 5: DEPENDENCY_FAILURE
**Trigger**: Inventory service down
**Expected AWS Telemetry**:
- ✓ X-Ray trace: fault on inventory segment
- ✓ X-Ray service map: inventory node unhealthy
- ✓ CloudWatch logs: "Inventory service error" ERROR
- ✓ HTTP 503 Service Unavailable from inventory
- ✓ Partial degraded response (payment succeeds, inventory fails)

---

## AWS Services Used

### AWS X-Ray
**Purpose**: Distributed tracing
**APIs**:
- `xray:GetTraceSummaries` - Retrieve trace IDs
- `xray:BatchGetTraces` - Get full trace details
- `xray:GetServiceGraph` - Service dependency map

**IAM Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetTraceSummaries",
        "xray:BatchGetTraces",
        "xray:GetServiceGraph"
      ],
      "Resource": "*"
    }
  ]
}
```

### AWS CloudWatch Logs
**Purpose**: Application logs
**APIs**:
- `logs:DescribeLogStreams`
- `logs:FilterLogEvents`
- `logs:PutLogEvents`

**Log Groups**:
- `/aws/lambda/gateway-service`
- `/aws/lambda/order-service`
- `/aws/lambda/payment-service`
- `/aws/lambda/inventory-service`

**IAM Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
    }
  ]
}
```

### AWS CloudWatch Metrics
**Purpose**: Performance metrics
**APIs**:
- `cloudwatch:PutMetricData`
- `cloudwatch:GetMetricStatistics`
- `cloudwatch:ListMetrics`

**Metrics**:
- `AWS/Lambda/Duration`
- `AWS/Lambda/Invocations`
- `AWS/Lambda/Errors`
- `AWS/Lambda/Throttles`

---

## Configuration

### Environment Variables

#### Incident Lab Services
```bash
# AWS region
AWS_DEFAULT_REGION=us-east-1

# OpenTelemetry endpoint (ADOT collector or X-Ray daemon)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces

# Service identification
OTEL_SERVICE_NAME=payment-service
ENVIRONMENT=incident-lab
```

#### TattvaAI Backend
```bash
# Telemetry source selection
TELEMETRY_SOURCE=aws  # Use AWS CloudWatch/X-Ray
DEMO_MODE=false       # Disable mock data

# AWS configuration
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from IAM role or credentials>
AWS_SECRET_ACCESS_KEY=<from IAM role or credentials>

# Lambda function name (for log group lookup)
LAMBDA_FUNCTION_NAME=TattvaAI-Backend
```

---

## Deployment Options

### Option 1: AWS Lambda + ADOT Layer
**Recommended for production**

1. Deploy services as Lambda functions
2. Add AWS Distro for OpenTelemetry (ADOT) Lambda Layer
3. Enable X-Ray Active Tracing
4. Configure CloudWatch Logs retention

```yaml
# serverless.yml or SAM template
Functions:
  PaymentService:
    Handler: main.handler
    Layers:
      - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-python-amd64-ver-1-22-0:1
    Tracing: Active  # Enable X-Ray
    Environment:
      OTEL_SERVICE_NAME: payment-service
      ENVIRONMENT: production
```

### Option 2: ECS/Fargate + ADOT Sidecar
**For containerized deployments**

1. Deploy services as ECS tasks
2. Add ADOT collector as sidecar container
3. Configure X-Ray daemon endpoint
4. Stream logs to CloudWatch

```yaml
# ECS task definition
Containers:
  - Name: payment-service
    Image: payment-service:latest
    Environment:
      - Name: OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
        Value: http://localhost:4318/v1/traces
  
  - Name: aws-otel-collector
    Image: public.ecr.aws/aws-observability/aws-otel-collector:latest
    Command: ["--config=/etc/otel-config.yaml"]
```

### Option 3: Local Development + Console Export
**For testing without AWS**

Services automatically fall back to console exporters if AWS unavailable:

```bash
# Run services locally
cd services/gateway
python -m uvicorn main:app --port 8001

# Telemetry printed to console for verification
# X-Ray traces shown as JSON
# Logs appear in stdout
```

---

## Verification Checklist

### ✓ Telemetry Generated
- [ ] Services start without errors
- [ ] OpenTelemetry spans created for requests
- [ ] Logs appear in stdout/CloudWatch
- [ ] X-Ray traces visible in AWS Console

### ✓ TattvaAI Retrieval
- [ ] `AWSObservabilitySource.health_check()` returns True
- [ ] `get_traces()` returns non-empty list
- [ ] `get_logs()` returns CloudWatch log events
- [ ] `get_dependencies()` returns X-Ray service graph

### ✓ Evidence Quality
- [ ] Trace IDs are real X-Ray format (1-xxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx)
- [ ] Log messages match actual service output
- [ ] Timestamps are accurate (not fabricated)
- [ ] Provider labeled as "aws" not "mock" or "demo"
- [ ] Mode labeled as "LIVE"

### ✓ Investigation Flow
- [ ] Investigation starts successfully
- [ ] Evidence appears in UI
- [ ] Provenance inspector shows AWS source
- [ ] Console links work (if available)
- [ ] Report exports include real telemetry

---

## Troubleshooting

### No traces appear in X-Ray
**Cause**: X-Ray daemon not running or misconfigured
**Fix**:
```bash
# Check X-Ray daemon
aws xray get-trace-summaries --start-time $(date -u -d '5 minutes ago' +%s) --end-time $(date +%s)

# Verify ADOT collector config
cat /etc/otel-config.yaml

# Check IAM permissions
aws sts get-caller-identity
```

### CloudWatch logs missing
**Cause**: Log group doesn't exist or IAM permissions insufficient
**Fix**:
```bash
# Create log group
aws logs create-log-group --log-group-name /aws/lambda/payment-service

# Verify permissions
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/
```

### TattvaAI shows "mock" data
**Cause**: `TELEMETRY_SOURCE` not set to "aws"
**Fix**:
```bash
# backend/.env
TELEMETRY_SOURCE=aws
DEMO_MODE=false
```

---

## Security Best Practices

### ✓ IAM Least Privilege
- Grant only required X-Ray and CloudWatch permissions
- Use IAM roles, not access keys when possible
- Restrict log group access by resource ARN

### ✓ Credentials Management
- **Never** commit AWS credentials to git
- Use AWS Secrets Manager for sensitive config
- Rotate IAM access keys regularly
- Use temporary credentials (STS) for dev/testing

### ✓ Log Sanitization
- Do NOT log PII, passwords, or tokens
- Redact sensitive data before logging
- Configure log retention policies (7-30 days)

---

## Cost Optimization

### X-Ray Pricing
- **Traces recorded**: $5.00 per 1 million traces
- **Traces retrieved**: $0.50 per 1 million
- **First 100K traces/month**: Free tier

**Incident Lab Impact**: ~100-500 traces/day = **~$0.00-$0.01/day**

### CloudWatch Logs Pricing
- **Ingestion**: $0.50 per GB
- **Storage**: $0.03 per GB/month
- **First 5GB/month**: Free tier

**Incident Lab Impact**: ~10-50 MB/day = **~$0.00/day**

### Total Cost: **< $1.00/month** for incident lab testing

---

## References

- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/latest/devguide/)
- [AWS Distro for OpenTelemetry](https://aws-otel.github.io/)
- [CloudWatch Logs Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
- [OpenTelemetry Python SDK](https://opentelemetry.io/docs/instrumentation/python/)
