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
  type WorkqueueSummary,
} from "../index";
import { loadDashboardData, resolveDashboardWorkqueueItem, type DashboardDataMode } from "./dashboardDataLoader";
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

function summarizeWorkqueues(items: WorkqueueDashboardItem[]): WorkqueueSummary {
  return items.reduce<WorkqueueSummary>((summary, item) => {
    summary.totalOpen += 1;
    summary.byPriority[item.priority] = (summary.byPriority[item.priority] ?? 0) + 1;
    summary.byWorkType[item.workType] = (summary.byWorkType[item.workType] ?? 0) + 1;
    return summary;
  }, { totalOpen: 0, byPriority: {}, byWorkType: {} });
}

function removeWorkqueueItem(snapshot: RcmDashboardSnapshot, workqueueItemId: string): RcmDashboardSnapshot {
  const workqueueItems = snapshot.workqueueItems.filter((item) => item.id !== workqueueItemId);
  return {
    ...snapshot,
    workqueueItems,
    workqueueSummary: summarizeWorkqueues(workqueueItems),
  };
}

function sourceRoute(item: WorkqueueDashboardItem): RouteKey | null {
  if (item.domain === "charge_capture") return "charges";
  if (item.domain === "claims" || item.domain === "claim_batches") return "claims";
  return null;
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

function WorkqueueTable({ rows, selectedId, onSelect }: { rows: WorkqueueDashboardItem[]; selectedId: string | null; onSelect: (item: WorkqueueDashboardItem) => void }) {
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className={selectedId === row.id ? "selected-row" : ""} key={row.id}>
                  <td><span className={`pill ${row.priority}`}>{row.priority}</span></td>
                  <td>{row.title}</td>
                  <td>{titleCase(row.domain)}</td>
                  <td>{row.description ?? "—"}</td>
                  <td>{row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "—"}</td>
                  <td><button className="text-button" type="button" onClick={() => onSelect(row)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function WorkqueueDetailPanel({ item, note, resolving, actionStatus, onNoteChange, onResolve, onViewSource }: {
  item: WorkqueueDashboardItem | null;
  note: string;
  resolving: boolean;
  actionStatus: string | null;
  onNoteChange: (note: string) => void;
  onResolve: () => void;
  onViewSource: () => void;
}) {
  if (!item) {
    return (
      <aside className="detail-panel">
        <h2>Workqueue Detail</h2>
        <p>Select an open workqueue item to review the source and resolve the task.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <span className={`pill ${item.priority}`}>{item.priority}</span>
        <h2>{item.title}</h2>
        <p>{item.description ?? "No description provided."}</p>
      </div>
      <dl className="detail-list">
        <div><dt>Area</dt><dd>{titleCase(item.domain)}</dd></div>
        <div><dt>Work Type</dt><dd>{titleCase(item.workType)}</dd></div>
        <div><dt>Status</dt><dd>{titleCase(item.status)}</dd></div>
        <div><dt>Source Type</dt><dd>{item.sourceObjectType}</dd></div>
        <div><dt>Source ID</dt><dd>{item.sourceObjectId}</dd></div>
        <div><dt>Due</dt><dd>{item.dueAt ? new Date(item.dueAt).toLocaleString() : "—"}</dd></div>
      </dl>
      <label className="form-field">
        <span>Resolution Note</span>
        <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Document what was corrected before resolving." />
      </label>
      <div className="button-row">
        <button type="button" onClick={onResolve} disabled={resolving}>{resolving ? "Resolving..." : "Resolve Item"}</button>
        <button className="secondary" type="button" onClick={onViewSource}>View Source</button>
      </div>
      {actionStatus ? <p className="action-status">{actionStatus}</p> : null}
    </aside>
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
  const [selectedWorkqueueId, setSelectedWorkqueueId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const uiModel = useMemo(() => buildRcmDashboardUiModel(snapshot), [snapshot]);
  const selectedWorkqueueItem = useMemo(
    () => snapshot.workqueueItems.find((item) => item.id === selectedWorkqueueId) ?? null,
    [snapshot.workqueueItems, selectedWorkqueueId],
  );

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

  useEffect(() => {
    if (selectedWorkqueueId && !selectedWorkqueueItem) {
      setSelectedWorkqueueId(null);
      setResolutionNote("");
    }
  }, [selectedWorkqueueId, selectedWorkqueueItem]);

  async function handleResolveWorkqueue() {
    if (!selectedWorkqueueItem) return;

    setResolving(true);
    setActionStatus("Resolving workqueue item...");

    try {
      if (mode === "supabase") {
        await resolveDashboardWorkqueueItem(selectedWorkqueueItem.id, resolutionNote);
        const loaded = await loadDashboardData();
        setSnapshot(loaded.snapshot);
        setMode(loaded.mode);
        setMessage(`Resolved ${selectedWorkqueueItem.title}. ${loaded.message}`);
      } else {
        setSnapshot((current) => removeWorkqueueItem(current, selectedWorkqueueItem.id));
        setMessage(`Resolved ${selectedWorkqueueItem.title} locally in mock mode.`);
      }

      setSelectedWorkqueueId(null);
      setResolutionNote("");
      setActionStatus("Resolved.");
    } catch (error) {
      const status = error instanceof Error ? error.message : "Unknown resolve error.";
      setActionStatus(status);
    } finally {
      setResolving(false);
    }
  }

  function handleSelectWorkqueue(item: WorkqueueDashboardItem) {
    setRoute("workqueues");
    setSelectedWorkqueueId(item.id);
    setResolutionNote("");
    setActionStatus(null);
  }

  function handleViewSource() {
    if (!selectedWorkqueueItem) return;
    const nextRoute = sourceRoute(selectedWorkqueueItem);
    if (nextRoute) setRoute(nextRoute);
    setActionStatus(nextRoute ? "Showing related source queue." : "This source type does not have a dedicated screen yet.");
  }

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
        {route === "workqueues" ? (
          <section className="workqueue-layout">
            <WorkqueueTable rows={snapshot.workqueueItems} selectedId={selectedWorkqueueId} onSelect={handleSelectWorkqueue} />
            <WorkqueueDetailPanel
              item={selectedWorkqueueItem}
              note={resolutionNote}
              resolving={resolving}
              actionStatus={actionStatus}
              onNoteChange={setResolutionNote}
              onResolve={handleResolveWorkqueue}
              onViewSource={handleViewSource}
            />
          </section>
        ) : null}
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
