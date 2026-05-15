import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import * as nodeServeStatic from '@hono/node-server/serve-static';
import { serveStatic as serveStaticType } from '@hono/node-server/serve-static';
import { analysisQueue } from './analysisQueue';
import { creditResetQueue } from './creditResetQueue';
import { snapshotQueue } from './snapshotQueue';

// Robustly extract serveStatic function for Next.js/Turbopack environment.
// Bundlers reshape this module's exports differently in dev/prod — a named export,
// a default export, or the module itself can all be the callable.
type ServeStaticFn = typeof serveStaticType;
type ServeStaticModule =
  | ServeStaticFn
  | { serveStatic?: ServeStaticFn; default?: ServeStaticFn };

const getServeStatic = (): ServeStaticFn | null => {
  const mod = nodeServeStatic as unknown as ServeStaticModule;
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.serveStatic === 'function') return mod.serveStatic;
  if (mod && typeof mod.default === 'function') return mod.default;
  return null;
};

const ss = getServeStatic();

if (!ss) {
  throw new Error('Bull Board Error: serveStatic is not a function. Check @hono/node-server installation.');
}

const serverAdapter = new HonoAdapter(ss);
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(analysisQueue),
    new BullMQAdapter(creditResetQueue),
    new BullMQAdapter(snapshotQueue),
  ],
  serverAdapter,
});

export const bullBoardAdapter = serverAdapter;
