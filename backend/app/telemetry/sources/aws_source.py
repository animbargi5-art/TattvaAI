"""
===============================================================================
TattvaAI - AWS Observability Telemetry Source Provider
===============================================================================

Purpose
-------
AWS CloudWatch and AWS X-Ray provider implementing the TelemetrySource interface.
Retrieves traces, logs, metrics, service graphs, and alarms using backend AWS SDK
(boto3) with IAM role credentials.

Security
--------
AWS credentials and access keys are NEVER handled on the frontend or passed to
the browser. All AWS API calls are performed backend-side via IAM credentials.
===============================================================================
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from app.core.logger import logger
from app.core.settings import settings
from app.models.alert import Alert
from app.models.dependency import Dependency
from app.models.historical_incident import HistoricalIncident
from app.models.log import Log
from app.models.metric import Metric
from app.models.trace import Trace
from app.telemetry.sources.base import TelemetrySource


class AWSLegacyAdapter:
    """Fallback helper for legacy tool access."""
    async def health_check(self) -> bool:
        return True


class AWSObservabilitySource(TelemetrySource):
    """
    AWS Observability evidence provider.
    Retrieves operational telemetry from CloudWatch, X-Ray, and CloudWatch Logs.
    """

    def __init__(
        self,
        region: Optional[str] = None,
        log_group: Optional[str] = None,
    ) -> None:
        self.region = region or getattr(settings, "AWS_DEFAULT_REGION", "us-east-1")
        self.log_group = log_group or f"/aws/lambda/{getattr(settings, 'LAMBDA_FUNCTION_NAME', 'TattvaAI-Backend')}"
        self.signoz = AWSLegacyAdapter()
        self._cw_client = None
        self._xray_client = None
        self._logs_client = None
        logger.info("Initialized AWSObservabilitySource [region=%s, log_group=%s]", self.region, self.log_group)

    def _get_boto3_client(self, service_name: str):
        try:
            import boto3
            return boto3.client(service_name, region_name=self.region)
        except Exception as e:
            logger.warning("Could not initialize boto3 client for '%s': %s", service_name, e)
            return None

    @property
    def cw(self):
        if self._cw_client is None:
            self._cw_client = self._get_boto3_client("cloudwatch")
        return self._cw_client

    @property
    def xray(self):
        if self._xray_client is None:
            self._xray_client = self._get_boto3_client("xray")
        return self._xray_client

    @property
    def logs(self):
        if self._logs_client is None:
            self._logs_client = self._get_boto3_client("logs")
        return self._logs_client

    # =========================================================================
    # Health Check
    # =========================================================================

    async def health_check(self) -> bool:
        """Verify AWS IAM credentials and connectivity to CloudWatch."""
        try:
            cw = self.cw
            if cw:
                cw.list_metrics()
                return True
        except Exception as e:
            logger.warning("AWS Observability health check failed: %s", e)
        return False

    # =========================================================================
    # Traces (AWS X-Ray)
    # =========================================================================

    async def get_traces(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Trace]:
        traces: List[Trace] = []
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(minutes=30)

        try:
            xray = self.xray
            if xray:
                # Query X-Ray trace summaries
                response = xray.get_trace_summaries(
                    StartTime=start_time,
                    EndTime=now,
                    Sampling=False,
                )
                summaries = response.get("TraceSummaries", [])
                for summary in summaries[:15]:
                    trace_id = summary.get("Id")
                    if not trace_id:
                        continue
                    duration = float(summary.get("Duration", 0.05)) * 1000
                    has_error = summary.get("HasError", False) or summary.get("HasFault", False)
                    status_code = summary.get("Http", {}).get("HttpStatus", 500 if has_error else 200)

                    svc_name = service_name
                    if summary.get("EntryPoint") and summary["EntryPoint"].get("Name"):
                        svc_name = summary["EntryPoint"]["Name"]
                    elif summary.get("ServiceIds") and len(summary["ServiceIds"]) > 0:
                        svc_name = summary["ServiceIds"][0].get("Name", service_name)

                    traces.append(
                        Trace(
                            trace_id=trace_id,
                            span_id=trace_id[:16],
                            service_name=svc_name,
                            operation_name=f"AWS X-Ray {svc_name}",
                            status_code=status_code,
                            duration_ms=round(duration, 2),
                            timestamp=summary.get("StartTime", now),
                            attributes={
                                "provider": "aws",
                                "source": "aws_xray",
                                "mode": "LIVE",
                                "region": str(self.region),
                                "has_fault": str(summary.get("HasFault", False)),
                                "has_error": str(summary.get("HasError", False)),
                                "response_time": str(summary.get("ResponseTime", "")),
                            },
                        )
                    )
        except Exception as e:
            logger.warning("Failed to retrieve live X-Ray traces: %s", e)

        return traces

    # =========================================================================
    # Logs (AWS CloudWatch Logs)
    # =========================================================================

    async def get_logs(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Log]:
        logs_list: List[Log] = []
        now = datetime.now(timezone.utc)
        start_time = int((now - timedelta(minutes=45)).timestamp() * 1000)

        candidate_groups = [
            f"/aws/lambda/{service_name}",
            self.log_group,
            f"/aws/lambda/{getattr(settings, 'LAMBDA_FUNCTION_NAME', 'TattvaAI-Backend')}",
        ]

        try:
            logs_client = self.logs
            if logs_client:
                target_group = None
                for grp in candidate_groups:
                    try:
                        logs_client.describe_log_streams(logGroupName=grp, limit=1)
                        target_group = grp
                        break
                    except Exception:
                        continue

                if target_group:
                    response = logs_client.filter_log_events(
                        logGroupName=target_group,
                        startTime=start_time,
                        limit=15,
                    )
                    events = response.get("events", [])
                    for ev in events:
                        msg = ev.get("message", "").strip()
                        severity = "ERROR" if ("ERROR" in msg.upper() or "EXCEPTION" in msg.upper()) else "INFO"
                        ts = datetime.fromtimestamp(ev.get("timestamp", 0) / 1000.0, tz=timezone.utc)
                        logs_list.append(
                            Log(
                                log_id=str(ev.get("eventId", f"cw-{int(ts.timestamp())}")),
                                service_name=service_name,
                                severity=severity,
                                message=msg,
                                timestamp=ts,
                                attributes={
                                    "provider": "aws",
                                    "source": "aws_cloudwatch_logs",
                                    "mode": "LIVE",
                                    "log_group": target_group,
                                    "region": self.region,
                                },
                            )
                        )
        except Exception as e:
            logger.warning("Failed to retrieve live CloudWatch logs: %s", e)

        return logs_list

    # =========================================================================
    # Metrics (AWS CloudWatch Metrics)
    # =========================================================================

    async def get_metrics(
        self,
        service_name: str,
        metric_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Metric]:
        metrics_list: List[Metric] = []
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=1)

        try:
            cw = self.cw
            if cw:
                target_metrics = ["Duration", "Invocations", "Errors"]
                func_names = [service_name, getattr(settings, "LAMBDA_FUNCTION_NAME", "TattvaAI-Backend")]

                for m_name in target_metrics:
                    for f_name in func_names:
                        try:
                            res = cw.get_metric_statistics(
                                Namespace="AWS/Lambda",
                                MetricName=m_name,
                                Dimensions=[{"Name": "FunctionName", "Value": f_name}],
                                StartTime=start_time,
                                EndTime=now,
                                Period=300,
                                Statistics=["Average", "Sum", "Maximum"],
                            )
                            dps = res.get("Datapoints", [])
                            if dps:
                                latest_dp = sorted(dps, key=lambda x: x["Timestamp"])[-1]
                                val = latest_dp.get("Average") if m_name == "Duration" else (latest_dp.get("Sum") or latest_dp.get("Maximum") or 0.0)
                                unit = latest_dp.get("Unit", "Count")
                                metrics_list.append(
                                    Metric(
                                        metric_name=f"AWS/Lambda/{m_name}",
                                        service_name=service_name,
                                        value=round(float(val), 2),
                                        unit=str(unit),
                                        timestamp=latest_dp.get("Timestamp", now),
                                        labels={
                                            "provider": "aws",
                                            "source": "aws_cloudwatch",
                                            "mode": "LIVE",
                                            "region": str(self.region),
                                            "function_name": str(f_name),
                                        },
                                    )
                                )
                                break
                        except Exception:
                            continue
        except Exception as e:
            logger.warning("Failed to retrieve live CloudWatch metrics: %s", e)

        return metrics_list

    # =========================================================================
    # Dependencies (AWS X-Ray Service Graph)
    # =========================================================================

    async def get_dependencies(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Dependency]:
        dependencies: List[Dependency] = []
        now = datetime.now(timezone.utc)

        try:
            xray = self.xray
            if xray:
                response = xray.get_service_graph(
                    StartTime=now - timedelta(minutes=30),
                    EndTime=now,
                )
                services = response.get("Services", [])
                for s in services:
                    s_name = s.get("Name", "Unknown")
                    total_calls = int(s.get("SummaryStatistics", {}).get("TotalCount", 1))
                    err_calls = int(s.get("SummaryStatistics", {}).get("ErrorStatistics", {}).get("TotalCount", 0))
                    fault_calls = int(s.get("SummaryStatistics", {}).get("FaultStatistics", {}).get("TotalCount", 0))
                    hist = s.get("ResponseTimeHistogram")
                    latency = float(hist[0].get("Value", 15.0) if hist else 15.0)
                    dependencies.append(
                        Dependency(
                            dependency_id=f"dep-aws-{s_name}",
                            source_service=service_name,
                            target_service=s_name,
                            relationship="calls",
                            request_count=total_calls,
                            error_count=err_calls + fault_calls,
                            error_rate=round((err_calls + fault_calls) / max(1, total_calls), 4),
                            average_latency_ms=latency,
                            timestamp=now,
                            attributes={
                                "provider": "aws",
                                "source": "aws_xray_graph",
                                "mode": "LIVE",
                                "region": str(self.region),
                                "health_status": "FAULT" if fault_calls > 0 else "HEALTHY",
                            },
                        )
                    )
        except Exception as e:
            logger.warning("Failed to retrieve X-Ray service graph: %s", e)

        return dependencies

    # =========================================================================
    # Alerts (AWS CloudWatch Alarms)
    # =========================================================================

    async def get_alerts(
        self,
        service_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Alert]:
        alerts_list: List[Alert] = []
        now = datetime.now(timezone.utc)

        try:
            cw = self.cw
            if cw:
                response = cw.describe_alarms(MaxRecords=10)
                metric_alarms = response.get("MetricAlarms", [])
                for alarm in metric_alarms:
                    state = alarm.get("StateValue", "OK")
                    alarm_name = str(alarm.get("AlarmName", "CloudWatch Alarm"))
                    alerts_list.append(
                        Alert(
                            alert_id=str(alarm.get("AlarmArn", alarm_name)),
                            name=alarm_name,
                            rule_name=alarm_name,
                            service_name=service_name or "aws-infrastructure",
                            severity="CRITICAL" if state == "ALARM" else "INFO",
                            status="FIRING" if state == "ALARM" else "RESOLVED",
                            summary=str(alarm.get("AlarmDescription") or f"CloudWatch Alarm {alarm_name} in state {state}"),
                            description=str(alarm.get("AlarmDescription") or f"CloudWatch Alarm in state {state}"),
                            source="aws_cloudwatch_alarms",
                            fired_at=alarm.get("StateUpdatedTimestamp", now),
                            labels={
                                "provider": "aws",
                                "source": "aws_cloudwatch_alarms",
                                "mode": "LIVE",
                                "metric_name": str(alarm.get("MetricName", "")),
                                "state": str(state),
                            },
                        )
                    )
        except Exception as e:
            logger.warning("Failed to describe CloudWatch alarms: %s", e)

        return alerts_list

    # =========================================================================
    # Historical Incidents
    # =========================================================================

    async def get_historical_incidents(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[HistoricalIncident]:
        return []
