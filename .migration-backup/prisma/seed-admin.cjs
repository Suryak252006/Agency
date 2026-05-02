const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: { password: passwordHash },
    create: {
      email: "test@example.com",
      name: "Demo Admin",
      role: UserRole.ADMIN,
      schoolId: process.env.DEFAULT_SCHOOL_ID || "school_001",
      password: passwordHash,
    },
  });

  console.log("Seeded admin user");
  console.log("Email: test@example.com");
  console.log("Password: admin123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });