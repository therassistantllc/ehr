import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  WORKQUEUE_ACTION_SCREENS,
  buildRcmDashboardUiModel,
  type ActionScreenDefinition,
  type ChargeDashboardRow,
  type ClaimDashboardRow,
  type DashboardCard,
  type DashboardMetric,
  type DashboardSection,
  type RcmDashboardSnapshot,
  type UiField,
  type WorkqueueDashboardItem,
} from "../index";
import { loadDashboardData, type DashboardDataMode } from "./dashboardDataLoader";
import { mockDashboardSnapshot } from "./mockDashboardData";

type RouteKey = "dashboard" | "workqueues" | "charges" | "claims" | "actions";

type NavItem = {
  key: RouteKey;
  label: string;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "workqueues", label: "Workqueues" },
  { key: "charges", label: "Charge Capture" },
  { key: "claims", label: "Claims" },
  { key: "actions", label: "Action Screens" },
];

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className="metric-card">
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      {metric.description ? <p>{metric.description}</p> : null}
    </article>
  );
}

function WorkCard({ card }: { card: DashboardCard }) {
  return (
    <article className={`work-card ${card.severity}`}>
      <div>
        <span>{card.subtitle}</span>
        <h3>{card.title}</h3>
      </div>
      <strong>{card.count}</strong>
    </article>
  );
}

function DataStatus({ loading, mode, message }: { loading: boolean; mode: DashboardDataMode; message: string }) {
  return (
    <section className={`data-status ${mode}`}>
      <strong>{loading ? "Loading dashboard data" : mode === "supabase" ? "Live Supabase data" : "Mock dashboard data"}</strong>
      <span>{message}</span>
    </section>
  );
}

function EmptyRows({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>;
}

function WorkqueueTable({ rows }: { rows: WorkqueueDashboardItem[] }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Open Workqueues</h2>
        <p>Tasks generated from eligibility, charge capture, claims, and batch workflows.</p>
      </header>
      {rows.length === 0 ? <EmptyRows message="No open workqueue items found." /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Task</th>
                <th>Area</th>
                <th>Issue</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><span className={`pill ${row.priority}`}>{row.priority}</span></td>
                  <td>{row.title}</td>
                  <td>{titleCase(row.domain)}</td>
                  <td>{row.description ?? "—"}</td>
                  <td>{row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ChargeTable({ rows }: { rows: ChargeDashboardRow[] }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Charge Capture</h2>
        <p>Review documentation, coding, eligibility, and authorization blockers before claim creation.</p>
      </header>
      {rows.length === 0 ? <EmptyRows message="No charge-capture rows found." /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>DOS</th>
                <th>Client</th>
                <th>Provider</th>
                <th>CPT</th>
                <th>Charge</th>
                <th>Action Needed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.dateOfService ?? "—"}</td>
                  <td>{row.clientId ?? "—"}</td>
                  <td>{row.providerId ?? "—"}</td>
                  <td>{row.cptCode ?? "—"}</td>
                  <td>{currency(row.totalCharge)}</td>
                  <td>{row.actionNeeded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClaimTable({ rows }: { rows: ClaimDashboardRow[] }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Claims</h2>
        <p>Validate claims, move clean claims to batch, and track rejected or submitted claims.</p>
      </header>
      {rows.length === 0 ? <EmptyRows message="No claims found." /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>DOS</th>
                <th>Client</th>
                <th>Payer</th>
                <th>Status</th>
                <th>Charge</th>
                <th>Action Needed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.serviceDate ?? "—"}</td>
                  <td>{row.clientId ?? "—"}</td>
                  <td>{row.payerProfileId ?? "—"}</td>
                  <td><span className="pill normal">{titleCase(row.status)}</span></td>
                  <td>{currency(row.totalCharge)}</td>
                  <td>{row.actionNeeded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FieldList({ fields }: { fields: UiField[] }) {
  return (
    <ul className="field-list">
      {fields.map((field) => (
        <li key={field.key}>
          <strong>{field.label}</strong>
          <span>{titleCase(field.valueType)}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionScreenCard({ screen }: { screen: ActionScreenDefinition }) {
  return (
    <article className="screen-card">
      <span>{titleCase(screen.domain)}</span>
      <h3>{screen.title}</h3>
      <p>{screen.description}</p>
      <div className="button-row">
        <button>{screen.primaryAction.label}</button>
        {screen.secondaryActions.map((action) => <button className="secondary" key={action.key}>{action.label}</button>)}
      </div>
      {screen.sections.map((section) => (
        <section key={section.key} className="screen-section">
          <h4>{section.title}</h4>
          <p>{section.description}</p>
          <FieldList fields={section.fields} />
        </section>
      ))}
    </article>
  );
}

function Sections<T>({ sections, render, emptyMessage }: { sections: DashboardSection<T>[]; render: (rows: T[]) => ReactNode; emptyMessage: string }) {
  if (sections.length === 0) {
    return <EmptyRows message={emptyMessage} />;
  }

  return (
    <div className="section-stack">
      {sections.map((section) => (
        <section key={section.key}>
          <div className="section-title">
            <h3>{titleCase(section.title)}</h3>
            <span>{section.rows.length}</span>
          </div>
          {render(section.rows)}
        </section>
      ))}
    </div>
  );
}

function DashboardView({ uiModel }: { uiModel: ReturnType<typeof buildRcmDashboardUiModel> }) {
  return (
    <>
      <section className="hero">
        <div>
          <span>THERASSISTANT EHR</span>
          <h1>RCM Workqueue Dashboard</h1>
          <p>Eligibility, charge capture, claim validation, and batch submission queues in one operational view.</p>
        </div>
      </section>
      <section className="metrics-grid">
        {uiModel.viewModel.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
      </section>
      <section className="cards-grid">
        {uiModel.viewModel.cards.map((card) => <WorkCard key={card.key} card={card} />)}
      </section>
    </>
  );
}

export function App() {
  const [route, setRoute] = useState<RouteKey>("dashboard");
  const [snapshot, setSnapshot] = useState<RcmDashboardSnapshot>(mockDashboardSnapshot);
  const [mode, setMode] = useState<DashboardDataMode>("mock");
  const [message, setMessage] = useState("Preparing dashboard data.");
  const [loading, setLoading] = useState(true);
  const uiModel = useMemo(() => buildRcmDashboardUiModel(snapshot), [snapshot]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    loadDashboardData().then((loaded) => {
      if (!active) return;
      setSnapshot(loaded.snapshot);
      setMode(loaded.mode);
      setMessage(loaded.message);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Therassistant</strong>
          <span>EHR</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <button className={route === item.key ? "active" : ""} key={item.key} onClick={() => setRoute(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <DataStatus loading={loading} mode={mode} message={message} />
        {route === "dashboard" ? <DashboardView uiModel={uiModel} /> : null}
        {route === "workqueues" ? <WorkqueueTable rows={snapshot.workqueueItems} /> : null}
        {route === "charges" ? (
          <Sections sections={uiModel.viewModel.chargeSections} emptyMessage="No charge-capture sections found." render={(rows) => <ChargeTable rows={rows} />} />
        ) : null}
        {route === "claims" ? (
          <Sections sections={uiModel.viewModel.claimSections} emptyMessage="No claim sections found." render={(rows) => <ClaimTable rows={rows} />} />
        ) : null}
        {route === "actions" ? (
          <section className="action-grid">
            {WORKQUEUE_ACTION_SCREENS.map((screen) => <ActionScreenCard key={screen.key} screen={screen} />)}
          </section>
        ) : null}
      </main>
    </div>
  );
}
