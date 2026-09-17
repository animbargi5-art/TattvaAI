from fastapi import APIRouter, HTTPException, Query, status

from app.coordinator.incident_coordinator import IncidentCoordinator
from app.models.review import ReviewSubmission
from app.services.investigation_store import investigation_store
from app.services.review_service import review_service

router = APIRouter(
    prefix="/investigation",
    tags=["Investigation"]
)

coordinator = IncidentCoordinator()

@router.post("/start")
async def start(service_name: str = Query(default="gateway", min_length=1)):

    result = await coordinator.start_investigation(service_name=service_name)
    return investigation_store.save(result)

@router.get("/history")
def history():
    return investigation_store.list()

@router.get("/{investigation_id}")
def get_by_id(investigation_id: str):

    investigation = investigation_store.get(investigation_id)

    if investigation is None:
        return {
            "status": "NOT_FOUND"
        }

    return investigation

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
    Submit a human review decision (ACCEPT, REJECT, ESCALATE).
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

@router.delete("/{investigation_id}")
def delete_investigation(investigation_id: str):

    deleted = investigation_store.delete(investigation_id)

    if not deleted:
        return {
            "status": "NOT_FOUND"
        }

    return {
        "status": "SUCCESS",
        "message": "Investigation deleted successfully."
    }


plural_router = APIRouter(
    prefix="/investigations",
    tags=["Investigation"]
)
plural_router.add_api_route("/{investigation_id}/review", get_investigation_review, methods=["GET"])
plural_router.add_api_route("/{investigation_id}/review", submit_investigation_review, methods=["POST"])
plural_router.add_api_route("/{investigation_id}", get_by_id, methods=["GET"])
plural_router.add_api_route("", history, methods=["GET"])
