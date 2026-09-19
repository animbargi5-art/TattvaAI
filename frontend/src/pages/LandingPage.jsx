import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={{ ...styles.nav, ...(scrolled ? styles.navScrolled : {}) }}>
        <div style={styles.logoGroup}>
          <span style={styles.logoBadge}>AI</span>
          <span style={styles.logoText}>TattvaAI</span>
        </div>
        <div style={styles.navLinks}>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="#architecture" style={styles.navLink}>Architecture</a>
          <a href="#pricing" style={styles.navLink}>Pricing</a>
          <button style={styles.navButton} onClick={() => navigate("/dashboard")}>
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroPill}>
          <span style={styles.heroPillDot}></span>
          Powered by Amazon Bedrock &amp; Model Context Protocol
        </div>
        <h1 style={styles.heroTitle}>
          Transform SRE Incident Investigations from{" "}
          <span style={styles.gradientText}>Hours to Seconds</span>
        </h1>
        <p style={styles.heroSubtitle}>
          An AI-native Site Reliability Engineering platform that correlates distributed
          traces, logs, metrics, and alerts to deliver evidence-grounded root cause
          diagnosis with Amazon Bedrock reasoning.
        </p>
        <div style={styles.heroCtaGroup}>
          <button style={styles.primaryCta} onClick={() => navigate("/dashboard")}>
            Start Free Investigation Trial
          </button>
          <button style={styles.secondaryCta} onClick={() => navigate("/pricing")}>
            View Subscription Tiers
          </button>
        </div>

        {/* Hero stats */}
        <div style={styles.heroStats}>
          <div style={styles.heroStat}>
            <strong style={styles.heroStatValue}>85%</strong>
            <span style={styles.heroStatLabel}>MTTR Reduction</span>
          </div>
          <div style={styles.heroStatDivider} />
          <div style={styles.heroStat}>
            <strong style={styles.heroStatValue}>&lt;30s</strong>
            <span style={styles.heroStatLabel}>Diagnosis Time</span>
          </div>
          <div style={styles.heroStatDivider} />
          <div style={styles.heroStat}>
            <strong style={styles.heroStatValue}>8-stage</strong>
            <span style={styles.heroStatLabel}>AI Pipeline</span>
          </div>
          <div style={styles.heroStatDivider} />
          <div style={styles.heroStat}>
            <strong style={styles.heroStatValue}>0</strong>
            <span style={styles.heroStatLabel}>Hallucinated Metrics</span>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" style={styles.featuresSection}>
        <div style={styles.sectionLabel}>CAPABILITIES</div>
        <h2 style={styles.sectionHeader}>Built for Modern Engineering &amp; SRE Teams</h2>
        <div style={styles.grid}>
          {features.map((f, i) => (
            <div key={i} style={styles.card}>
              <div style={styles.cardIconWrap}>
                <i className={f.icon} style={styles.cardIconI} />
              </div>
              <h3 style={styles.cardTitle}>{f.title}</h3>
              <p style={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" style={styles.archSection}>
        <div style={styles.sectionLabel}>AWS ARCHITECTURE</div>
        <h2 style={styles.sectionHeader}>Production-Ready Serverless Stack</h2>
        <div style={styles.archGrid}>
          {archStack.map((layer, i) => (
            <div key={i} style={styles.archCard}>
              <div style={styles.archIcon}>
                <i className={layer.icon} style={{ color: layer.color }} />
              </div>
              <div style={styles.archLabel}>{layer.label}</div>
              <div style={styles.archDesc}>{layer.desc}</div>
            </div>
          ))}
        </div>
        <div style={styles.archFlow}>
          {["React + Vite", "AWS Amplify", "API Gateway", "Lambda (FastAPI)", "Amazon Bedrock", "DynamoDB + S3"].map((step, i, arr) => (
            <React.Fragment key={i}>
              <span style={styles.archFlowStep}>{step}</span>
              {i < arr.length - 1 && <span style={styles.archFlowArrow}>&#8594;</span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={styles.pricingSection}>
        <div style={styles.sectionLabel}>PRICING</div>
        <h2 style={styles.sectionHeader}>Transparent, Honest Monetization</h2>
        <p style={styles.pricingSub}>Start with a 14-day free trial. Upgrade as your team grows.</p>

        <div style={styles.pricingGrid}>
          {/* Developer Trial */}
          <div style={styles.priceCard}>
            <h3 style={styles.planName}>Developer Trial</h3>
            <div style={styles.price}>$0<span style={styles.pricePeriod}> / month</span></div>
            <p style={styles.planDesc}>Ideal for evaluating TattvaAI on staging environments.</p>
            <ul style={styles.featureList}>
              <li>&#10003; 50 AI Investigations / mo</li>
              <li>&#10003; Single Microservice Scope</li>
              <li>&#10003; Amazon Bedrock AI Reasoning</li>
              <li>&#10003; Standard Telemetry Support</li>
            </ul>
            <button style={styles.planButton} onClick={() => navigate("/dashboard")}>
              Get Started Free
            </button>
          </div>

          {/* Pro Plan */}
          <div style={{ ...styles.priceCard, ...styles.priceCardFeatured }}>
            <div style={styles.popularBadge}>MOST POPULAR</div>
            <h3 style={{ ...styles.planName, color: "#0ea5e9" }}>Pro SRE Team</h3>
            <div style={{ ...styles.price, color: "#0ea5e9" }}>$149<span style={styles.pricePeriod}> / month</span></div>
            <p style={styles.planDesc}>For production engineering teams demanding fast MTTR.</p>
            <ul style={styles.featureList}>
              <li>&#10003; Unlimited AI Investigations</li>
              <li>&#10003; Full Multi-Service Dependency Graphs</li>
              <li>&#10003; Live Multi-Provider Observability (AWS, SigNoz, OTel)</li>
              <li>&#10003; Amazon Bedrock AI Reasoning</li>
              <li>&#10003; Automated Actionable Remediation</li>
            </ul>
            <button style={styles.featuredPlanButton} onClick={() => navigate("/pricing")}>
              Start Pro Trial
            </button>
          </div>

          {/* Enterprise */}
          <div style={styles.priceCard}>
            <h3 style={styles.planName}>Enterprise SaaS</h3>
            <div style={styles.price}>$499<span style={styles.pricePeriod}> / month</span></div>
            <p style={styles.planDesc}>Dedicated AWS deployment with enterprise SLA and RBAC.</p>
            <ul style={styles.featureList}>
              <li>&#10003; Dedicated AWS Lambda Cluster</li>
              <li>&#10003; Custom Runbook Automation</li>
              <li>&#10003; RBAC &amp; SSO Authentication</li>
              <li>&#10003; 24/7 Priority SRE Support</li>
            </ul>
            <button style={styles.planButton} onClick={() => navigate("/pricing")}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerBrand}>
          <span style={styles.logoBadge}>AI</span>
          <span style={{ ...styles.logoText, fontSize: "1rem" }}>TattvaAI</span>
        </div>
        <p style={styles.footerText}>
          &copy; 2026 TattvaAI Inc. &mdash; Autonomous Incident Investigation Platform
        </p>
        <p style={styles.footerSub}>
          Powered by Amazon Bedrock &middot; AWS Lambda &middot; API Gateway &middot; DynamoDB &middot; S3
        </p>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "pi pi-search",
    title: "Evidence-First AI Reasoning",
    desc: "Zero hallucinated metrics. Every hypothesis is mapped directly to actual database latencies, trace spans, and error logs.",
  },
  {
    icon: "pi pi-brain",
    title: "Amazon Bedrock AI Reasoning",
    desc: "Deep multi-stage causal reasoning engine analyzing complex failure cascades across microservices.",
  },
  {
    icon: "pi pi-server",
    title: "Multi-Provider Observability",
    desc: "Direct integration with AWS CloudWatch/X-Ray, SigNoz, OpenTelemetry, and deterministic demo simulation.",
  },
  {
    icon: "pi pi-bolt",
    title: "30-Second Incident Diagnosis",
    desc: "Automated multi-agent pipeline reduces MTTR by 85% with actionable immediate and long-term remediation steps.",
  },
  {
    icon: "pi pi-share-alt",
    title: "MCP Evidence Correlation",
    desc: "Model Context Protocol layer surfaces structured evidence from traces, metrics, logs, and alerts into the AI reasoning chain.",
  },
  {
    icon: "pi pi-users",
    title: "Human Review &amp; Override",
    desc: "Engineers review AI-synthesized root causes, approve remediation steps, and mark investigations as resolved.",
  },
];

const archStack = [
  { icon: "pi pi-desktop", label: "Frontend", desc: "React + Vite + PrimeReact", color: "#0ea5e9" },
  { icon: "pi pi-cloud", label: "Amplify CDN", desc: "AWS Amplify Hosting", color: "#f97316" },
  { icon: "pi pi-sitemap", label: "API Gateway", desc: "AWS API Gateway REST", color: "#8b5cf6" },
  { icon: "pi pi-code", label: "Lambda", desc: "FastAPI via Mangum", color: "#10b981" },
  { icon: "pi pi-microchip-ai", label: "Bedrock", desc: "Claude AI Reasoning", color: "#ec4899" },
  { icon: "pi pi-database", label: "DynamoDB + S3", desc: "Persistence &amp; Reports", color: "#f59e0b" },
];

const styles = {
  container: {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
    overflowX: "hidden",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 3rem",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: "rgba(13,17,23,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(48,54,61,0.6)",
    transition: "box-shadow 0.2s ease",
  },
  navScrolled: {
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  logoBadge: {
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    padding: "0.18rem 0.5rem",
    borderRadius: "5px",
    fontWeight: "700",
    fontSize: "0.78rem",
    letterSpacing: "0.04em",
  },
  logoText: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#f0f6fc",
    letterSpacing: "-0.02em",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "1.75rem",
  },
  navLink: {
    color: "#8b949e",
    textDecoration: "none",
    fontSize: "0.88rem",
    fontWeight: "500",
    transition: "color 0.15s",
  },
  navButton: {
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    padding: "0.5rem 1.2rem",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.85rem",
    transition: "background 0.15s",
  },
  hero: {
    textAlign: "center",
    padding: "6rem 2rem 4rem",
    maxWidth: "860px",
    margin: "0 auto",
  },
  heroPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    backgroundColor: "rgba(14,165,233,0.1)",
    border: "1px solid rgba(14,165,233,0.3)",
    color: "#38bdf8",
    padding: "0.4rem 1rem",
    borderRadius: "20px",
    fontSize: "0.82rem",
    marginBottom: "1.75rem",
    fontWeight: "500",
  },
  heroPillDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    display: "inline-block",
    animation: "pulse 2s infinite",
  },
  heroTitle: {
    fontSize: "3.2rem",
    fontWeight: "800",
    lineHeight: "1.15",
    marginBottom: "1.25rem",
    letterSpacing: "-0.03em",
    color: "#f0f6fc",
  },
  gradientText: {
    background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    fontSize: "1.1rem",
    color: "#8b949e",
    lineHeight: "1.7",
    marginBottom: "2.25rem",
    maxWidth: "680px",
    margin: "0 auto 2.25rem",
  },
  heroCtaGroup: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "3rem",
  },
  primaryCta: {
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    padding: "0.85rem 2rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background 0.15s, transform 0.1s",
    boxShadow: "0 4px 14px rgba(14,165,233,0.4)",
  },
  secondaryCta: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#c9d1d9",
    border: "1px solid rgba(255,255,255,0.15)",
    padding: "0.85rem 2rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  heroStats: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0",
    flexWrap: "wrap",
    borderTop: "1px solid rgba(48,54,61,0.6)",
    borderBottom: "1px solid rgba(48,54,61,0.6)",
    padding: "1.5rem 0",
    marginTop: "1rem",
  },
  heroStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 2.5rem",
  },
  heroStatValue: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: "#38bdf8",
    letterSpacing: "-0.02em",
  },
  heroStatLabel: {
    fontSize: "0.72rem",
    color: "#8b949e",
    marginTop: "0.2rem",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  heroStatDivider: {
    width: "1px",
    height: "2.5rem",
    backgroundColor: "rgba(48,54,61,0.7)",
  },
  featuresSection: {
    padding: "5rem 3rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionLabel: {
    fontSize: "0.72rem",
    fontWeight: "700",
    letterSpacing: "0.12em",
    color: "#38bdf8",
    marginBottom: "0.75rem",
    textTransform: "uppercase",
  },
  sectionHeader: {
    fontSize: "2rem",
    fontWeight: "800",
    marginBottom: "2.75rem",
    color: "#f0f6fc",
    letterSpacing: "-0.025em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    backgroundColor: "#161b22",
    border: "1px solid #21262d",
    borderRadius: "10px",
    padding: "1.75rem",
    transition: "border-color 0.2s, transform 0.2s",
  },
  cardIconWrap: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "rgba(14,165,233,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  cardIconI: {
    color: "#38bdf8",
    fontSize: "1.1rem",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
    color: "#f0f6fc",
  },
  cardDesc: {
    color: "#8b949e",
    fontSize: "0.875rem",
    lineHeight: "1.6",
  },
  archSection: {
    padding: "5rem 3rem",
    backgroundColor: "#0a0d12",
    borderTop: "1px solid #21262d",
    borderBottom: "1px solid #21262d",
  },
  archGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "1rem",
    maxWidth: "1100px",
    margin: "0 auto 2.5rem",
  },
  archCard: {
    backgroundColor: "#161b22",
    border: "1px solid #21262d",
    borderRadius: "10px",
    padding: "1.5rem 1rem",
    textAlign: "center",
  },
  archIcon: {
    fontSize: "1.5rem",
    marginBottom: "0.6rem",
  },
  archLabel: {
    fontSize: "0.88rem",
    fontWeight: "700",
    color: "#f0f6fc",
    marginBottom: "0.3rem",
  },
  archDesc: {
    fontSize: "0.75rem",
    color: "#8b949e",
  },
  archFlow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
    maxWidth: "900px",
    margin: "0 auto",
    backgroundColor: "#161b22",
    border: "1px solid #21262d",
    borderRadius: "10px",
    padding: "1rem 2rem",
  },
  archFlowStep: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#38bdf8",
    fontFamily: "monospace",
  },
  archFlowArrow: {
    color: "#30363d",
    fontSize: "0.9rem",
  },
  pricingSection: {
    padding: "5rem 3rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  pricingSub: {
    color: "#8b949e",
    marginBottom: "3rem",
    fontSize: "1rem",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1.5rem",
    maxWidth: "1050px",
    margin: "0 auto",
  },
  priceCard: {
    backgroundColor: "#161b22",
    border: "1px solid #21262d",
    borderRadius: "12px",
    padding: "2rem",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  priceCardFeatured: {
    borderColor: "#0ea5e9",
    boxShadow: "0 0 28px rgba(14,165,233,0.15)",
  },
  popularBadge: {
    position: "absolute",
    top: "-13px",
    right: "20px",
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    fontSize: "0.7rem",
    fontWeight: "700",
    padding: "0.2rem 0.7rem",
    borderRadius: "12px",
    letterSpacing: "0.05em",
  },
  planName: {
    fontSize: "1.25rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
    color: "#f0f6fc",
  },
  price: {
    fontSize: "2.25rem",
    fontWeight: "800",
    color: "#f0f6fc",
    marginBottom: "0.5rem",
    letterSpacing: "-0.03em",
  },
  pricePeriod: {
    fontSize: "0.95rem",
    fontWeight: "400",
    color: "#8b949e",
  },
  planDesc: {
    color: "#8b949e",
    fontSize: "0.875rem",
    marginBottom: "1.5rem",
    lineHeight: "1.5",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 2rem 0",
    color: "#c9d1d9",
    fontSize: "0.875rem",
    lineHeight: "2.1",
    flex: 1,
  },
  planButton: {
    marginTop: "auto",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    padding: "0.75rem",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "background 0.15s",
  },
  featuredPlanButton: {
    marginTop: "auto",
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    padding: "0.75rem",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "0.9rem",
    boxShadow: "0 4px 14px rgba(14,165,233,0.35)",
    transition: "background 0.15s",
  },
  footer: {
    textAlign: "center",
    padding: "3rem 2rem",
    color: "#8b949e",
    borderTop: "1px solid #21262d",
    backgroundColor: "#0a0d12",
  },
  footerBrand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    marginBottom: "0.75rem",
  },
  footerText: {
    fontSize: "0.875rem",
    marginBottom: "0.4rem",
    color: "#6e7681",
  },
  footerSub: {
    fontSize: "0.75rem",
    color: "#484f58",
  },
};
