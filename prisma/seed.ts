import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Roles
  await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  await prisma.role.upsert({
    where: { name: "MEMBER" },
    update: {},
    create: { name: "MEMBER" },
  });

  // Default DMZ
  await prisma.dMZ.upsert({
    where: { name: "CENTRAL" },
    update: {},
    create: { name: "CENTRAL" },
  });

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
