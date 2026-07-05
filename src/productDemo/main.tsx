import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type PersonaKey = "owner" | "clinician" | "biller" | "patient" | "billingCompany";

type Persona = {
  key: PersonaKey;
  label: string;
  lens: string;
  caresAbout: string[];
};

type DemoStep = {
  key: string;
  number: string;
  eyebrow: string;
  title: string;
  promise: string;
  problem: string;
  demoScript: string;
  proofPoints: string[];
  screenHighlights: string[];
  visibleTo: PersonaKey[];
  metrics: { label: string; value: string; note: string }[];
};

const personas: Persona[] = [
  {
    key: "owner",
    label: "Practice Owner",
    lens: "Can I run an independent behavioral health practice without losing control of billing, compliance, and client experience?",
    caresAbout: ["cash flow", "clean operations", "provider autonomy", "visibility"],
  },
  {
    key: "clinician",
    label: "Clinician",
    lens: "Can I walk into session prepared, document against the treatment plan, and avoid billing cleanup later?",
    caresAbout: ["session prep", "Golden Thread", "low-friction notes", "client context"],
  },
  {
    key: "biller",
    label: "Biller / RCM Specialist",
    lens: "Can I see exactly what blocks a claim and resolve it before it becomes a denial?",
    caresAbout: ["claim readiness", "payer rules", "workqueues", "payment posting"],
  },
  {
    key: "patient",
    label: "Patient / Client",
    lens: "Can I share what matters before session, see my balance, and stay connected without confusing the clinical record?",
    caresAbout: ["portal clarity", "check-ins", "journal entries", "financial transparency"],
  },
  {
    key: "billingCompany",
    label: "Billing Company",
    lens: "Can one team support multiple practices without mixing access, files, claims, or financial data?",
    caresAbout: ["cross-practice access", "tenant controls", "document routing", "multi-client reporting"],
  },
];

