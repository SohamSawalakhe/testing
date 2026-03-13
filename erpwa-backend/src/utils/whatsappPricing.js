/**
 * WhatsApp Pricing Configuration & Helper
 * 
 * Meta base pricing (India) + GPSERP platform markup.
 * Used to calculate per-conversation costs for vendor billing.
 */

import prisma from "../prisma.js";

// ─── Default India pricing (INR per conversation) ──────────────
const DEFAULT_META_PRICING = {
  service: 0.14,
  utility: 0.30,
  marketing: 0.78,
  authentication: 0.30,
};

// ─── Platform markup per category ──────────────────────────────
const PLATFORM_MARKUP = {
  service: 0.16,
  utility: 0.20,
  marketing: 0.32,
  authentication: 0.20,
};

const DEFAULT_COUNTRY = "India";

/**
 * Get Meta's base price for a conversation category.
 * Checks WhatsappPricing table first, falls back to hardcoded defaults.
 *
 * @param {string} category - service | utility | marketing | authentication
 * @param {string} [country="India"]
 * @returns {Promise<number>} Meta cost in INR
 */
export async function getMetaPrice(category, country = DEFAULT_COUNTRY) {
  const normalizedCategory = category?.toLowerCase();

  if (!["service", "utility", "marketing", "authentication"].includes(normalizedCategory)) {
    console.warn(`⚠️ Unknown pricing category: "${category}", defaulting to service`);
    return DEFAULT_META_PRICING.service;
  }

  try {
    const pricing = await prisma.whatsappPricing.findUnique({
      where: { country },
    });

    if (pricing && pricing[normalizedCategory] !== undefined) {
      return pricing[normalizedCategory];
    }
  } catch (err) {
    console.error("⚠️ Error fetching pricing from DB, using defaults:", err.message);
  }

  return DEFAULT_META_PRICING[normalizedCategory];
}

/**
 * Get the platform markup for a conversation category.
 *
 * @param {string} category
 * @returns {number}
 */
export function getMarkup(category) {
  const normalizedCategory = category?.toLowerCase();
  return PLATFORM_MARKUP[normalizedCategory] ?? PLATFORM_MARKUP.service;
}

/**
 * Calculate the total charged cost = Meta base price + platform markup.
 *
 * @param {string} category
 * @param {string} [country="India"]
 * @returns {Promise<{ metaCost: number, markup: number, chargedCost: number }>}
 */
export async function calculateChargedCost(category, country = DEFAULT_COUNTRY) {
  const metaCost = await getMetaPrice(category, country);
  const markup = getMarkup(category);
  const chargedCost = parseFloat((metaCost + markup).toFixed(4));

  return { metaCost, markup, chargedCost };
}

/**
 * Seed default India pricing into the database (idempotent).
 * Call this once during initial setup.
 */
export async function seedDefaultPricing() {
  try {
    await prisma.whatsappPricing.upsert({
      where: { country: DEFAULT_COUNTRY },
      update: {
        service: DEFAULT_META_PRICING.service,
        utility: DEFAULT_META_PRICING.utility,
        marketing: DEFAULT_META_PRICING.marketing,
        authentication: DEFAULT_META_PRICING.authentication,
      },
      create: {
        country: DEFAULT_COUNTRY,
        service: DEFAULT_META_PRICING.service,
        utility: DEFAULT_META_PRICING.utility,
        marketing: DEFAULT_META_PRICING.marketing,
        authentication: DEFAULT_META_PRICING.authentication,
      },
    });
    console.log("✅ Default WhatsApp pricing seeded for", DEFAULT_COUNTRY);
  } catch (err) {
    console.error("❌ Failed to seed default pricing:", err.message);
  }
}

export { DEFAULT_META_PRICING, PLATFORM_MARKUP, DEFAULT_COUNTRY };
