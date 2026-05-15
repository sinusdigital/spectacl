import { NextResponse } from "next/server";
import { SystemSettings } from "@/lib/settings";
import { TRIAL_DAYS_DEFAULT } from "@/lib/billing/plans";

// GET /api/public/signup-mode
// Public endpoint — returns signup mode + auth-page settings from AppSetting.
// No auth required (used by login/signup pages before session exists).
export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = {
    'Cache-Control': 'no-store, max-age=0',
  };

  try {
    const settings = await SystemSettings.getMany([
      "signup_mode",
      "sso_google_enabled",
      "trial_days",
    ]);

    const parsedTrialDays = settings.trial_days ? parseInt(settings.trial_days, 10) : NaN;
    const trialDays = !isNaN(parsedTrialDays) && parsedTrialDays > 0
      ? parsedTrialDays
      : TRIAL_DAYS_DEFAULT;

    return NextResponse.json({
      mode: settings.signup_mode ?? "open",
      ssoGoogle: settings.sso_google_enabled !== "false", // default: enabled
      trialDays,
    }, { headers });
  } catch (error) {
    console.error('Failed to get signup mode from DB:', error);
    return NextResponse.json({ error: "Failed to load signup mode", details: String(error) }, { status: 500, headers });
  }
}
