# TattvaAI Demo Video Script
## WeMakeDevs × AWS Bharat Builds Tour - First Commit Hackathon
**Target Duration:** 2:40 - 2:55 (under 3 minutes)

---

## 🎬 Shot Plan

### 0:00-0:20 | PROBLEM (20 seconds)
**Visual:** TattvaAI Dashboard showing investigation cards

**Narration:**
> "Production incidents force engineers to jump between logs, traces, metrics, and services before they can understand what actually failed. TattvaAI brings that investigation into one evidence-grounded workflow."

**On Screen:**
- Show dashboard with recent investigations
- Highlight different evidence sources (traces, logs, metrics)
- Show the problem: fragmented tools

---

### 0:20-0:40 | WHAT TATTVAAI DOES (20 seconds)
**Visual:** Investigation pipeline animation or architecture diagram

**Narration:**
> "TattvaAI collects observability evidence, correlates related signals, generates investigation hypotheses with confidence scores, and keeps a human engineer in the review loop."

**On Screen:**
- Show 8-stage pipeline: Traces → Logs → Metrics → Dependencies → Alerts → Historical → Correlation → AI Reasoning
- Highlight "Human in the Loop" review
- Show confidence scores

---

### 0:40-1:05 | AWS ARCHITECTURE (25 seconds)
**Visual:** AWS Console or architecture diagram

**Narration:**
> "The application is deployed on AWS using API Gateway, Lambda, DynamoDB, S3, CloudWatch and X-Ray, with the frontend hosted on Amplify. All telemetry comes from real AWS services, not fabricated data."

**On Screen:**
- Show AWS Console (optional)
- Architecture diagram: Frontend (Amplify) → API Gateway → Lambda → DynamoDB/S3
- Highlight CloudWatch + X-Ray integration
- Show "REAL AWS TELEMETRY" badge

---

### 1:05-1:45 | REAL INCIDENT DEMO (40 seconds)
**Visual:** Trigger incident + show telemetry generation

**Narration:**
> "Let me trigger a controlled production-style payment timeout failure. AWS generates the telemetry - CloudWatch logs, X-Ray traces, and service dependencies - and TattvaAI consumes that live evidence."

**On Screen:**
- Navigate to incident lab or trigger endpoint
- Trigger "PAYMENT_TIMEOUT" scenario
- Show loading/processing
- Quick flash of CloudWatch Logs (optional)
- Quick flash of X-Ray trace (optional)

**Key Point:** Emphasize this is REAL AWS telemetry, not mock data

---

### 1:45-2:15 | TATTVAAI INVESTIGATION (30 seconds)
**Visual:** Investigation detail page with evidence

**Narration:**
> "TattvaAI correlates the trace, logs, metrics, and dependency evidence, then produces an evidence-grounded hypothesis with confidence and recommended remediation. Every piece of evidence shows where it came from - provider, source, and AWS region."

**On Screen:**
- Show Investigation Summary
- Show Evidence tabs: Performance (X-Ray trace), Application (CloudWatch logs), Infrastructure (Metrics)
- Open Provenance Inspector showing:
  - Provider: AWS
  - Source: aws_xray / aws_cloudwatch_logs
  - Mode: LIVE
  - Region: us-east-1
- Show Correlation panel
- Show AI Reasoning with confidence score
- Highlight root cause: "Payment gateway timeout"

---

### 2:15-2:35 | HUMAN REVIEW (20 seconds)
**Visual:** Human review section

**Narration:**
> "The AI remains advisory. The engineer reviews the evidence and decides whether to accept the hypothesis, reject it, or escalate for further investigation."

**On Screen:**
- Scroll to Human Review section
- Show Accept / Reject / Escalate buttons
- Show reviewer notes field
- Optionally click "Accept"

---

### 2:35-2:50 | REPORT EXPORT (15 seconds)
**Visual:** Export options and generated report

**Narration:**
> "Once reviewed, the investigation can be exported as a structured incident report in PDF, Markdown, or JSON format for post-mortems and compliance."

**On Screen:**
- Show Actions panel
- Show Export buttons (PDF / Markdown / JSON)
- Optionally trigger PDF export
- Show downloaded file (optional)

---

### 2:50-2:58 | CLOSING (8 seconds)
**Visual:** Return to Dashboard

**Narration:**
> "TattvaAI turns fragmented AWS observability data into a structured incident investigation workflow for engineers and SRE teams."

**On Screen:**
- Show dashboard with completed investigation
- Display TattvaAI logo
- Show GitHub repo URL (optional): github.com/animbargi5-art/TattvaAI
- Show live URL (optional): https://main.d3g1wefvf7qg71.amplifyapp.com

---

## 🎯 Key Messages to Emphasize

1. **REAL AWS Telemetry** - Not fabricated, all from actual AWS services
2. **Evidence-Based** - Every claim tied to concrete evidence
3. **Human in the Loop** - AI is advisory, not autonomous
4. **Production-Ready** - Deployed on AWS serverless architecture
5. **Work Email Policy** - Enterprise-focused (mention briefly if time)