const demoSteps: DemoStep[] = [
  {
    key: "portal-check-in",
    number: "01",
    eyebrow: "Patient Portal",
    title: "Client completes a pre-session check-in and journal update",
    promise: "Client-submitted context reaches the provider before session without becoming signed clinical documentation automatically.",
    problem: "Most EHRs treat client messages, forms, and notes as disconnected artifacts. Therapists still walk into session searching for context.",
    demoScript:
      "Start in the portal view. The client confirms insurance, answers the short pre-session focus question, rates distress, flags whether there are safety concerns, and shares an optional journal entry tied to a treatment goal.",
    proofPoints: [
      "Client voice is captured before session.",
      "Safety-related responses are clearly flagged for provider review.",
      "Journal content remains labeled as client-submitted until a provider reviews it.",
    ],
    screenHighlights: ["Pre-session focus", "Distress rating", "Goal-linked journal", "Safety flag review"],
    visibleTo: ["patient", "clinician", "owner"],
    metrics: [
      { label: "Check-in status", value: "Complete", note: "Ready before appointment" },
      { label: "Distress", value: "6 / 10", note: "Visible on provider prep" },
      { label: "Safety", value: "Review", note: "Flagged, not auto-cleared" },
    ],
  },
  {
    key: "pre-session-dashboard",
    number: "02",
    eyebrow: "Clinical Prep",
    title: "Provider opens the Pre-Session Dashboard",
    promise: "The clinician sees the client’s current focus, prior plan, active goals, journal entries, and safety indicators in one clinical view.",
    problem: "Therapists waste time piecing together the last note, treatment plan, messages, and intake history right before session.",
    demoScript:
      "Switch to the provider view. Show how the dashboard answers one question: what do I need to know before starting this session? Open the active goal and prior-session plan next to the client’s latest check-in.",
    proofPoints: [
      "Clinical preparation is separate from billing readiness.",
      "The Golden Thread is visible before the note is written.",
      "Client-submitted material can be imported only after provider review.",
    ],
    screenHighlights: ["Active treatment goal", "Prior session plan", "Recent journal", "Import-to-note preview"],
    visibleTo: ["clinician", "owner"],
    metrics: [
      { label: "Active goals", value: "3", note: "One selected for today" },
      { label: "Journal entries", value: "2", note: "Shared since last visit" },
      { label: "Prep time", value: "< 2 min", note: "Focused session snapshot" },
    ],
  },
  {
    key: "documentation-to-charge",
    number: "03",
    eyebrow: "Documentation + Coding",
    title: "Signed note becomes a charge only after validation",
    promise: "THERASSISTANT EHR connects documentation, goals, diagnosis, CPT/HCPCS code, units, modifiers, and payer-specific readiness checks.",
    problem: "Billing teams often discover missing time, missing diagnosis, invalid codes, or authorization gaps after the session is already billed incorrectly.",
    demoScript:
      "Open the documentation-to-billing validation panel. Show the note support for 90837, the linked goal, the diagnosis pointer, and the readiness rule that blocks a claim when authorization is missing.",
    proofPoints: [
      "Time-based psychotherapy codes require time support.",
      "Goal alignment is checked before the charge moves forward.",
      "Blocked charges become workqueue items instead of hidden billing problems.",
    ],
    screenHighlights: ["Code validation", "Goal link", "Diagnosis pointer", "Authorization blocker"],
    visibleTo: ["clinician", "biller", "owner"],
    metrics: [
      { label: "Claim readiness", value: "Blocked", note: "Missing authorization" },
      { label: "Code", value: "90837", note: "Time supported" },
      { label: "Goal link", value: "Present", note: "Golden Thread intact" },
    ],
  },
  {
    key: "workqueue-resolution",
    number: "04",
    eyebrow: "RCM Workqueues",
    title: "Biller resolves issues before claim submission",
    promise: "Eligibility, charge capture, claim validation, payer rules, and batching feed clear operational workqueues.",
    problem: "Traditional billing cleanup happens through spreadsheets, portal downloads, email threads, and memory. That is slow and error-prone.",
    demoScript:
      "Move to the RCM dashboard. Filter urgent workqueues, open the blocked charge, review the reason, add a resolution note, and return the charge to claim-ready status.",
    proofPoints: [
      "Each item has a source object, owner, due date, priority, and next action.",
      "Resolution notes are captured for auditability.",
      "The dashboard separates charge problems from claim, eligibility, and batch problems.",
    ],
    screenHighlights: ["Urgent queue", "Source object", "Resolution note", "Claim-ready update"],
    visibleTo: ["biller", "billingCompany", "owner"],
    metrics: [
      { label: "Open items", value: "14", note: "Across RCM queues" },
      { label: "Urgent", value: "4", note: "Due within 24 hours" },
      { label: "Clean claims", value: "92%", note: "Demo target" },
    ],
  },
  {
    key: "mailroom-denial",
    number: "05",
    eyebrow: "Mailroom",
    title: "Payer mail is routed, linked, and worked",
    promise: "Mailroom turns payer letters, EOBs, denial letters, refund requests, and credentialing notices into structured, searchable, actionable records.",
    problem: "Paper mail and PDF attachments get lost in email, screenshots, payer portals, downloads, and disconnected folders.",
    demoScript:
      "Upload a denial letter. Index the payer, client, claim number, CARC, due date, and document type. Route it to the denial workqueue and link it back to the claim and client ledger.",
    proofPoints: [
      "Documents can be linked once and referenced from multiple records.",
      "A denial letter becomes a workqueue item, not just a file.",
      "Credentialing, refund, and payer correspondence can follow the same control process.",
    ],
    screenHighlights: ["Document type", "Payer metadata", "Claim link", "Denial workqueue"],
    visibleTo: ["biller", "billingCompany", "owner"],
    metrics: [
      { label: "Document status", value: "Routed", note: "Assigned to denial queue" },
      { label: "Linked records", value: "3", note: "Claim, client, payer" },
      { label: "Due date", value: "10 days", note: "Appeal clock visible" },
    ],
  },
  {
    key: "ledger-reporting",
    number: "06",
    eyebrow: "Payments + Reporting",
    title: "Payments post to the ledger, including historical activity",
    promise: "Claim payments, patient payments, adjustments, refunds, credits, and historical transactions land in one financial source of truth.",
    problem: "Practices often migrate with old balances and prior payments that do not have matching claims in the new system.",
    demoScript:
      "Show an ERA payment, a patient responsibility transfer, and a historical opening balance posting. Then open reporting to show AR aging, clean claim rate, denial categories, and provider month-end totals.",
    proofPoints: [
      "Historical payment posting preserves prior financial history without recreating old claims.",
      "Ledger transactions can link to claims, clients, payers, documents, and import batches.",
      "Reports tell the owner what changed and what needs action.",
    ],
    screenHighlights: ["ERA posting", "Client balance", "Historical transaction", "Month-end report"],
    visibleTo: ["owner", "biller", "billingCompany"],
    metrics: [
      { label: "AR over 90", value: "$8.4k", note: "Actionable aging" },
      { label: "Historical ledger", value: "$2.1k", note: "No recreated claim needed" },
      { label: "Denials", value: "5.2%", note: "By category" },
    ],
  },
];

