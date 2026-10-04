import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // No seed data — the database starts empty
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
