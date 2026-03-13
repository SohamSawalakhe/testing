/**
 * WhatsApp Billing Service
 *
 * Core billing logic that ties together:
 *  - Message tracking (WhatsappMessage)
 *  - Conversation tracking (WhatsappConversation)
 *  - Pricing calculation
 *  - Wallet deduction
 *
 * Called from the webhook handler on every status update.
 */

import prisma from "../prisma.js";
import { calculateChargedCost } from "../utils/whatsappPricing.js";
import { deductWallet } from "./wallet.service.js";

/**
 * Process a message status event from Meta webhook.
 * Idempotent – safely handles duplicate waMessageId values.
 *
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.waMessageId - Meta's WhatsApp message ID (wamid.xxx)
 * @param {string} params.phoneNumber - Recipient phone number
 * @param {string} params.direction - "outbound" | "inbound"
 * @param {string} [params.messageType] - text, template, image, etc.
 * @param {string} [params.status] - sent, delivered, read, failed
 * @param {string} [params.conversationId] - Meta conversation ID
 * @param {string} [params.pricingCategory] - service, utility, marketing, authentication
 * @returns {Promise<object>} The upserted WhatsappMessage record
 */
export async function trackMessage(params) {
  const {
    vendorId,
    waMessageId,
    phoneNumber,
    direction,
    messageType,
    status,
    conversationId,
    pricingCategory,
  } = params;

  if (!vendorId || !waMessageId) {
    console.warn("⚠️ trackMessage: Missing vendorId or waMessageId, skipping");
    return null;
  }

  try {
    // Upsert ensures idempotent processing of duplicate webhook events
    const message = await prisma.whatsappMessage.upsert({
      where: { waMessageId },
      update: {
        status: status || undefined,
        conversationId: conversationId || undefined,
        pricingCategory: pricingCategory || undefined,
      },
      create: {
        vendorId,
        waMessageId,
        phoneNumber: phoneNumber || "unknown",
        direction: direction || "outbound",
        messageType: messageType || null,
        status: status || null,
        conversationId: conversationId || null,
        pricingCategory: pricingCategory || null,
      },
    });

    return message;
  } catch (err) {
    console.error("❌ trackMessage error:", err.message);
    return null;
  }
}

/**
 * Process a conversation billing event from Meta webhook.
 * 
 * This function:
 *  1. Checks for existing conversation (idempotent)
 *  2. Calculates Meta cost + platform markup
 *  3. Creates WhatsappConversation record
 *  4. Deducts from vendor wallet
 *
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.conversationId - Meta conversation ID
 * @param {string} params.category - service | utility | marketing | authentication
 * @param {boolean} [params.billable=true] - Whether this conversation is billable
 * @param {string} [params.country="India"]
 * @returns {Promise<{ conversation: object, walletResult: object|null } | null>}
 */
