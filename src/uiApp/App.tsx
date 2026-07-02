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
import { loadAppUserContext, type AppUserContext } from "./appContext";
import { loadDashboardData, resolveDashboardWorkqueueItem, type DashboardDataMode, type DashboardLoadOptions } from "./dashboardDataLoader";
import { mockDashboardSnapshot } from "./mockDashboardData";
import { LiveSettingsView } from "./settingsLiveView";

type RouteKey =
  | "settings"
  | "auth"
  | "clients"
  | "appointments"
  | "documentation"
  | "coding"
  | "charges"
  | "claims"
  | "payments"
  | "collections"
  | "workqueues"
  | "dashboard"
  | "actions";

type ScreenAction = ActionScreenDefinition["primaryAction"] | ActionScreenDefinition["secondaryActions"][number];

type NavItem = {
  key: RouteKey;
  label: string;
};

const navItems: NavItem[] = [
  { key: "settings", label: "Settings" },
  { key: "auth", label: "Login / Auth" },
  { key: "clients", label: "Clients" },
  { key: "appointments", label: "Appointments" },
  { key: "documentation", label: "Documentation" },
  { key: "coding", label: "Coding" },
  { key: "charges", label: "Charges" },
  { key: "claims", label: "Claims" },
  { key: "payments", label: "Payments" },
  { key: "collections", label: "Collections" },
  { key: "workqueues", label: "Workqueues" },
  { key: "dashboard", label: "RCM Dashboard" },
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

function routeForAction(action: ScreenAction): RouteKey {
  if (action.routeKey.startsWith("chargeCapture.")) return "charges";
  if (action.routeKey.startsWith("claims.")) return "claims";
  if (action.routeKey.startsWith("workqueue.")) return "workqueues";
  if (action.routeKey.startsWith("eligibility.")) return "workqueues";
  return "dashboard";
}

function dashboardOptions(context: AppUserContext | null): DashboardLoadOptions {
  const options: DashboardLoadOptions = {};
  if (context?.selectedTenantId) options.tenantId = context.selectedTenantId;
  if (context?.userId) options.actorUserId = context.userId;
  return options;
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

function AppContextBar({ context, onTenantChange }: { context: AppUserContext | null; onTenantChange: (tenantId: string) => void }) {
  return (
    <section className="context-bar">
      <div>
        <strong>{context?.selectedTenantName ?? "No tenant selected"}</strong>
        <span>{context?.message ?? "Loading app context."}</span>
      </div>
      <label>
        <span>Tenant</span>
        <select value={context?.selectedTenantId ?? ""} onChange={(event) => onTenantChange(event.target.value)}>
          {context?.tenants.length ? null : <option value="">No tenants available</option>}
          {context?.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
      </label>
    </section>
  );
}

function EmptyRows({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>;
}

function AuthView({ context }: { context: AppUserContext | null }) {
  return (
    <section className="page-stack">
      <section className="hero">
        <div>
          <span>Access</span>
          <h1>Login / Auth Context</h1>
          <p>Current user, selected tenant, roles, and permissions. This replaces hardcoded tenant-only development flow.</p>
        </div>
      </section>
      <section className="panel padded-panel">
        <dl className="detail-list two-column-list">
          <div><dt>Auth Mode</dt><dd>{context?.authMode ?? "loading"}</dd></div>
          <div><dt>User Email</dt><dd>{context?.email ?? "No active Supabase session"}</dd></div>
          <div><dt>User ID</dt><dd>{context?.userId ?? "—"}</dd></div>
          <div><dt>Tenant</dt><dd>{context?.selectedTenantName ?? "—"}</dd></div>
          <div><dt>Roles</dt><dd>{context?.roles.length ? context.roles.join(", ") : "Pending RBAC wiring"}</dd></div>
          <div><dt>Permissions</dt><dd>{context?.permissions.length ? context.permissions.join(", ") : "Pending RBAC wiring"}</dd></div>
        </dl>
      </section>
    </section>
  );
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="page-stack">
      <section className="hero">
        <div>
          <span>Workflow</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="panel padded-panel">
        <p className="empty-state">Next sub-batch will port the existing old-repo concepts into this workflow step and wire them to the current Supabase schema.</p>
      </section>
    </section>
  );
}

function WorkqueueTable({ rows, selectedId, onSelect }: { rows: WorkqueueDashboardItem[]; selectedId: string | null; onSelect: (item: WorkqueueDashboardItem) => void }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Open Workqueues</h2>
        <p>Tasks generated from eligibility, charge capture, claims, and batch workflows.</p>
      </header>
      {rows.length === 0 ? <EmptyRows message="No open workqueue rows exist in Supabase for this tenant right now. The app is connected, but there is nothing active to resolve." /> : (
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
        <p>If this panel is empty, Supabase currently has no active workqueue rows for the tenant you loaded.</p>
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
      {rows.length === 0 ? <EmptyRows message="No charge-capture rows found. Live Supabase currently has no charges for this tenant." /> : (
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

function ActionScreenCard({ screen, onAction }: { screen: ActionScreenDefinition; onAction: (screen: ActionScreenDefinition, action: ScreenAction) => void }) {
  return (
    <article className="screen-card">
      <span>{titleCase(screen.domain)}</span>
      <h3>{screen.title}</h3>
      <p>{screen.description}</p>
      <div className="button-row">
        <button type="button" onClick={() => onAction(screen, screen.primaryAction)}>{screen.primaryAction.label}</button>
        {screen.secondaryActions.map((action) => (
          <button className="secondary" key={action.key} type="button" onClick={() => onAction(screen, action)}>{action.label}</button>
        ))}
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
          <span>Back Office</span>
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
  const [route, setRoute] = useState<RouteKey>("settings");
  const [appContext, setAppContext] = useState<AppUserContext | null>(null);
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

  async function refreshAppContext(preferredTenantId?: string | null) {
    const loadedContext = await loadAppUserContext(preferredTenantId);
    setAppContext(loadedContext);
    return loadedContext;
  }

  async function refreshDashboard(context: AppUserContext | null) {
    setLoading(true);
    const loaded = await loadDashboardData(dashboardOptions(context));
    setSnapshot(loaded.snapshot);
    setMode(loaded.mode);
    setMessage(`${context?.message ?? "App context not loaded."} ${loaded.message}`);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    refreshAppContext().then((context) => {
      if (!active) return;
      refreshDashboard(context);
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

  async function handleTenantChange(tenantId: string) {
    const context = await refreshAppContext(tenantId);
    await refreshDashboard(context);
  }

  async function handleResolveWorkqueue() {
    if (!selectedWorkqueueItem) return;

    setResolving(true);
    setActionStatus("Resolving workqueue item...");

    try {
      if (mode === "supabase") {
        await resolveDashboardWorkqueueItem(selectedWorkqueueItem.id, resolutionNote, dashboardOptions(appContext));
        await refreshDashboard(appContext);
        setMessage(`Resolved ${selectedWorkqueueItem.title}.`);
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

  function handleActionScreenAction(screen: ActionScreenDefinition, action: ScreenAction) {
    const nextRoute = routeForAction(action);
    setRoute(nextRoute);
    setActionStatus(null);
    setMessage(`${action.label} from ${screen.title} opened ${titleCase(nextRoute)}. Live execution requires a selected source row.`);
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
        <AppContextBar context={appContext} onTenantChange={handleTenantChange} />
        <DataStatus loading={loading} mode={mode} message={message} />
        {route === "settings" ? <LiveSettingsView context={appContext} /> : null}
        {route === "auth" ? <AuthView context={appContext} /> : null}
        {route === "clients" ? <PlaceholderPage title="Clients" description="Client demographics, insurance policies, authorizations, clinical profile, ledger, documents, and notes/history." /> : null}
        {route === "appointments" ? <PlaceholderPage title="Appointments" description="Calendar, appointment status, telehealth or in-person status, client check-in, pre-session questions, On my way, and I'm here." /> : null}
        {route === "documentation" ? <PlaceholderPage title="Documentation" description="Assessments, treatment plans, session notes, Golden Thread checks, signed-note status, and clinical documentation readiness." /> : null}
        {route === "coding" ? <PlaceholderPage title="Coding" description="CPT/HCPCS selection, diagnosis linkage, units, modifiers, payer rules, and documentation-to-code validation." /> : null}
        {route === "payments" ? <PlaceholderPage title="Payments" description="ERA/EOB posting, manual posting, historical payment posting, adjustments, patient responsibility, and ledger posting." /> : null}
        {route === "collections" ? <PlaceholderPage title="Collections" description="Patient balances, statements, payment plans, collections assistance, refunds, credits, and reporting." /> : null}
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
            {WORKQUEUE_ACTION_SCREENS.map((screen) => <ActionScreenCard key={screen.key} screen={screen} onAction={handleActionScreenAction} />)}
          </section>
        ) : null}
      </main>
    </div>
  );
}
