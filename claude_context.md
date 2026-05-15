# Spectacl - Antigravity Handoff to Claude

**Date:** 2026-02-12
**Status:** Phase 1-3 Complete, ready for Phase 4.

1.  **Admin Settings Page**:
    - Created `/admin/settings` (protected route).
    - Implemented `AdminSettings` component with tabs: General, AI Configuration, Space Tiers, Feature Flags.
    - Added checks to ensure only users with `ADMIN` role can access.

2.  **Global AI Configuration**:
    - Added `SystemSetting` model to Prisma schema (key-value store).
    - Created `/api/admin/settings` endpoint to read/write settings.
    - Added fields in Admin UI to configure:
      - `pi_ai_provider` (OpenAI, Anthropic, Google, Mistral)
      - `pi_ai_model` (e.g., gpt-4)
      - `pi_ai_api_key` (optional override)
    - Added `enable_pi_ai_adapter` feature flag toggle.

3.  **Space Tiers Visualization**:
    - Added "Space Tiers" tab in Admin Settings.
    - Visualizes `PLAN_LIMITS` from `src/lib/billing/plans.ts` in a table.

4.  **UI/UX Improvements**:
    - Refactored `AdminLayout` to be cleaner.
    - Refactored `RadixDemoPage` to use a multi-column masonry layout and left-aligned header.

## Current State

- **Database**: `SystemSetting` table exists and is populated with initial settings.
- **Frontend**: Admin UI is fully functional for reading/writing these settings.
- **Backend**:
  - `src/lib/settings.ts` helper exists.
  - `src/app/api/admin/settings/route.ts` API exists.
  - **Pending**: The actual integration of `pi-ai` in the LLM factory.

## Remaining Tasks (Phase 4)

The next step is to actually _use_ the configuration we've built.

1.  **Install Package**:
    `npm install @mariozechner/pi-ai`

2.  **Create Adapter**:
    Create a new adapter class that implements the internal `LLMProvider` interface but wraps `@mariozechner/pi-ai`.

3.  **Refactor Factory**:
    Update `src/lib/llm/factory.ts` (or equivalent) to:
    - Check `SystemSettings.get('enable_pi_ai_adapter')`.
    - If true, instantiate and return the Pi-AI adapter using config from `SystemSettings`.
    - If false, return the legacy provider.

4.  **Verification**:
    - Enable the toggle in Admin.
    - Run a prompt.
    - Verify it routes through `pi-ai`.

## Relevant Files

- `src/app/admin/settings/page.tsx`
- `src/components/Admin/AdminSettings.tsx`
- `src/lib/settings.ts`
- `src/app/api/admin/settings/route.ts`
- `prisma/schema.prisma`
- `src/lib/billing/plans.ts`

## Implementation Plan Snapshot

```markdown
# Implementation Plan - Phased Migration to @mariozechner/pi-ai

### Phase 1: Product Admin Settings Page [COMPLETE]

- [x] Create AdminLayout and AdminPage structure
- [x] Implement AdminSettings component with tabs
- [x] Secure route (check for admin role/permissions)

### Phase 2: LLM Route Toggle [COMPLETE]

- [x] Add database model/field for system settings
- [x] Create SystemSettings service
- [x] Add toggle in Admin UI to switch LLM provider

### Phase 3: Global pi-ai Configuration [COMPLETE]

- [x] Add configuration fields for pi-ai (Provider, API Key, Model) in Admin UI
- [x] Implement backend storage for these configs
- [x] Add "Space Tiers" tab to Admin Settings

### Phase 4: Enable pi-ai Route [ABANDONED]

- [ ] Install @mariozechner/pi-ai (DECIDED NOT TO PROCEED)
- [ ] Create wrapper/adapter that respects the toggle (CLEANED UP ORPHANS)
- [ ] Refactor src/lib/llm to support dual implementations
- [ ] Verify both paths work
```
