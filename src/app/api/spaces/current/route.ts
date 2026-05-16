import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current space from cookie
    const { getCurrentSpace } = await import('@/lib/spaces');
    const space = await getCurrentSpace(session.user.id);

    if (!space) {
      return NextResponse.json({ error: 'No space found' }, { status: 404 });
    }

    return NextResponse.json({
      id: space.id,
      name: space.name,
      plan: space.plan,
      slug: space.slug,
      llmProvider: space.llmProvider,
      subscriptionStatus: space.subscriptionStatus,
    });
  } catch (error) {
    console.error('Error fetching current space:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space' },
      { status: 500 }
    );
  }
}
