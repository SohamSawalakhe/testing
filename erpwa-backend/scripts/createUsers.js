import "dotenv/config";
import prisma from "../src/prisma.js";
import { hashPassword } from "../src/utils/password.js";

async function main() {
  const passwordHash = await hashPassword("Password@123");

  // 1️⃣ Create Vendor FIRST
  const vendor = await prisma.vendor.create({
    data: {
      name: "GPSERP Support",
      subscriptionStart: new Date(),
      subscriptionEnd: new Date("2099-12-31T23:59:59.999Z"), // Unlimited access
    },
  });

  console.log("✅ Vendor created:", vendor.id);

  // 2️⃣ Create users linked to vendor
  const users = [
    {
      email: "support@gpserp.com",
      name: "GPSERP Support",
      role: "vendor_owner",
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        vendorId: vendor.id,
        onboardingStatus: "activated",
      },
    });

    console.log(`✅ Created ${user.role}: ${user.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
