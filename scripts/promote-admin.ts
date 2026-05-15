import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Please provide an email address as an argument.');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log(`Successfully promoted user ${user.email} to ADMIN.`);
  } catch (error) {
    console.error(`Failed to promote user: ${error}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
