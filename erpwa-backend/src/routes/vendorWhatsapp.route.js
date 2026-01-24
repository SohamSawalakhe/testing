import express from "express";
import fetch from "node-fetch";
import prisma from "../prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRoles } from "../middleware/requireRole.middleware.js";
import { encrypt } from "../utils/encryption.js";

const router = express.Router();

console.log("✅ vendorWhatsapp routes loaded");

/**
 * ===============================
 * EMBEDDED SIGNUP SESSION
 * ===============================
 */
router.post(
  "/whatsapp/embedded/session",
  authenticate,
  requireRoles(["vendor_owner"]),
  asyncHandler(async (req, res) => {
    const { wabaId, phoneNumberId } = req.body;

    if (!wabaId || !phoneNumberId) {
      return res.status(400).json({ message: "Missing signup data" });
    }

    await prisma.vendor.update({
      where: { id: req.user.vendorId },
      data: {
        whatsappBusinessId: wabaId,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappStatus: "pending",
        whatsappLastError: null,
      },
    });

    res.json({ message: "Signup session stored" });
  }),
);

/**
 * ===============================
 * COMPLETE EMBEDDED SIGNUP
 * ===============================
 */
router.post(
  "/whatsapp/embedded/complete",
  authenticate,
  requireRoles(["vendor_owner"]),
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Missing auth code" });

    // 1️⃣ Exchange OAuth code (CORRECT WAY)
    const tokenResp = await fetch(
      "https://graph.facebook.com/v24.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_OAUTH_REDIRECT_URI,
          code,
          grant_type: "authorization_code",
        }),
      },
    );

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      throw new Error(tokenData?.error?.message || "Token exchange failed");
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: req.user.vendorId },
    });

    if (!vendor?.whatsappBusinessId || !vendor?.whatsappPhoneNumberId) {
      throw new Error("Signup session missing");
    }

    if (vendor.whatsappStatus === "connected") {
      return res.json({ message: "WhatsApp already connected" });
    }

    // 2️⃣ Subscribe app to WABA
    const subResp = await fetch(
      `https://graph.facebook.com/v24.0/${vendor.whatsappBusinessId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
        },
      },
    );
    if (!subResp.ok) {
      throw new Error("Failed to subscribe app to WABA");
    }

    // 3️⃣ Register phone number
    const regResp = await fetch(
      `https://graph.facebook.com/v24.0/${vendor.whatsappPhoneNumberId}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp" }),
      },
    );
    if (!regResp.ok) {
      throw new Error("Failed to register phone number");
    }

    // 4️⃣ Mark connected
    await prisma.vendor.update({
      where: { id: req.user.vendorId },
      data: {
        whatsappStatus: "connected",
        whatsappVerifiedAt: new Date(),
        whatsappLastError: null,
      },
    });

    res.json({ message: "WhatsApp connected successfully" });
  }),
);

/**
 * ===============================
 * GET WHATSAPP CONFIG
 * ===============================
 */
router.get(
  "/whatsapp",
  authenticate,
  requireRoles(["vendor_owner", "vendor_admin"]),
  asyncHandler(async (req, res) => {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.user.vendorId },
      select: {
        whatsappBusinessId: true,
        whatsappPhoneNumberId: true,
        whatsappStatus: true,
        whatsappVerifiedAt: true,
        whatsappLastError: true,
      },
    });

    res.json(vendor);
  }),
);

export default router;
