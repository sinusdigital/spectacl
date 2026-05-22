# Deployment & Backfill Guide

## Production Deployment

The application builds and deploys via GitHub. Ensure the `prisma/migrations` folder is committed and pushed.

During the deployment process, the start command will run:

```bash
npx prisma migrate deploy
```

This will apply the new migration `20260213102305_add_time_window_metrics` which adds the columns for 7d/30d/90d metrics.

## Data Backfill (Post-Deployment)

Once the application is live, you should run the backfill script to calculate metrics for existing prompts based on their historical data. Without this, historical prompts will show "—" until their next scheduled run.

### Running the Script

Access your production server console (e.g., via SSH or your hosting provider's dashboard) and run:

```bash
# Ensure you are in the application root directory with access to environment variables
npx tsx scripts/backfill-prompt-metrics.ts
```

### Script Details

- **Location**: `scripts/backfill-prompt-metrics.ts`
- **Function**: Iterates through all prompts, queries their analysis history, and calculates/updates the new cached metric fields.
- **Safety**: Safe to run multiple times. It simply overwrites the cached values with fresh calculations.
