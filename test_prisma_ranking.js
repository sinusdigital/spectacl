
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entity = await prisma.entity.findFirst({ include: { competitors: true } });
  if (!entity) {
      console.log("No entity found");
      return;
  }
  
  console.log("Checking prisma.ranking...");
  if (prisma.ranking) {
      console.log("SUCCESS: prisma.ranking is defined.");
      // Optional: Try to count rankings to ensure DB access works
      const count = await prisma.ranking.count();
      console.log(`Current ranking count: ${count}`);
  } else {
      console.error("FAILURE: prisma.ranking is UNDEFINED. The client needs regeneration or the server needs a restart.");
  }
}

main()
  .catch(e => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