---

## 📋 Pre-Recording Checklist

### Backend
- [ ] Backend running on localhost:8000
- [ ] Health endpoint responding
- [ ] At least one demo investigation pre-seeded
- [ ] Incident lab scenarios available

### Frontend  
- [ ] Frontend running on localhost:3000
- [ ] No console errors in DevTools
- [ ] Test user account created (work email)
- [ ] Already logged in before recording
- [ ] Browser zoom at 100%
- [ ] Clear browser cache/cookies

### Environment
- [ ] Close unnecessary browser tabs
- [ ] Close unnecessary applications
- [ ] Disable notifications (Windows/Mac)
- [ ] Set browser to full screen (F11) or maximized
- [ ] Prepare screen recording software (OBS, ScreenFlow, etc.)
- [ ] Test audio levels
- [ ] Clear desktop (minimal distractions)

### Demo Data
- [ ] Have at least 1-2 completed investigations visible
- [ ] Incident lab endpoint accessible
- [ ] Know which scenario to trigger (PAYMENT_TIMEOUT)
- [ ] Have provenance inspector working

---

## 🎥 Recording Tips

1. **Practice 2-3 times** before final recording
2. **Speak clearly and slowly** - don't rush
3. **Pause briefly** between sections for editing
4. **Show, don't tell** - let the UI speak
5. **Keep mouse movements smooth** - no erratic clicking
6. **Time yourself** - must be under 3:00
7. **Record in 1080p** minimum (1920x1080)
8. **Use 30fps** for smooth playback
9. **Add captions/subtitles** if possible

---

## ✂️ Post-Production

1. **Trim dead time** at start and end
2. **Add intro card** (optional): "TattvaAI - AI-Powered Incident Investigation"
3. **Add outro card** (optional): GitHub + Live URL
4. **Add background music** (optional, very subtle)
5. **Verify length** < 3:00
6. **Export as MP4** (H.264, 1080p)
7. **Upload to YouTube** as Public or Unlisted
8. **Test video** in incognito mode
9. **Copy YouTube URL** for submission

---

## 🔗 Final Deliverables

- [ ] YouTube video URL (< 3 minutes)
- [ ] Video is public or unlisted (not private)
- [ ] Video plays in signed-out browser
- [ ] GitHub repository is public
- [ ] README is updated with architecture
- [ ] Live Amplify URL is working
- [ ] All commits pushed to main branch

---

## 📝 Video Description (YouTube)

**Title:** TattvaAI - AI-Powered Incident Investigation Platform | AWS Hackathon

**Description:**
```
TattvaAI is an AI-powered incident investigation platform that automates the triage and root cause analysis of production incidents using real AWS observability data.

🔗 Links:
- Live Application: https://main.d3g1wefvf7qg71.amplifyapp.com
- GitHub Repository: https://github.com/animbargi5-art/TattvaAI
- Production API: https://eodackuif2.execute-api.us-east-1.amazonaws.com

🏗️ Built With:
- AWS Lambda, API Gateway, DynamoDB, S3, Amplify
- AWS CloudWatch & X-Ray for telemetry
- FastAPI (Python) backend
- React 19 frontend with PrimeReact
- 8-stage multi-agent investigation pipeline
- Evidence-based AI reasoning with human review

🎯 Features:
- Real-time AWS telemetry integration
- Evidence provenance tracking
- Multi-agent correlation engine
- Human-in-the-loop review workflow
- One-click post-mortem report generation

Built for WeMakeDevs × AWS Bharat Builds Tour - First Commit Hackathon 2024

#AWS #AIHackathon #CloudComputing #SRE #IncidentManagement
```

---

## ⚠️ Common Pitfalls to Avoid

1. ❌ **Don't exceed 3 minutes** - YouTube won't allow submission
2. ❌ **Don't show personal information** - emails, names, tokens
3. ❌ **Don't show console errors** - test beforehand
4. ❌ **Don't use copyrighted music** - use royalty-free only
5. ❌ **Don't make video private** - must be public/unlisted
6. ❌ **Don't claim features that don't work** - be truthful
7. ❌ **Don't show fake telemetry** - emphasize REAL AWS data
8. ❌ **Don't skip evidence provenance** - this is key differentiator

---

## ✅ Success Criteria

- [ ] Video clearly demonstrates the problem TattvaAI solves
- [ ] Video shows real AWS telemetry integration (not fake)
- [ ] Video shows the investigation workflow end-to-end
- [ ] Video shows human review process
- [ ] Video shows report generation
- [ ] Video duration < 3:00
- [ ] Video quality is professional (clear audio, smooth recording)
- [ ] AWS services are visibly mentioned/shown
- [ ] Video works when viewed in incognito mode

---

**REMEMBER:** The video is your pitch. Make it compelling, professional, and truthful. Good luck! 🚀
