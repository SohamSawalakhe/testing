import prisma from "../prisma.js";
import { sendWhatsAppImage } from "../services/whatsappCampaign.service.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRIES = 1;

export async function processImageQueue() {
  console.log("🟢 Image worker running");

  while (true) {
    const message = await prisma.message.findFirst({
      where: {
        status: "queued",
        messageType: "image",
        retryCount: { lt: MAX_RETRIES },
      },
      orderBy: { createdAt: "asc" },
      include: {
        vendor: true,
        conversation: {
          include: { lead: true },
        },
        media: true,
      },
    });

    if (!message) {
      await sleep(2000);
      continue;
    }

    // 🔒 LOCK MESSAGE
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "processing" },
    });

    try {
      const media = message.media?.[0];
      if (!media) throw new Error("Media not found");

      await sendWhatsAppImage({
        phoneNumberId: message.vendor.whatsappPhoneNumberId,
        accessToken: message.vendor.whatsappAccessToken,
        to: message.conversation.lead.phoneNumber,
        imageUrl: media.mediaUrl,
        caption: media.caption,
      });

      await prisma.message.update({
        where: { id: message.id },
        data: { status: "sent" },
      });

      await prisma.messageDelivery.updateMany({
        where: { messageId: message.id },
        data: { status: "sent" },
      });

      console.log("✅ Sent image:", message.id);
      await sleep(1000);
    } catch (err) {
      console.error("❌ WhatsApp send failed:", err.message);

      const retries = message.retryCount + 1;

      await prisma.message.update({
        where: { id: message.id },
        data: {
          retryCount: retries,
          status: retries >= MAX_RETRIES ? "failed" : "queued",
          errorCode: err.message,
        },
      });

      await sleep(3000);
    }
  }
}
