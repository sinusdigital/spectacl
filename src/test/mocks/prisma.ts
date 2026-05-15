/**
 * Shared Prisma mock for Tier 2+ tests.
 *
 * Usage in test files:
 *   vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
 *   import { mockPrisma, mockReset } from '@/test/mocks/prisma';
 *
 * Call mockReset() in beforeEach to clear all mock state.
 */
import { vi } from 'vitest';

function createMockModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn(),
  };
}

export const mockPrisma = {
  entity: createMockModel(),
  competitor: createMockModel(),
  prompt: createMockModel(),
  analysisResult: createMockModel(),
  analysisMention: createMockModel(),
  analysisLink: createMockModel(),
  suggestedCompetitor: createMockModel(),
  suggestedPrompt: createMockModel(),
  metricSnapshot: createMockModel(),
  space: createMockModel(),
  spaceMember: createMockModel(),
  user: createMockModel(),
  checkRun: createMockModel(),
  globalModel: createMockModel(),
  systemSetting: createMockModel(),
  domainCitation: createMockModel(),
  billingProfile: createMockModel(),
  invoice: createMockModel(),
  invoiceCounter: createMockModel(),
  spaceDeletionLog: createMockModel(),
  spaceInvitation: createMockModel(),
  ranking: createMockModel(),
  auditLog: createMockModel(),
  waitlistEntry: createMockModel(),
  account: createMockModel(),
  session: createMockModel(),
  modelConfig: createMockModel(),
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
  $queryRaw: vi.fn(),
};

export function mockReset() {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    } else if (typeof model === 'function' && 'mockReset' in model) {
      (model as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  // Re-wire $transaction to handle both patterns:
  // 1. Array of promises: prisma.$transaction([p1, p2, ...]) → Promise.all
  // 2. Callback function: prisma.$transaction(fn) → fn(mockPrisma)
  mockPrisma.$transaction.mockImplementation((input: unknown) => {
    if (Array.isArray(input)) return Promise.all(input);
    if (typeof input === 'function') return (input as (tx: typeof mockPrisma) => unknown)(mockPrisma);
    return Promise.resolve(input);
  });
}
