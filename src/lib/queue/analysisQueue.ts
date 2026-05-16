import { Queue } from 'bullmq';
import connection from './connection';

export const analysisQueue = new Queue('analysis-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep for 24 hours
            count: 1000,
        },
        removeOnFail: false, // Never auto-remove failed jobs — acts as a dead-letter queue for inspection
    },
});
