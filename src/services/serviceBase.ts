import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid, removeUndefined } from "../lib/supabase";

type Db = TherassistantSupabaseClient;

export type ServiceContext = {
  tenantId: string;
  actorUserId?: string | null;
};

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "status_change"
  | "access"
  | "workflow";

export type WorkqueuePriority = "low" | "normal" | "high" | "urgent";

export type WorkqueueInput = {
  type: string;
  sourceType: string;
  sourceId: string;
  priority?: WorkqueuePriority;
  assignedTo?: string | null;
  title?: string;
  description?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type StatusChangeInput = {
  targetType: string;
  targetId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

function statusColumnFor(table: string): string {
  switch (table) {
    case "charges":
      return "charge_status";
    case "claims":
      return "claim_status";
    case "claim_batches":
      return "batch_status";
    default:
      return "status";
  }
}

function workqueueSourceObjectType(sourceType: string): string {
  switch (sourceType) {
    case "clients":
      return "Clients";
    case "appointments":
      return "Appointments";
    case "charges":
      return "charge";
    case "claims":
      return "Claims";
    case "claim_batches":
      return "Claims_batch";
    case "eligibility_checks":
      return "eligibility";
    case "payments":
      return "payment";
    case "providers":
      return "Providers";
    default:
      return sourceType;
  }
}

export abstract class TherassistantService {
  protected constructor(
    protected readonly db: Db,
    protected readonly context: ServiceContext,
  ) {
    assertUuid(context.tenantId, "tenantId");

    if (context.actorUserId) {
      assertUuid(context.actorUserId, "actorUserId");
    }
  }

  protected tenantId(): string {
    return this.context.tenantId;
  }

  protected actorUserId(): string | null {
    return this.context.actorUserId ?? null;
  }

  protected statusColumn(table: string): string {
    return statusColumnFor(table);
  }

  protected scopedPayload<T extends Record<string, unknown>>(payload: T): Partial<T> & { tenant_id: string } {
    return {
      ...removeUndefined(payload),
      tenant_id: this.tenantId(),
    };
  }

  protected async insertOne<T extends TherassistantRecord>(table: string, payload: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.db
      .from(table)
      .insert(this.scopedPayload(payload))
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(`Failed to insert ${table}.`, error);
    }

    return data as T;
  }

  protected async updateOne<T extends TherassistantRecord>(table: string, id: string, payload: Record<string, unknown>): Promise<T> {
    assertUuid(id, `${table}.id`);

    const { data, error } = await this.db
      .from(table)
      .update(removeUndefined(payload))
      .eq("id", id)
      .eq("tenant_id", this.tenantId())
      .select("*")
      .single();

    if (error) {
      throw new ServiceError(`Failed to update ${table}.`, error);
    }

    return data as T;
  }

  protected async findById<T extends TherassistantRecord>(table: string, id: string): Promise<T | null> {
    assertUuid(id, `${table}.id`);

    const { data, error } = await this.db
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("tenant_id", this.tenantId())
      .maybeSingle();

    if (error) {
      throw new ServiceError(`Failed to read ${table}.`, error);
    }

    return (data as T | null) ?? null;
  }

  protected async listByTenant<T extends TherassistantRecord>(
    table: string,
    options?: { status?: string; limit?: number; orderBy?: string; ascending?: boolean },
  ): Promise<T[]> {
    let query = this.db
      .from(table)
      .select("*")
      .eq("tenant_id", this.tenantId());

    if (options?.status) {
      query = query.eq(statusColumnFor(table), options.status);
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServiceError(`Failed to list ${table}.`, error);
    }

    return (data ?? []) as T[];
  }

  protected async softDelete(table: string, id: string, reason?: string): Promise<void> {
    const previous = await this.findById(table, id);
    await this.updateOne(table, id, { archived_at: new Date().toISOString() });

    await this.writeAuditLog({
      targetType: table,
      targetId: id,
      action: "delete",
      oldValues: previous ?? undefined,
      metadata: { reason },
    });
  }

  protected async writeAuditLog(input: {
    targetType: string;
    targetId?: string | null;
    action: AuditAction;
    oldValues?: unknown;
    newValues?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<string | null> {
    const payload = {
      tenant_id: this.tenantId(),
      user_id: this.actorUserId(),
      action: input.action,
      object_type: input.targetType,
      object_id: input.targetId ?? null,
      before_value: input.oldValues ?? null,
      after_value: input.newValues ?? null,
      event_type: input.action,
      event_summary: `${input.action} ${input.targetType}`,
      event_metadata: input.metadata ?? {},
    };

    const { data, error } = await this.db
      .from("audit_logs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      throw new ServiceError("Failed to write audit log.", error);
    }

    return (data?.id as string | undefined) ?? null;
  }

  protected async writeStatusHistory(input: StatusChangeInput): Promise<void> {
    assertUuid(input.targetId, `${input.targetType}.id`);

    const { error } = await this.db.from("status_history").insert({
      tenant_id: this.tenantId(),
      object_type: input.targetType,
      object_id: input.targetId,
      previous_status: input.fromStatus ?? null,
      new_status: input.toStatus,
      status_reason: input.reason ?? null,
      changed_by_user_id: this.actorUserId(),
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw new ServiceError("Failed to write status history.", error);
    }
  }

  protected async transitionStatus<T extends TherassistantRecord>(
    table: string,
    id: string,
    toStatus: string,
    reason?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const previous = await this.findById<T>(table, id);
    const statusColumn = statusColumnFor(table);
    const updated = await this.updateOne<T>(table, id, { [statusColumn]: toStatus });

    await this.writeStatusHistory({
      targetType: table,
      targetId: id,
      fromStatus: previous ? String(previous[statusColumn] ?? "") || null : null,
      toStatus,
      reason,
      metadata,
    });

    await this.writeAuditLog({
      targetType: table,
      targetId: id,
      action: "status_change",
      oldValues: { [statusColumn]: previous?.[statusColumn] ?? null },
      newValues: { [statusColumn]: toStatus },
      metadata: { reason, ...metadata },
    });

    return updated;
  }

  protected async createWorkqueueItem(input: WorkqueueInput): Promise<TherassistantRecord> {
    assertUuid(input.sourceId, "sourceId");

    const item = await this.insertOne("workqueue_items", {
      status: "open",
      work_type: input.type,
      source_object_type: workqueueSourceObjectType(input.sourceType),
      source_object_id: input.sourceId,
      priority: input.priority ?? "normal",
      assigned_to_user_id: input.assignedTo ?? null,
      due_at: input.dueAt ?? null,
      title: input.title ?? input.type,
      description: input.description ?? null,
      context_payload: input.metadata ?? {},
    });

    await this.writeAuditLog({
      targetType: "workqueue_items",
      targetId: item.id,
      action: "create",
      newValues: item,
      metadata: { sourceType: input.sourceType, sourceId: input.sourceId },
    });

    return item;
  }
}
