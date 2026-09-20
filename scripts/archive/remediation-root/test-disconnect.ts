import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log("Connecting...");
  await prisma.$connect();
  console.log("Disconnecting...");
  await prisma.$disconnect();
}
main().then(() => console.log("Done"));
