const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking DB...");
    const users = await prisma.user.findMany();
    console.log('Users:', users);
    const entities = await prisma.entity.findMany();
    console.log('Entities:', entities);
}

main()
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
