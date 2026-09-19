from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.coordinator.incident_coordinator import IncidentCoordinator
from app.models.review import ReviewSubmission
from app.services.investigation_store import investigation_store
from app.services.report_export_service import report_export_service
from app.services.review_service import review_service

router = APIRouter(
    prefix="/investigation",
    tags=["Investigation"]
)

coordinator = IncidentCoordinator()


@router.post("/start")
async def start(
    request: Request,
    service_name: str = Query(default=None),
    telemetry_source: str = Query(default=None),
    environment: str = Query(default=None),
    time_window: str = Query(default=None),
):
    """Start an AI investigation for a service with configurable telemetry source."""
    body = {}
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body = await request.json()
    except Exception:
        body = {}

    resolved_service = str(body.get("service_name") or service_name or "gateway").strip()
    resolved_source = str(body.get("telemetry_source") or telemetry_source or "").strip() or None
    resolved_env = str(body.get("environment") or environment or "production").strip()
    resolved_window = str(body.get("time_window") or time_window or "15m").strip()

    result = await coordinator.start_investigation(
        service_name=resolved_service,
        telemetry_source=resolved_source,
        environment=resolved_env,
        time_window=resolved_window,
    )
    return investigation_store.save(result)


@router.get("/history")
def history():
    """List recent investigations from durable / in-memory store."""
    return investigation_store.list()


@router.get("/filters")
def get_filters():
    """Return available filter options for investigation history."""
    items = investigation_store.list()
    services = sorted(list({
        item.get("service_name") or item.get("report", {}).get("service_name")
        for item in items
        if item.get("service_name") or item.get("report", {}).get("service_name")
    }))
    if not services:
        services = ["gateway", "frontend", "payment-service", "order-service", "inventory-service", "auth-service"]

    statuses = sorted(list({
        item.get("status") or item.get("report", {}).get("status")
        for item in items
        if item.get("status") or item.get("report", {}).get("status")
    }))
    if not statuses:
        statuses = ["COMPLETED", "IN_PROGRESS", "FAILED"]

    severities = sorted(list({
        item.get("severity") or item.get("report", {}).get("severity")
        for item in items
        if item.get("severity") or item.get("report", {}).get("severity")
    }))
    if not severities:
        severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

    return {
        "services": services,
        "statuses": statuses,
        "severities": severities,
    }


@router.get("/export")
def export_history_search(
    format: str = Query(default="csv", description="Export format: csv or json"),
    service: str = Query(default=None),
    status_filter: str = Query(default=None, alias="status"),
    severity: str = Query(default=None),
    search: str = Query(default=None),
):
    """Export filtered investigation history as CSV or JSON."""
    items = investigation_store.list()

    if service:
        items = [i for i in items if (i.get("service_name") or i.get("report", {}).get("service_name")) == service]
    if status_filter:
        items = [i for i in items if (i.get("status") or i.get("report", {}).get("status")) == status_filter]
    if severity:
        items = [i for i in items if (i.get("severity") or i.get("report", {}).get("severity")) == severity]
    if search:
        s = search.lower()
        items = [
            i for i in items
            if s in (i.get("title") or "").lower()
            or s in (i.get("incident_id") or "").lower()
            or s in (i.get("id") or "").lower()
        ]

    fmt = (format or "csv").lower().strip()
    if fmt == "json":
        import json
        return Response(
            content=json.dumps(items, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="investigations-export.json"'}
        )
    else:
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Incident ID", "Title", "Severity", "Status", "Confidence", "Created At"])
        for item in items:
            writer.writerow([
                item.get("id", ""),
                item.get("incident_id", ""),
                item.get("title", ""),
                item.get("severity", ""),
                item.get("status", ""),
                item.get("confidence", ""),
                item.get("created_at", ""),
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="investigations-export.{fmt}"'}
        )


@router.post("/bulk-export")
def bulk_export(payload: dict):
    """Export multiple investigations into a single zip archive."""
    import io
    import zipfile

    inv_ids = payload.get("investigation_ids", [])
    fmt = (payload.get("format") or "pdf").lower().strip()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for inv_id in inv_ids:
            inv = investigation_store.get(inv_id)
            if not inv:
                continue
            if fmt == "pdf":
                file_bytes = report_export_service.generate_pdf(inv)
                zip_file.writestr(f"investigation-{inv_id}.pdf", file_bytes)
            elif fmt in ("md", "markdown"):
                text = report_export_service.generate_markdown(inv)
                zip_file.writestr(f"investigation-{inv_id}.md", text)
            else:
                json_bytes = report_export_service.generate_json(inv)
                zip_file.writestr(f"investigation-{inv_id}.json", json_bytes)

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="investigations-export.zip"'}
    )


@router.delete("/bulk")
def bulk_delete(payload: dict):
    """Delete multiple investigations by ID."""
    inv_ids = payload.get("investigation_ids", [])
    deleted_count = 0
    for inv_id in inv_ids:
        if investigation_store.delete(inv_id):
            deleted_count += 1
    return {"status": "SUCCESS", "deleted_count": deleted_count}


@router.get("/{investigation_id}/summary")
def get_investigation_summary(investigation_id: str):
    """Retrieve lightweight summary of an investigation."""
    inv = investigation_store.get(investigation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{investigation_id}' not found."
        )
    return {
        "id": inv.get("id"),
        "investigation_id": inv.get("investigation_id") or inv.get("id"),
        "incident_id": inv.get("incident_id"),
        "title": inv.get("title"),
        "status": inv.get("status"),
        "severity": inv.get("severity"),
        "confidence": inv.get("confidence"),
        "created_at": inv.get("created_at"),
        "summary": inv.get("report", {}).get("executive_summary") or inv.get("report", {}).get("summary", ""),
    }


@router.post("/{investigation_id}/refresh")
async def refresh_investigation(investigation_id: str):
    """Re-run AI investigation analysis for an incident."""
    existing = investigation_store.get(investigation_id)
    service_name = "gateway"
    if existing:
        service_name = existing.get("service_name") or existing.get("report", {}).get("service_name") or "gateway"

    result = await coordinator.start_investigation(
        service_name=service_name,
        incident_id=investigation_id,
    )
    return investigation_store.save(result)


@router.get("/{investigation_id}/export")
def export_investigation(
    investigation_id: str,
    format: str = Query(default="pdf", description="Export format: pdf, json, or markdown/md")
):
    """
    Export incident investigation report in PDF, JSON, or Markdown format.
    Streams appropriate binary/text content with Content-Disposition headers.
    """
    investigation = investigation_store.get(investigation_id)
    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{investigation_id}' not found."
        )

    fmt = (format or "pdf").lower().strip()

    if fmt == "pdf":
        pdf_bytes = report_export_service.generate_pdf(investigation)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="investigation-{investigation_id}.pdf"',
                "Content-Type": "application/pdf",
            }
        )

    if fmt == "json":
        json_bytes = report_export_service.generate_json(investigation)
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="investigation-{investigation_id}.json"',
                "Content-Type": "application/json",
            }
        )

    if fmt in ("md", "markdown"):
        md_text = report_export_service.generate_markdown(investigation)
        return Response(
            content=md_text,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'attachment; filename="investigation-{investigation_id}.md"',
                "Content-Type": "text/markdown; charset=utf-8",
            }
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported format '{format}'. Supported formats: pdf, json, markdown"
    )


