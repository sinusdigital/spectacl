
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration: potentially "rejected" -> "untracked"...');

    // Verify connection
    try {
        // Find all rejected
        const rejectedCount = await prisma.suggestedCompetitor.count({
            where: { status: 'rejected' }
        });

        console.log(`Found ${rejectedCount} competitors with status 'rejected'.`);

        if (rejectedCount > 0) {
            const result = await prisma.suggestedCompetitor.updateMany({
                where: { status: 'rejected' },
                data: { status: 'untracked' }
            });
            console.log(`Updated ${result.count} records to 'untracked'.`);
        } else {
            console.log('No records to update.');
        }

    } catch (e) {
        console.error('Error during migration:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
