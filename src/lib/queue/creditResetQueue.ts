import { Queue } from 'bullmq';
import connection from './connection';

export const creditResetQueue = new Queue('credit-reset-queue', {
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
        removeOnFail: {
            age: 24 * 7 * 3600, // Keep for 7 days
        },
    },
});
