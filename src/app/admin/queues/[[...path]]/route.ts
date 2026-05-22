import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { bullBoardAdapter } from '@/lib/queue/bull-board';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
const app = new Hono<{ Variables: { session: Session } }>().basePath('/admin/queues');

// Diagnostic route
app.get('/health', (c) => c.json({ status: 'ok', session: !!c.get('session') }));

// Auth middleware for Bull Board
app.use('*', async (c, next) => {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session || session.user.role !== "ADMIN") {
    return c.text('Unauthorized', 401);
  }
  
  c.set('session', session);
  await next();
});

// Mount Bull Board
app.route('/', bullBoardAdapter.registerPlugin());

export const GET = handle(app);
export const POST = handle(app);