@router.get("/{investigation_id}/export/{format}")
def export_investigation_path(
    investigation_id: str,
    format: str,
):
    """Path-based alias for export endpoint (e.g. /export/pdf, /export/json, /export/markdown)."""
    return export_investigation(investigation_id=investigation_id, format=format)


@router.get("/{investigation_id}/review")
def get_investigation_review(investigation_id: str):
    """
    Retrieve current human review state for an investigation.
    Defaults to PENDING_REVIEW if no review has been completed yet.
    """
    review = review_service.get_review(investigation_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{investigation_id}' not found."
        )
    return review.to_dict()


@router.post("/{investigation_id}/review")
def submit_investigation_review(investigation_id: str, submission: ReviewSubmission):
    """
    Submit a human review decision (ACCEPTED, REJECTED, ESCALATE).
    Validates selected hypothesis against AI candidate hypotheses.
    Persists decision and audit trail to durable SQLite storage.
    """
    try:
        decision = review_service.submit_review(investigation_id, submission)
        inv = investigation_store.get(investigation_id)
        return {
            "status": "SUCCESS",
            "review": decision.to_dict(),
            "investigation": inv
        }
    except LookupError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit review: {str(e)}"
        )


@router.get("/{investigation_id}")
def get_by_id(investigation_id: str):
    """Retrieve investigation by ID."""
    investigation = investigation_store.get(investigation_id)

    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{investigation_id}' not found."
        )

    return investigation


@router.delete("/{investigation_id}")
def delete_investigation(investigation_id: str):
    """Delete an investigation record."""
    deleted = investigation_store.delete(investigation_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{investigation_id}' not found."
        )

    return {
        "status": "SUCCESS",
        "message": "Investigation deleted successfully."
    }


plural_router = APIRouter(
    prefix="/investigations",
    tags=["Investigation"]
)
plural_router.add_api_route("/start", start, methods=["POST"])
plural_router.add_api_route("", history, methods=["GET"])
plural_router.add_api_route("/history", history, methods=["GET"])
plural_router.add_api_route("/filters", get_filters, methods=["GET"])
plural_router.add_api_route("/export", export_history_search, methods=["GET"])
plural_router.add_api_route("/bulk-export", bulk_export, methods=["POST"])
plural_router.add_api_route("/bulk", bulk_delete, methods=["DELETE"])
plural_router.add_api_route("/{investigation_id}/summary", get_investigation_summary, methods=["GET"])
plural_router.add_api_route("/{investigation_id}/export", export_investigation, methods=["GET"])
plural_router.add_api_route("/{investigation_id}/refresh", refresh_investigation, methods=["POST"])
plural_router.add_api_route("/{investigation_id}/review", get_investigation_review, methods=["GET"])
plural_router.add_api_route("/{investigation_id}/review", submit_investigation_review, methods=["POST"])
plural_router.add_api_route("/{investigation_id}", get_by_id, methods=["GET"])
plural_router.add_api_route("/{investigation_id}", delete_investigation, methods=["DELETE"])
