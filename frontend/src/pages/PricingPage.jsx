import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PricingPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("Pro");
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const handleSubscribe = (planName) => {
    setSelectedPlan(planName);
    setCheckoutSuccess(true);
    setTimeout(() => {
      setCheckoutSuccess(false);
      navigate("/dashboard");
    }, 2000);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          â† Back to Dashboard
        </button>
        <h1 style={styles.title}>Simple, Transparent Pricing</h1>
        <p style={styles.subtitle}>Choose the plan that fits your engineering team's scale.</p>

        {/* Monthly / Annual Toggle */}
        <div style={styles.toggleContainer}>
          <span style={billingInterval === "monthly" ? styles.activeToggle : styles.inactiveToggle} onClick={() => setBillingInterval("monthly")}>
            Monthly Billing
          </span>
          <span style={billingInterval === "annual" ? styles.activeToggle : styles.inactiveToggle} onClick={() => setBillingInterval("annual")}>
            Annual Billing <span style={styles.saveBadge}>SAVE 20%</span>
          </span>
        </div>
      </header>

      {checkoutSuccess && (
        <div style={styles.successBanner}>
          ðŸŽ‰ Subscription successfully activated! Redirecting to Dashboard...
        </div>
      )}

      <div style={styles.grid}>
        {/* Starter Plan */}
        <div style={styles.card}>
          <h2 style={styles.planTitle}>Developer</h2>
          <p style={styles.planDesc}>For individual developers and trial evaluation.</p>
          <div style={styles.price}>
            {billingInterval === "monthly" ? "$0" : "$0"}
            <span style={styles.period}>/month</span>
          </div>
          <ul style={styles.list}>
            <li>âœ” 50 AI Investigations / month</li>
            <li>âœ” 1 Microservice Scope</li>
            <li>âœ” Standard Heuristic AI Engine</li>
            <li>âœ” Community Discord Support</li>
          </ul>
          <button style={styles.buttonOutline} onClick={() => handleSubscribe("Developer")}>
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div style={{ ...styles.card, ...styles.featuredCard }}>
          <div style={styles.badge}>RECOMMENDED</div>
          <h2 style={styles.planTitle}>Pro SRE Team</h2>
          <p style={styles.planDesc}>For fast-growing engineering teams with production workloads.</p>
          <div style={styles.price}>
            {billingInterval === "monthly" ? "$149" : "$119"}
            <span style={styles.period}>/month</span>
          </div>
          <ul style={styles.list}>
            <li>✔ Unlimited AI Investigations</li>
            <li>✔ Multi-Service Dependency Graphs</li>
            <li>✔ Amazon Bedrock AI Reasoning</li>
            <li>✔ Live Multi-Provider Observability (AWS, SigNoz, OTel)</li>
            <li>✔ Real-Time Evidence Mapping</li>
            <li>✔ Human Review Audit Persistence</li>
          </ul>
          <button style={styles.buttonPrimary} onClick={() => handleSubscribe("Pro SRE Team")}>
            Upgrade to Pro
          </button>
        </div>

        {/* Enterprise Plan */}
        <div style={styles.card}>
          <h2 style={styles.planTitle}>Enterprise SaaS</h2>
          <p style={styles.planDesc}>For large enterprises needing dedicated GCP deployment & SLAs.</p>
          <div style={styles.price}>
            {billingInterval === "monthly" ? "$499" : "$399"}
            <span style={styles.period}>/month</span>
          </div>
          <ul style={styles.list}>
            <li>âœ” Dedicated Google Cloud Run Instance</li>
            <li>âœ” GCP Secret Manager Integration</li>
            <li>âœ” Custom Runbook & Remediation Scripts</li>
            <li>âœ” Dedicated Account Manager</li>
            <li>âœ” 99.9% Uptime SLA</li>
          </ul>
          <button style={styles.buttonOutline} onClick={() => handleSubscribe("Enterprise SaaS")}>
            Contact Enterprise Sales
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    backgroundColor: "#0d1117",
    color: "#c9d1d9",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  backButton: {
    backgroundColor: "transparent",
    color: "#58a6ff",
    border: "none",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "2.5rem",
    color: "#ffffff",
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: "1.1rem",
  },
  toggleContainer: {
    display: "inline-flex",
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "20px",
    padding: "0.3rem",
    marginTop: "1.5rem",
    gap: "0.5rem",
  },
  activeToggle: {
    backgroundColor: "#1f6beb",
    color: "#ffffff",
    padding: "0.4rem 1rem",
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
  inactiveToggle: {
    color: "#8b949e",
    padding: "0.4rem 1rem",
    borderRadius: "15px",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  saveBadge: {
    backgroundColor: "#238636",
    color: "#ffffff",
    fontSize: "0.7rem",
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
    marginLeft: "0.3rem",
  },
  successBanner: {
    backgroundColor: "#238636",
    color: "#ffffff",
    textAlign: "center",
    padding: "1rem",
    borderRadius: "8px",
    maxWidth: "800px",
    margin: "0 auto 2rem auto",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "2rem",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  card: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "10px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
  },
  featuredCard: {
    borderColor: "#1f6beb",
    position: "relative",
  },
  badge: {
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
  planTitle: {
    fontSize: "1.5rem",
    color: "#ffffff",
    marginBottom: "0.5rem",
  },
  planDesc: {
    color: "#8b949e",
    fontSize: "0.85rem",
    marginBottom: "1.5rem",
  },
  price: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: "1.5rem",
  },
  period: {
    fontSize: "1rem",
    color: "#8b949e",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 2rem 0",
    fontSize: "0.9rem",
    lineHeight: "2.2",
    color: "#c9d1d9",
  },
  buttonOutline: {
    marginTop: "auto",
    backgroundColor: "#21262d",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    padding: "0.8rem",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "pointer",
  },
  buttonPrimary: {
    marginTop: "auto",
    backgroundColor: "#238636",
    color: "#ffffff",
    border: "none",
    padding: "0.8rem",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
