import { Queue } from 'bullmq';
import connection from './connection';

export const snapshotQueue = new Queue('snapshot-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: {
            age: 24 * 3600 * 30, // Keep for 30 days (monthly jobs)
            count: 100,
        },
        removeOnFail: {
            age: 24 * 3600 * 7, // Keep failures for 7 days
        },
    },
});
