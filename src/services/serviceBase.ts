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
    case "claims":
    case "appointments":
    case "workqueue_items":
      return "status";
    case "claim_batches":
      return "batch_status";
    default:
      return "status";
  }
}

function workqueueSourceObjectType(sourceType: string): string {
  switch (sourceType) {
    case "clients":
      return "client";
    case "appointments":
      return "appointment";
    case "charges":
      return "charge";
    case "claims":
      return "claim";
    case "claim_batches":
      return "claim_batch";
    case "eligibility_checks":
      return "eligibility";
    case "payments":
      return "payment";
    case "providers":
      return "provider";
    default:
      return sourceType;
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
      .eq("tenant_id", this.tenantId())
      .is("deleted_at", null);

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
    await this.updateOne(table, id, { deleted_at: new Date().toISOString() });

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
    const metadata = {
      ...(input.metadata ?? {}),
      tenant_id: this.tenantId(),
      actor_user_id: this.actorUserId(),
    };

    const rpcResult = await this.db.rpc("write_audits_log", {
      p_target_type: input.targetType,
      p_target_id: input.targetId ?? null,
      p_action: input.action,
      p_old_values: input.oldValues ?? null,
      p_new_values: input.newValues ?? null,
      p_metadata: metadata,
    });

    if (!rpcResult.error) {
      return (rpcResult.data as string | null | undefined) ?? null;
    }

    const { data, error } = await this.db
      .from("audits_logs")
      .insert({
        tenant_id: this.tenantId(),
        actor_user_id: this.actorUserId(),
        target_type: input.targetType,
        target_id: input.targetId ?? null,
        action: input.action,
        old_values: input.oldValues ?? null,
        new_values: input.newValues ?? null,
        metadata,
      })
      .select("id")
      .single();

    if (error) {
      throw new ServiceError("Failed to write audit log.", { rpcError: rpcResult.error, insertError: error });
    }

    return (data?.id as string | undefined) ?? null;
  }

  protected async writeStatusHistory(input: StatusChangeInput): Promise<void> {
    assertUuid(input.targetId, `${input.targetType}.id`);

    const { error } = await this.db.from("status_history").insert({
      tenant_id: this.tenantId(),
      actor_user_id: this.actorUserId(),
      target_type: input.targetType,
      target_id: input.targetId,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus,
      reason: input.reason ?? null,
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
      reason: reason ?? null,
      metadata: metadata ?? {},
    });

    await this.writeAuditLog({
      targetType: table,
      targetId: id,
      action: "status_change",
      oldValues: { [statusColumn]: previous?.[statusColumn] ?? null },
      newValues: { [statusColumn]: toStatus },
      metadata: { reason: reason ?? null, ...(metadata ?? {}) },
    });

    return updated;
  }

  protected async createWorkqueueItem(input: WorkqueueInput): Promise<TherassistantRecord> {
    assertUuid(input.sourceId, "sourceId");

    const sourceType = workqueueSourceObjectType(input.sourceType);
    const metadata = objectValue(input.metadata);
    const item = await this.insertOne("workqueue_items", {
      name: input.title ?? input.type,
      status: "open",
      description: input.description ?? null,
      workqueue_type: input.type,
      source_type: sourceType,
      source_id: input.sourceId,
      priority: input.priority ?? "normal",
      assigned_to: input.assignedTo ?? null,
      due_at: input.dueAt ?? null,
      data: {
        ...metadata,
        sourceTable: input.sourceType,
      },
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
