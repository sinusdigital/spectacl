const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const userCount = await prisma.user.count();
        console.log(`Users: ${userCount}`);
        const users = await prisma.user.findMany();
        console.log('User emails:', users.map(u => u.email));

        const entityCount = await prisma.entity.count();
        console.log(`Entities: ${entityCount}`);
        const entities = await prisma.entity.findMany();
        console.log('Entities:', entities.map(e => ({ id: e.id, name: e.name })));

        const promptCount = await prisma.prompt.count();
        console.log(`Prompts: ${promptCount}`);
    } catch (e) {
        console.error("DB Connection Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
