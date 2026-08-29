import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Brak danych testowych - baza rozpoczyna czysta
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
