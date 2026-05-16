import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { processBrandSuggestions } from '@/lib/suggestions';
import { auditLog } from '@/lib/audit';

/**
 * Admin-only diagnostic: run brand-suggestion extraction synchronously for
 * the given entity against its most recent successful analysis responses.
 *
 * Returns a structured result so the admin UI can show exactly why nothing
 * gets inserted (missing LLM config, LLM parse failure, all duplicates, etc.)
 * without log-diving on the worker container.
 *
 * Query: ?limit=30 (max 100)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(_request.url);
  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '30', 10);
  const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 30), 100);

  const entity = await prisma.entity.findUnique({
    where: { id },
    select: { id: true, name: true, spaceId: true },
  });
  if (!entity) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  const recentResults = await prisma.analysisResult.findMany({
    where: {
      status: 'success',
      response: { not: '' },
      prompt: { entityId: id },
    },
    select: { response: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const contents = recentResults.map(r => r.response).filter(Boolean);
  if (contents.length === 0) {
    return NextResponse.json({
      entityId: id,
      entityName: entity.name,
      sampledResults: 0,
      result: {
        skippedReason: 'empty-input',
        brandsFound: 0,
        newSuggestions: 0,
        skippedDuplicates: 0,
      },
      note: 'No successful AnalysisResult rows with non-empty response found.',
    });
  }

  const result = await processBrandSuggestions(id, entity.name, contents);

  await auditLog({
    userId: session.user.id,
    action: 'entity.suggestions.regenerate',
    targetType: 'Entity',
    targetId: id,
    detail: { sampledResults: contents.length, ...result },
  });

  return NextResponse.json({
    entityId: id,
    entityName: entity.name,
    sampledResults: contents.length,
    result,
  });
}
