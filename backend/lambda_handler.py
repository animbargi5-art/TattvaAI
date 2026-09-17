"""
===============================================================================
Tattva AI - AWS Lambda Entrypoint
===============================================================================

Purpose:
--------
Serverless ASGI adapter using Mangum for AWS Lambda + Amazon API Gateway.
Allows the FastAPI application to run serverlessly without code duplication.

Architecture:
-------------
Amazon API Gateway ({proxy+})
        ↓
AWS Lambda (lambda_handler.handler)
        ↓
Mangum ASGI Adapter
        ↓
FastAPI Application (app.main.app)

Local Execution:
----------------
Local and containerized deployments continue to run via Uvicorn as normal:
    uvicorn app.main:app --host 0.0.0.0 --port 8000

===============================================================================
"""

from __future__ import annotations

from mangum import Mangum

from app.main import app

# Create the serverless ASGI adapter handler
# lifespan="off" is recommended for serverless Lambda execution
handler = Mangum(app, lifespan="off")
