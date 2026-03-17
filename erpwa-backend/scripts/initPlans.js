import prisma from "../src/prisma.js";

async function main() {
    const defaultPlans = [
        { name: "Free", price: 0, conversationLimit: 100, galleryLimit: 50, chatbotLimit: 1, templateLimit: 5, formLimit: 2, teamUsersLimit: 1 },
        { name: "Basic", price: 29, conversationLimit: 1000, galleryLimit: 500, chatbotLimit: 3, templateLimit: 20, formLimit: 5, teamUsersLimit: 3 },
        { name: "Unlimited", price: 299, conversationLimit: -1, galleryLimit: -1, chatbotLimit: -1, templateLimit: -1, formLimit: -1, teamUsersLimit: -1 },
    ];

    for (const plan of defaultPlans) {
        await prisma.subscriptionPlan.upsert({
            where: { name: plan.name },
            update: plan,
            create: plan,
        });
        console.log(`Upserted plan: ${plan.name}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
