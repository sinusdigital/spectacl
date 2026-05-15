import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import * as nodeServeStatic from '@hono/node-server/serve-static';
import { analysisQueue } from './analysisQueue';
import { creditResetQueue } from './creditResetQueue';
import { snapshotQueue } from './snapshotQueue';

// Robustly extract serveStatic function for Next.js/Turbopack environment
const getServeStatic = () => {
  // If imported as namespace, check for named export
  if (nodeServeStatic && typeof (nodeServeStatic as any).serveStatic === 'function') {
    return (nodeServeStatic as any).serveStatic;
  }
  // Check for default export
  if (nodeServeStatic && typeof (nodeServeStatic as any).default === 'function') {
    return (nodeServeStatic as any).default;
  }
  // Fallback to the module itself if it's a function
  if (typeof nodeServeStatic === 'function') {
    return nodeServeStatic;
  }
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