const salesFlow = [
  "Open with the pain: behavioral health teams are forced to work across an EHR, payer portals, spreadsheets, email, PDFs, and billing software.",
  "Show the connection: client check-in, provider prep, documentation, charge capture, claims, payment posting, Mailroom, and reports are one operational chain.",
  "Land the difference: THERASSISTANT EHR is not a generic chart. It is a behavioral-health operating system for clinical care plus revenue cycle control.",
];

function App() {
  const [activeStepKey, setActiveStepKey] = useState(demoSteps[0]?.key ?? "");
  const [personaKey, setPersonaKey] = useState<PersonaKey>("owner");

  const activeStep = useMemo(
    () => demoSteps.find((step) => step.key === activeStepKey) ?? demoSteps[0],
    [activeStepKey],
  );
  const activePersona = useMemo(
    () => personas.find((persona) => persona.key === personaKey) ?? personas[0],
    [personaKey],
  );

  if (!activeStep || !activePersona) {
    throw new Error("Product demo content failed to load.");
  }

  const visibleSteps = demoSteps.filter((step) => step.visibleTo.includes(personaKey));

  return (
    <main className="demo-shell">
      <section className="demo-hero">
        <div>
          <p className="eyebrow">THERASSISTANT EHR Product Demo</p>
          <h1>One connected behavioral health workflow from client voice to clean revenue.</h1>
          <p>
            A guided product demo for showing how THERASSISTANT EHR connects clinical preparation, documentation,
            charge capture, claims, Mailroom, payment posting, historical ledger activity, and executive reporting.
          </p>
        </div>
        <aside className="hero-card">
          <span>Demo position</span>
          <strong>Behavioral health EHR + RCM workspace</strong>
          <p>Built for independent clinicians, group practices, and billing companies supporting multiple practices.</p>
        </aside>
      </section>

      <section className="persona-panel">
        <div>
          <p className="eyebrow">Choose buyer lens</p>
          <h2>{activePersona.label}</h2>
          <p>{activePersona.lens}</p>
        </div>
        <div className="persona-buttons" role="group" aria-label="Demo persona">
          {personas.map((persona) => (
            <button
              type="button"
              key={persona.key}
              className={persona.key === personaKey ? "selected" : ""}
              onClick={() => setPersonaKey(persona.key)}
            >
              {persona.label}
            </button>
          ))}
        </div>
      </section>

      <section className="demo-grid">
        <aside className="demo-nav" aria-label="Product demo steps">
          <p className="eyebrow">Demo path</p>
          {demoSteps.map((step) => (
            <button
              key={step.key}
              type="button"
              className={step.key === activeStep.key ? "active" : ""}
              onClick={() => setActiveStepKey(step.key)}
            >
              <span>{step.number}</span>
              <strong>{step.title}</strong>
              <small>{step.eyebrow}</small>
            </button>
          ))}
        </aside>

        <section className="demo-stage">
          <div className="stage-heading">
            <p className="eyebrow">{activeStep.eyebrow}</p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.promise}</p>
          </div>

          <div className="mock-screen" aria-label={`${activeStep.title} mock screen`}>
            <header>
              <div>
                <span>Live demo screen</span>
                <strong>{activeStep.eyebrow}</strong>
              </div>
              <small>{activeStep.number} / 06</small>
            </header>
            <div className="mock-metrics">
              {activeStep.metrics.map((metric) => (
                <article key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </article>
              ))}
            </div>
            <div className="highlight-list">
              {activeStep.screenHighlights.map((highlight) => (
                <div key={highlight}>
                  <span aria-hidden="true">✓</span>
                  <strong>{highlight}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="talk-track-grid">
            <article>
              <h3>Problem to name</h3>
              <p>{activeStep.problem}</p>
            </article>
            <article>
              <h3>What to show</h3>
              <p>{activeStep.demoScript}</p>
            </article>
            <article>
              <h3>Proof points</h3>
              <ul>
                {activeStep.proofPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <aside className="buyer-lens">
          <p className="eyebrow">Persona lens</p>
          <h3>{activePersona.label}</h3>
          <p>{activePersona.lens}</p>
          <ul>
            {activePersona.caresAbout.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="visible-list">
            <strong>Most relevant demo moments</strong>
            {visibleSteps.map((step) => (
              <button key={step.key} type="button" onClick={() => setActiveStepKey(step.key)}>
                {step.number}. {step.eyebrow}
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="sales-script">
        <div>
          <p className="eyebrow">Narrative</p>
          <h2>Sales flow</h2>
        </div>
        {salesFlow.map((line, index) => (
          <article key={line}>
            <span>{index + 1}</span>
            <p>{line}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

const rootElement = document.getElementById("product-demo-root");

if (!rootElement) {
  throw new Error("Missing product demo root element.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
