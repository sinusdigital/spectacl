import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    const version = process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown';
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            status: 'ok',
            version,
            timestamp: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({ status: 'unhealthy', version }, { status: 503 });
    }
}
