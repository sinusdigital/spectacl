import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { invalidateInternalTaskModelCache, INTERNAL_TASK_KEYS, type InternalTaskKey } from "@/lib/internal-models";

const ALLOWED_PROVIDERS = new Set(["openai", "anthropic", "google", "mistral"]);

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }), userId: null };
    }
    return { error: null, userId: session.user.id };
}

export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    const rows = await prisma.internalTaskModel.findMany({
        orderBy: { taskKey: "asc" },
    });
    return NextResponse.json({ models: rows });
}

export async function PUT(req: NextRequest) {
    const { error, userId } = await requireAdmin();
    if (error) return error;

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { taskKey, provider, modelId, displayName, maxOutputTokens } = body ?? {};

    if (!INTERNAL_TASK_KEYS.includes(taskKey as InternalTaskKey)) {
        return NextResponse.json({ error: `Invalid taskKey: ${taskKey}` }, { status: 400 });
    }
    if (typeof provider !== "string" || !ALLOWED_PROVIDERS.has(provider.toLowerCase())) {
        return NextResponse.json({ error: `Invalid provider — must be one of ${Array.from(ALLOWED_PROVIDERS).join(", ")}` }, { status: 400 });
    }
    if (typeof modelId !== "string" || !modelId.trim()) {
        return NextResponse.json({ error: "modelId is required" }, { status: 400 });
    }
    const tokens = Number(maxOutputTokens);
    if (!Number.isFinite(tokens) || tokens < 100 || tokens > 32000) {
        return NextResponse.json({ error: "maxOutputTokens must be between 100 and 32000" }, { status: 400 });
    }

    const updated = await prisma.internalTaskModel.update({
        where: { taskKey },
        data: {
            provider: provider.toLowerCase(),
            modelId: modelId.trim(),
            displayName: typeof displayName === "string" && displayName.trim() ? displayName.trim() : null,
            maxOutputTokens: Math.round(tokens),
        },
    });

    await invalidateInternalTaskModelCache(taskKey as InternalTaskKey);

    await auditLog({
        userId: userId!,
        action: "internal_model.update",
        targetType: "InternalTaskModel",
        targetId: taskKey,
        detail: { provider: updated.provider, modelId: updated.modelId, maxOutputTokens: updated.maxOutputTokens },
    });

    return NextResponse.json({ model: updated });
}