export async function processConversationBilling(params) {
  const {
    vendorId,
    conversationId,
    category,
    billable = true,
    country = "India",
  } = params;

  if (!vendorId || !conversationId || !category) {
    console.warn("⚠️ processConversationBilling: Missing required fields", {
      vendorId,
      conversationId,
      category,
    });
    return null;
  }

  try {
    // ─── Idempotent check: Skip if already processed ───────────
    const existing = await prisma.whatsappConversation.findUnique({
      where: { conversationId },
    });

    if (existing) {
      console.log(`ℹ️ Conversation ${conversationId} already tracked, skipping`);
      return { conversation: existing, walletResult: null };
    }

    // ─── Calculate costs ───────────────────────────────────────
    const { metaCost, chargedCost } = await calculateChargedCost(
      category,
      country
    );

    // ─── Create conversation record ────────────────────────────
    const conversation = await prisma.whatsappConversation.create({
      data: {
        vendorId,
        conversationId,
        category: category.toLowerCase(),
        metaCost,
        chargedCost,
        billable,
      },
    });

    console.log(
      `📊 Conversation tracked: ${conversationId} | ` +
      `Category: ${category} | Meta: ₹${metaCost} | Charged: ₹${chargedCost}`
    );

    // ─── Deduct from wallet (only if billable) ─────────────────
    let walletResult = null;
    if (billable) {
      try {
        walletResult = await deductWallet(vendorId, chargedCost, {
          description: `WhatsApp ${category} conversation`,
          reference: conversationId,
        });
      } catch (walletErr) {
        if (walletErr.message === "INSUFFICIENT_BALANCE") {
          console.warn(
            `⚠️ Vendor ${vendorId} has insufficient wallet balance ` +
            `for conversation ${conversationId}. Charge: ₹${chargedCost}`
          );
          // Don't throw – we still want to track the conversation
          // The vendor should be notified via a separate mechanism
        } else {
          console.error("❌ Wallet deduction error:", walletErr.message);
        }
      }
    }

    return { conversation, walletResult };
  } catch (err) {
    // Handle duplicate key race condition gracefully
    if (err.code === "P2002") {
      console.log(`ℹ️ Conversation ${conversationId} duplicate detected (race condition)`);
      const existing = await prisma.whatsappConversation.findUnique({
        where: { conversationId },
      });
      return { conversation: existing, walletResult: null };
    }

    console.error("❌ processConversationBilling error:", err.message);
    return null;
  }
}

/**
 * Get billing summary for a vendor (used by analytics APIs).
 *
 * @param {string} vendorId
 * @returns {Promise<object>}
 */
export async function getVendorBillingSummary(vendorId) {
  const [
    totalMessages,
    totalConversations,
    categoryBreakdown,
    costAggregation,
  ] = await Promise.all([
    // Total messages
    prisma.whatsappMessage.count({
      where: { vendorId },
    }),

    // Total conversations
    prisma.whatsappConversation.count({
      where: { vendorId },
    }),

    // Conversations by category
    prisma.whatsappConversation.groupBy({
      by: ["category"],
      where: { vendorId },
      _count: { id: true },
    }),

    // Cost totals
    prisma.whatsappConversation.aggregate({
      where: { vendorId },
      _sum: {
        metaCost: true,
        chargedCost: true,
      },
    }),
  ]);

  // Build category map
  const categories = {
    service: 0,
    utility: 0,
    marketing: 0,
    authentication: 0,
  };

  for (const group of categoryBreakdown) {
    categories[group.category] = group._count.id;
  }

  return {
    totalMessages,
    totalConversations,
    serviceConversations: categories.service,
    utilityConversations: categories.utility,
    marketingConversations: categories.marketing,
    authenticationConversations: categories.authentication,
    totalMetaCost: parseFloat((costAggregation._sum.metaCost || 0).toFixed(4)),
    totalChargedCost: parseFloat((costAggregation._sum.chargedCost || 0).toFixed(4)),
  };
}

/**
 * Get dashboard summary stats for a vendor.
 *
 * @param {string} vendorId
 * @returns {Promise<object>}
 */
export async function getVendorDashboardSummary(vendorId) {
  const now = new Date();

  // Start of today (midnight)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    messagesToday,
    messagesThisMonth,
    conversationsThisMonth,
    costThisMonth,
  ] = await Promise.all([
    // Messages sent today
    prisma.whatsappMessage.count({
      where: {
        vendorId,
        createdAt: { gte: startOfToday },
      },
    }),

    // Messages sent this month
    prisma.whatsappMessage.count({
      where: {
        vendorId,
        createdAt: { gte: startOfMonth },
      },
    }),

    // Conversations this month
    prisma.whatsappConversation.count({
      where: {
        vendorId,
        createdAt: { gte: startOfMonth },
      },
    }),

    // Cost this month
    prisma.whatsappConversation.aggregate({
      where: {
        vendorId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        chargedCost: true,
      },
    }),
  ]);

  return {
    messagesToday,
    messagesThisMonth,
    conversationsThisMonth,
    costThisMonth: parseFloat((costThisMonth._sum.chargedCost || 0).toFixed(4)),
  };
}
