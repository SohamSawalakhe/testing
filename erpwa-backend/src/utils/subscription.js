import prisma from "../prisma.js";

/**
 * Validates if a vendor can initiate a new conversation.
 * Throws an Error if the limit is exceeded.
 */
export async function enforceConversationLimit(vendorId) {
    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { subscriptionPlan: true },
    });

    // If no plan is assigned, allow by default (safety fallback)
    if (!vendor || !vendor.subscriptionPlan) {
        return true;
    }

    const { conversationLimit, name } = vendor.subscriptionPlan;

    if (conversationLimit === -1) {
        return true; // Unlimited
    }

    const count = await prisma.conversation.count({
        where: {
            vendorId,
            initiatedBy: "vendor"
        }
    });

    if (count >= conversationLimit) {
        throw new Error(`Subscription limit reached. Your ${name} plan allows initiating up to ${conversationLimit} conversations.`);
    }

    return true;
}

/**
 * Validates if a vendor can have another template approved/submitted.
 * Throws an Error if the limit is exceeded.
 */
export async function enforceTemplateLimit(vendorId) {
    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { subscriptionPlan: true },
    });

    if (!vendor || !vendor.subscriptionPlan) return true;

    const { templateLimit, name } = vendor.subscriptionPlan;

    if (templateLimit === -1) return true; // Unlimited

    // Only count active templates that occupy a slot
    const count = await prisma.template.count({
        where: {
            vendorId,
            status: {
                in: ["approved", "APPROVED", "pending", "PENDING", "ACTIVE", "active"]
            }
        }
    });

    if (count >= templateLimit) {
        throw new Error(`Subscription limit reached. Your ${name} plan allows up to ${templateLimit} approved templates.`);
    }

    return true;
}

/**
 * Check if limit is reached (returns boolean instead of throwing error)
 * Useful for sync logic to downgrade status gracefully.
 */
export async function hasTemplateLimitReached(vendorId) {
    try {
        await enforceTemplateLimit(vendorId);
        return false;
    } catch (error) {
        return true;
    }
}
