import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <div style={styles.logoGroup}>
          <span style={styles.logoBadge}>ðŸ¤– AI</span>
          <span style={styles.logoText}>TattvaAI</span>
        </div>
        <div style={styles.navLinks}>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="#architecture" style={styles.navLink}>AI Architecture</a>
          <a href="#pricing" style={styles.navLink}>Pricing</a>
          <button style={styles.navButton} onClick={() => navigate("/dashboard")}>
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroPill}>✨ Powered by Amazon Bedrock & Model Context Protocol</div>
        <h1 style={styles.heroTitle}>
          Transform SRE Incident Investigations from <span style={styles.gradientText}>Hours to Seconds</span>
        </h1>
        <p style={styles.heroSubtitle}>
          An AI-native Site Reliability Engineering platform that correlates distributed traces, logs, metrics, and alerts to deliver evidence-grounded root cause diagnosis.
        </p>
        <div style={styles.heroCtaGroup}>
          <button style={styles.primaryCta} onClick={() => navigate("/dashboard")}>
            Start Free Investigation Trial
          </button>
          <button style={styles.secondaryCta} onClick={() => navigate("/pricing")}>
            View Subscription Tiers
          </button>
        </div>
      </header>

      {/* Live Value Proposition Grid */}
      <section id="features" style={styles.featuresSection}>
        <h2 style={styles.sectionHeader}>Built for Modern Engineering & SRE Teams</h2>
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🔍</div>
            <h3 style={styles.cardTitle}>Evidence-First AI Reasoning</h3>
            <p style={styles.cardDesc}>
              Zero hallucinated metrics. Every hypothesis is mapped directly to actual database latencies, trace spans, and error logs.
            </p>
          </div>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🧠</div>
            <h3 style={styles.cardTitle}>Amazon Bedrock AI Reasoning</h3>
            <p style={styles.cardDesc}>
              Deep multi-stage causal reasoning engine analyzing complex failure cascades across microservices.
            </p>
          </div>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🔌</div>
            <h3 style={styles.cardTitle}>Multi-Provider Observability</h3>
            <p style={styles.cardDesc}>
              Direct integration with AWS CloudWatch/X-Ray, SigNoz, OpenTelemetry, and deterministic demo simulation.
            </p>
          </div>
          <div style={styles.card}>
            <div style={styles.cardIcon}>âš¡</div>
            <h3 style={styles.cardTitle}>30-Second Incident Diagnosis</h3>
            <p style={styles.cardDesc}>
              Automated multi-agent pipeline reduces MTTR by 85% with actionable immediate and long-term remediation steps.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Conversion Section */}
      <section id="pricing" style={styles.pricingSection}>
        <h2 style={styles.sectionHeader}>Transparent, Honest Monetization</h2>
        <p style={styles.pricingSub}>Start with a 14-day free trial. Upgrade as your team grows.</p>

        <div style={styles.pricingGrid}>
          {/* Starter Plan */}
          <div style={styles.priceCard}>
            <h3 style={styles.planName}>Developer Trial</h3>
            <div style={styles.price}>$0<span> / month</span></div>
            <p style={styles.planDesc}>Ideal for evaluating TattvaAI on staging environments.</p>
            <ul style={styles.featureList}>
              <li>âœ“ 50 AI Investigations / mo</li>
              <li>âœ“ Single Microservice Scope</li>
              <li>âœ“ Amazon Bedrock AI Reasoning Engine</li>
              <li>âœ“ Standard Telemetry Support</li>
            </ul>
            <button style={styles.planButton} onClick={() => navigate("/dashboard")}>
              Get Started Free
            </button>
          </div>

          {/* Pro Plan (Featured) */}
          <div style={{ ...styles.priceCard, ...styles.priceCardFeatured }}>
            <div style={styles.popularBadge}>MOST POPULAR</div>
            <h3 style={styles.planName}>Pro SRE Team</h3>
            <div style={styles.price}>$149<span> / month</span></div>
            <p style={styles.planDesc}>For production engineering teams demanding fast MTTR.</p>
            <ul style={styles.featureList}>
              <li>✓ Unlimited AI Investigations</li>
              <li>✓ Full Multi-Service Dependency Graphs</li>
              <li>✓ Live Multi-Provider Observability (AWS, SigNoz, OTel)</li>
              <li>✓ Amazon Bedrock AI Reasoning</li>
              <li>✓ Automated Actionable Remediation</li>
            </ul>
            <button style={styles.featuredPlanButton} onClick={() => navigate("/pricing")}>
              Start Pro Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div style={styles.priceCard}>
            <h3 style={styles.planName}>Enterprise SaaS</h3>
            <div style={styles.price}>$499<span> / month</span></div>
            <p style={styles.planDesc}>Dedicated Google Cloud deployment with enterprise SLA.</p>
            <ul style={styles.featureList}>
              <li>âœ“ Dedicated GCP Cloud Run Cluster</li>
              <li>âœ“ Custom Runbook Automation</li>
              <li>âœ“ RBAC & SSO Authentication</li>
              <li>âœ“ 24/7 Priority SRE Support</li>
            </ul>
            <button style={styles.planButton} onClick={() => navigate("/pricing")}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Â© 2026 TattvaAI Inc. Autonomous Incident Investigation Platform.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
    padding: "0 2rem",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem 0",
    borderBottom: "1px solid #30363d",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  logoBadge: {
    backgroundColor: "#238636",
    color: "#ffffff",
    padding: "0.2rem 0.5rem",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "0.85rem",
  },
  logoText: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#58a6ff",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  navLink: {
    color: "#8b949e",
    textDecoration: "none",
    fontSize: "0.95rem",
  },
  navButton: {
    backgroundColor: "#238636",
    color: "#ffffff",
    border: "none",
    padding: "0.5rem 1.2rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  hero: {
    textAlign: "center",
    padding: "5rem 1rem 4rem 1rem",
    maxWidth: "900px",
    margin: "0 auto",
  },
  heroPill: {
    display: "inline-block",
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    color: "#58a6ff",
    padding: "0.4rem 1rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    marginBottom: "1.5rem",
  },
  heroTitle: {
    fontSize: "3rem",
    fontWeight: "800",
    lineHeight: "1.2",
    marginBottom: "1.2rem",
  },
  gradientText: {
    background: "linear-gradient(90deg, #58a6ff 0%, #bc8cff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtitle: {
    fontSize: "1.2rem",
    color: "#8b949e",
    lineHeight: "1.6",
    marginBottom: "2rem",
  },
  heroCtaGroup: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
  },
  primaryCta: {
    backgroundColor: "#238636",
    color: "#ffffff",
    border: "none",
    padding: "0.8rem 1.8rem",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryCta: {
    backgroundColor: "#21262d",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    padding: "0.8rem 1.8rem",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  featuresSection: {
    padding: "4rem 0",
  },
  sectionHeader: {
    textAlign: "center",
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "2.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "1.5rem",
  },
  cardIcon: {
    fontSize: "2rem",
    marginBottom: "0.8rem",
  },
  cardTitle: {
    fontSize: "1.2rem",
    marginBottom: "0.5rem",
  },
  cardDesc: {
    color: "#8b949e",
    fontSize: "0.9rem",
    lineHeight: "1.5",
  },
  pricingSection: {
    padding: "4rem 0",
    borderTop: "1px solid #30363d",
  },
  pricingSub: {
    textAlign: "center",
    color: "#8b949e",
    marginBottom: "3rem",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  priceCard: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "10px",
    padding: "2rem",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  priceCardFeatured: {
    borderColor: "#58a6ff",
    boxShadow: "0 0 20px rgba(88, 166, 255, 0.15)",
  },
  popularBadge: {
    position: "absolute",
    top: "-12px",
    right: "20px",
    backgroundColor: "#1f6beb",
    color: "#ffffff",
    fontSize: "0.75rem",
    fontWeight: "bold",
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
  },
  planName: {
    fontSize: "1.4rem",
    marginBottom: "0.5rem",
  },
  price: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#58a6ff",
    marginBottom: "0.5rem",
  },
  planDesc: {
    color: "#8b949e",
    fontSize: "0.85rem",
    marginBottom: "1.5rem",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 2rem 0",
    color: "#c9d1d9",
    fontSize: "0.9rem",
    lineHeight: "2",
  },
  planButton: {
    marginTop: "auto",
    backgroundColor: "#21262d",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    padding: "0.7rem",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
  },
  featuredPlanButton: {
    marginTop: "auto",
    backgroundColor: "#238636",
    color: "#ffffff",
    border: "none",
    padding: "0.7rem",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  footer: {
    textAlign: "center",
    padding: "2rem 0",
    color: "#8b949e",
    borderTop: "1px solid #30363d",
    marginTop: "3rem",
    fontSize: "0.85rem",
  },
};
