import { useEffect, useState } from "react";
import { type AppUserContext, type SettingsSummary } from "./appContext";
import { loadSettingsDetail, type SettingsDetailSnapshot } from "./settingsDataLoader";

const emptySummary: SettingsSummary = {
  practices: 0,
  providers: 0,
  payers: 0,
  payerProfiles: 0,
  systemSettings: 0,
};

function SummaryGrid({ summary }: { summary: SettingsSummary }) {
  const rows = [
    ["Practices", summary.practices],
    ["Providers", summary.providers],
    ["Payers", summary.payers],
    ["Payer Profiles", summary.payerProfiles],
    ["System Settings", summary.systemSettings],
  ] as const;

  return (
    <section className="metrics-grid">
      {rows.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function SettingsTable({ title, description, rows, columns, emptyMessage }: {
  title: string;
  description: string;
  rows: Array<Record<string, string | number | boolean | null>>;
  columns: Array<{ key: string; label: string }>;
  emptyMessage: string;
}) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {rows.length === 0 ? <p className="empty-state">{emptyMessage}</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  {columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function mapDetails(details: SettingsDetailSnapshot) {
  return {
    practices: details.practices.map((row) => ({
      id: row.id,
      legalName: row.legalName,
      dbaName: row.dbaName,
      practiceType: row.practiceType,
      status: row.status,
      npi: row.npi,
      billingEmail: row.billingEmail,
    })),
    providers: details.providers.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      providerType: row.providerType,
      credentialDisplay: row.credentialDisplay,
      status: row.status,
      email: row.email,
    })),
    payers: details.payers.map((row) => ({
      id: row.id,
      payerName: row.payerName,
      payerId: row.payerId,
      payerCategory: row.payerCategory,
      archived: row.archivedAt ? "Archived" : "Active",
    })),
    payerProfiles: details.payerProfiles.map((row) => ({
      id: row.id,
      payerName: row.payerName,
      availityPayerId: row.availityPayerId,
      payerType: row.payerType,
      contractStatus: row.contractStatus,
      active: row.isActive ? "Yes" : "No",
    })),
    systemSettings: details.systemSettings.map((row) => ({
      id: row.id,
      settingKey: row.settingKey,
      settingScope: row.settingScope,
      sensitive: row.isSensitive ? "Yes" : "No",
      description: row.description,
    })),
  };
}

export function LiveSettingsView({ context }: { context: AppUserContext | null }) {
  const [details, setDetails] = useState<SettingsDetailSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadSettingsDetail(context?.selectedTenantId).then((loaded) => {
      if (!active) return;
      setDetails(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [context?.selectedTenantId]);

  const mapped = mapDetails(details ?? { practices: [], providers: [], payers: [], payerProfiles: [], systemSettings: [], message: "Loading settings detail." });

  return (
    <section className="page-stack">
      <section className="hero">
        <div>
          <span>Foundation</span>
          <h1>Settings</h1>
          <p>Tenant setup comes first. This page now shows live read-only setup data for the selected tenant.</p>
        </div>
      </section>
      <SummaryGrid summary={context?.settingsSummary ?? emptySummary} />
      <section className="data-status supabase">
        <strong>{loading ? "Loading settings detail" : "Settings detail"}</strong>
        <span>{details?.message ?? "Loading settings detail."}</span>
      </section>
      <SettingsTable
        title="Practice Identity"
        description="Legal names, DBA names, NPI, status, and billing contact details."
        rows={mapped.practices}
        columns={[{ key: "legalName", label: "Legal Name" }, { key: "dbaName", label: "DBA" }, { key: "practiceType", label: "Type" }, { key: "status", label: "Status" }, { key: "npi", label: "NPI" }, { key: "billingEmail", label: "Billing Email" }]}
        emptyMessage="No practice identity rows exist for this tenant yet."
      />
      <SettingsTable
        title="Providers"
        description="Rendering provider setup rows tied to the selected tenant."
        rows={mapped.providers}
        columns={[{ key: "displayName", label: "Provider" }, { key: "providerType", label: "Type" }, { key: "credentialDisplay", label: "Credentials" }, { key: "status", label: "Status" }, { key: "email", label: "Email" }]}
        emptyMessage="No provider rows exist for this tenant yet."
      />
      <SettingsTable
        title="Payers"
        description="Payer master rows used by eligibility, policies, claims, and payment workflows."
        rows={mapped.payers}
        columns={[{ key: "payerName", label: "Payer" }, { key: "payerId", label: "Payer ID" }, { key: "payerCategory", label: "Category" }, { key: "archived", label: "State" }]}
        emptyMessage="No payer rows exist for this tenant yet."
      />
      <SettingsTable
        title="Payer Profiles"
        description="Tenant-specific payer configuration and contracting rows."
        rows={mapped.payerProfiles}
        columns={[{ key: "payerName", label: "Payer" }, { key: "availityPayerId", label: "Availity ID" }, { key: "payerType", label: "Type" }, { key: "contractStatus", label: "Contract" }, { key: "active", label: "Active" }]}
        emptyMessage="No payer profile rows exist for this tenant yet."
      />
      <SettingsTable
        title="System Settings"
        description="Tenant-scoped configuration keys currently stored in Supabase."
        rows={mapped.systemSettings}
        columns={[{ key: "settingKey", label: "Setting Key" }, { key: "settingScope", label: "Scope" }, { key: "sensitive", label: "Sensitive" }, { key: "description", label: "Description" }]}
        emptyMessage="No system settings exist for this tenant yet."
      />
    </section>
  );
}
