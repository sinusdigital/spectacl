import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface AuditLogParams {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}

/**
 * Write an admin audit log entry. Best-effort — never throws.
 * Call after the mutation succeeds, before returning the response.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        detail: (params.detail as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    console.error("[Audit] Failed to write log:", err);
  }
}
