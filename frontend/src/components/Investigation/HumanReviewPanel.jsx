import { useState } from "react";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import investigationService from "../../services/investigationService";
import "../../styles/components/investigation/human-review-panel.css";

export default function HumanReviewPanel({ investigation, onReviewSubmitted }) {
    if (!investigation) {
        return null;
    }

    const report = investigation.report || investigation.final_report || {};
    const invId = investigation.investigation_id || investigation.id || investigation.incident_id;

    // Extract candidate hypotheses
    const rootCauses = report.root_causes || investigation.root_causes || [];
    const reasoning = report.reasoning || investigation.reasoning || {};
    const rawHypotheses = reasoning.hypotheses || [];

    const candidateList = [];
    rootCauses.forEach((rc) => {
        const text = rc.probable_cause || rc.hypothesis;
        if (text && !candidateList.some(c => c.value === text)) {
            candidateList.push({
                label: `${text} (${rc.confidence || rc.confidence_score || investigation.confidence || 0}% confidence)`,
                value: text,
                confidence: rc.confidence || rc.confidence_score || investigation.confidence || 0,
                service: rc.service_name || investigation.service_name || "service"
            });
        }
    });

    rawHypotheses.forEach((h) => {
        const text = typeof h === "string" ? h : (h.hypothesis || h.description);
        if (text && !candidateList.some(c => c.value === text)) {
            candidateList.push({
                label: text,
                value: text,
                confidence: typeof h === "object" ? (h.confidence || 0) : 0,
                service: investigation.service_name || "service"
            });
        }
    });

    const currentReviewStatus = (
        investigation.review_status
        || report.review_status
        || investigation.review_decision?.status
        || "PENDING_REVIEW"
    ).toUpperCase();

    const isAlreadyReviewed = currentReviewStatus !== "PENDING_REVIEW";

    // Form state
    const [selectedHypothesis, setSelectedHypothesis] = useState(
        investigation.selected_hypothesis || report.selected_hypothesis || (candidateList[0]?.value || "")
    );
    const [decisionStatus, setDecisionStatus] = useState(
        isAlreadyReviewed ? currentReviewStatus : "ACCEPTED"
    );
    const [reviewerNotes, setReviewerNotes] = useState(
        investigation.reviewer_notes || report.reviewer_notes || ""
    );
    const [resolution, setResolution] = useState(
        investigation.resolution || report.resolution || ""
    );
    const [isEditing, setIsEditing] = useState(!isAlreadyReviewed);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    const getStatusTagSeverity = (status) => {
        switch (status) {
            case "ACCEPTED":
                return "success";
            case "REJECTED":
                return "danger";
            case "ESCALATED":
                return "warning";
            case "PARTIALLY_ACCEPTED":
                return "info";
            default:
                return "secondary";
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            const payload = {
                status: decisionStatus,
                selected_hypothesis: decisionStatus === "ACCEPTED" ? selectedHypothesis : (selectedHypothesis || null),
                reviewer_notes: reviewerNotes.trim() || null,
                resolution: resolution.trim() || null,
            };

            await investigationService.submitReview(invId, payload);

            setStatusMessage({
                severity: "success",
                text: `Review submitted successfully: Investigation marked as ${decisionStatus}.`
            });
            setIsEditing(false);

            if (onReviewSubmitted) {
                onReviewSubmitted();
            }
        } catch (err) {
            const detail = err.response?.data?.detail || err.message || "Failed to submit review.";
            setStatusMessage({
                severity: "error",
                text: `Error submitting review: ${detail}`
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="human-review-panel">
            {/* Header */}
            <div className="human-review-header">
                <div className="human-review-title">
                    <i className="pi pi-user-check text-primary"></i>
                    <span>Human Review & Decision</span>
                </div>
                <div>
                    <Tag
                        value={currentReviewStatus.replace("_", " ")}
                        severity={getStatusTagSeverity(currentReviewStatus)}
                        icon={currentReviewStatus === "ACCEPTED" ? "pi pi-check" : currentReviewStatus === "PENDING_REVIEW" ? "pi pi-clock" : "pi pi-info-circle"}
                    />
                </div>
            </div>

            {/* Advisory Boundary Notice */}
            <div className="human-review-advisory">
                <i className="pi pi-shield"></i>
                <span>
                    <strong>Advisory Notice:</strong> AI-generated analysis is advisory.
                    Human review is required before treating a hypothesis as the final investigation conclusion.
                </span>
            </div>

            {/* Status Feedback Message */}
            {statusMessage && (
                <Message
                    severity={statusMessage.severity}
                    text={statusMessage.text}
                    className="w-full"
                />
            )}

            {/* If Already Reviewed and not in edit mode */}
            {isAlreadyReviewed && !isEditing ? (
                <div className="reviewed-summary-card">
                    <div className="reviewed-metric-row">
                        <span className="reviewed-metric-label">Review Decision:</span>
                        <span className="reviewed-metric-value">
                            <Tag value={currentReviewStatus} severity={getStatusTagSeverity(currentReviewStatus)} />
                        </span>
                    </div>

                    {(investigation.selected_hypothesis || report.selected_hypothesis || selectedHypothesis) && (
                        <div className="reviewed-metric-row">
                            <span className="reviewed-metric-label">Confirmed Hypothesis:</span>
                            <span className="reviewed-metric-value">
                                {investigation.selected_hypothesis || report.selected_hypothesis || selectedHypothesis}
                            </span>
                        </div>
                    )}

                    {(investigation.reviewer_notes || report.reviewer_notes || reviewerNotes) && (
                        <div className="reviewed-metric-row">
                            <span className="reviewed-metric-label">Reviewer Notes:</span>
                            <span className="reviewed-metric-value">
                                {investigation.reviewer_notes || report.reviewer_notes || reviewerNotes}
                            </span>
                        </div>
                    )}

                    {(investigation.resolution || report.resolution || resolution) && (
                        <div className="reviewed-metric-row">
                            <span className="reviewed-metric-label">Resolution Summary:</span>
                            <span className="reviewed-metric-value">
                                {investigation.resolution || report.resolution || resolution}
                            </span>
                        </div>
                    )}

                    {(investigation.reviewed_at || report.reviewed_at) && (
                        <div className="reviewed-metric-row">
                            <span className="reviewed-metric-label">Reviewed Timestamp:</span>
                            <span className="reviewed-metric-value">
                                {new Date(investigation.reviewed_at || report.reviewed_at).toUTCString()}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-content-end mt-2">
                        <Button
                            label="Edit Decision"
                            icon="pi pi-pencil"
                            size="small"
                            outlined
                            onClick={() => setIsEditing(true)}
                        />
                    </div>
                </div>
            ) : (
                /* Review Form */
                <div className="review-form-section">
                    {/* Candidate Hypotheses Box */}
                    <div className="candidate-hypotheses-box">
                        <div className="candidate-hypotheses-title">
                            AI Candidate Hypotheses ({candidateList.length})
                        </div>
                        {candidateList.length === 0 ? (
                            <p className="text-sm text-500 m-0">No candidate hypotheses generated.</p>
                        ) : (
                            candidateList.map((cand, idx) => (
                                <div
                                    key={idx}
                                    className={`candidate-hypothesis-item ${selectedHypothesis === cand.value ? "selected" : ""}`}
                                    onClick={() => setSelectedHypothesis(cand.value)}
                                >
                                    <span className="hypothesis-confidence-badge">
                                        {cand.confidence}%
                                    </span>
                                    <div className="flex-1 text-sm text-300">
                                        {cand.value}
                                    </div>
                                    {selectedHypothesis === cand.value && (
                                        <i className="pi pi-check-circle text-primary"></i>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Selected Hypothesis Dropdown */}
                    <div className="review-field-group">
                        <label className="review-field-label">Selected Hypothesis for Confirmation:</label>
                        <Dropdown
                            value={selectedHypothesis}
                            options={candidateList}
                            onChange={(e) => setSelectedHypothesis(e.value)}
                            placeholder="Select a hypothesis to confirm..."
                            className="w-full"
                        />
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="review-field-group">
                        <label className="review-field-label">Decision Authority Action:</label>
                        <div className="decision-button-group">
                            <Button
                                label="ACCEPT"
                                icon="pi pi-check"
                                severity="success"
                                outlined={decisionStatus !== "ACCEPTED"}
                                className="decision-btn"
                                onClick={() => setDecisionStatus("ACCEPTED")}
                            />
                            <Button
                                label="REJECT"
                                icon="pi pi-times"
                                severity="danger"
                                outlined={decisionStatus !== "REJECTED"}
                                className="decision-btn"
                                onClick={() => setDecisionStatus("REJECTED")}
                            />
                            <Button
                                label="ESCALATE"
                                icon="pi pi-arrow-up-right"
                                severity="warning"
                                outlined={decisionStatus !== "ESCALATED"}
                                className="decision-btn"
                                onClick={() => setDecisionStatus("ESCALATED")}
                            />
                        </div>
                    </div>

                    {/* Reviewer Notes */}
                    <div className="review-field-group">
                        <label className="review-field-label">Reviewer Notes & Observations:</label>
                        <InputTextarea
                            value={reviewerNotes}
                            onChange={(e) => setReviewerNotes(e.target.value)}
                            rows={3}
                            placeholder="Add human engineer notes, observations, or counter-evidence..."
                            className="w-full"
                        />
                    </div>

                    {/* Resolution Summary */}
                    <div className="review-field-group">
                        <label className="review-field-label">Resolution / Action Plan Summary:</label>
                        <InputTextarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            rows={2}
                            placeholder="Outline remediation steps or post-incident action items..."
                            className="w-full"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-content-end gap-2 mt-2">
                        {isAlreadyReviewed && (
                            <Button
                                label="Cancel"
                                severity="secondary"
                                outlined
                                onClick={() => setIsEditing(false)}
                            />
                        )}
                        <Button
                            label={isSubmitting ? "Submitting..." : "Submit Review"}
                            icon="pi pi-send"
                            loading={isSubmitting}
                            onClick={handleSubmit}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
