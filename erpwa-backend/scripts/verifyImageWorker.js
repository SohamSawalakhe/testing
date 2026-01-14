import prisma from "../src/prisma.js";

async function verifyImageWorker() {
  console.log("🧪 Verifying WhatsApp Image Worker...");

  // 1️⃣ Find active WhatsApp conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      channel: "whatsapp",
      sessionExpiresAt: { gt: new Date() },
    },
    include: {
      lead: true,
      vendor: true,
    },
  });

  if (!conversation) {
    throw new Error("❌ No active WhatsApp conversation found");
  }

  console.log("✅ Conversation:", conversation.id);

  // 2️⃣ Get one gallery image
  const image = await prisma.galleryImage.findFirst({
    where: {
      vendorId: conversation.vendorId,
    },
  });

  if (!image) {
    throw new Error("❌ No gallery image found");
  }

  console.log("✅ Gallery image:", image.id);

  // 3️⃣ Create queued message
  const message = await prisma.message.create({
    data: {
      vendorId: conversation.vendorId,
      conversationId: conversation.id,
      direction: "outbound",
      channel: "whatsapp",
      messageType: "image",
      status: "queued",

      media: {
        create: {
          mediaType: "image",
          mimeType: "image/jpeg",
          mediaUrl: image.s3Url,
          caption: image.title ?? "Worker verification test",
        },
      },
    },
  });

  console.log("📨 Message queued:", message.id);

  console.log(`
🎯 NEXT STEPS

1️⃣ In a NEW terminal, start the worker:
   node src/workers/runWhatsappImageWorker.js

2️⃣ Watch worker logs:
   🟢 Image worker running
   🔒 processing
   ✅ Sent image OR ❌ failed

3️⃣ Check DB:
   Message.status should be 'sent' or 'failed'
`);
}

verifyImageWorker()
  .then(() => {
    console.log("✅ Verification script finished");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Verification failed:", err.message);
    process.exit(1);
  });
