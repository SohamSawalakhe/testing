"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/card";
import {
  MessageSquare,
  MessagesSquare,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Send,
  CalendarDays,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  Megaphone,
  Wrench,
  BarChart3,
  Clock,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { whatsappAnalyticsAPI } from "@/lib/whatsappAnalyticsApi";
import { toast } from "react-toastify";

/* ─── Types ─────────────────────────────────────────── */
interface BillingSummary {
  totalMessages: number;
  totalConversations: number;
  serviceConversations: number;
  utilityConversations: number;
  marketingConversations: number;
  authenticationConversations: number;
  totalMetaCost: number;
  totalChargedCost: number;
}

interface DashboardSummary {
  messagesToday: number;
  messagesThisMonth: number;
  conversationsThisMonth: number;
  costThisMonth: number;
}

interface WalletData {
  balance: number;
  transactions: {
    id: string;
    amount: number;
    type: string;
    description: string;
    reference: string | null;
    balanceAfter: number;
    createdAt: string;
  }[];
}

interface ConversationRecord {
  id: string;
  vendorId: string;
  conversationId: string;
  category: string;
  metaCost: number;
  chargedCost: number;
  billable: boolean;
  createdAt: string;
}

/* ─── Animated Number ───────────────────────────────── */
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = eased * end;
      setDisplay(start);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}{display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{suffix}
    </span>
  );
}

/* ─── Category Config ───────────────────────────────── */
const categoryConfig: Record<string, {
  label: string;
  icon: React.ReactNode;
  gradient: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  darkBg: string;
}> = {
  service: {
    label: "Service",
    icon: <Wrench className="w-5 h-5" />,
    gradient: "from-emerald-500 to-teal-600",
    textColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    darkBg: "dark:bg-emerald-950/30",
  },
  utility: {
    label: "Utility",
    icon: <Zap className="w-5 h-5" />,
    gradient: "from-blue-500 to-indigo-600",
    textColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200 dark:border-blue-800",
    darkBg: "dark:bg-blue-950/30",
  },
  marketing: {
    label: "Marketing",
    icon: <Megaphone className="w-5 h-5" />,
    gradient: "from-orange-500 to-rose-600",
    textColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200 dark:border-orange-800",
    darkBg: "dark:bg-orange-950/30",
  },
  authentication: {
    label: "Auth",
    icon: <ShieldCheck className="w-5 h-5" />,
    gradient: "from-purple-500 to-violet-600",
    textColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200 dark:border-purple-800",
    darkBg: "dark:bg-purple-950/30",
  },
};

/* ─── Pricing Table ─────────────────────────────────── */
const pricingTable = [
  { category: "Service", meta: 0.14, markup: 0.16, total: 0.30 },
  { category: "Utility", meta: 0.30, markup: 0.20, total: 0.50 },
  { category: "Marketing", meta: 0.78, markup: 0.32, total: 1.10 },
  { category: "Authentication", meta: 0.30, markup: 0.20, total: 0.50 },
];

/* ═══════════════════════════════════════════════════════
   MAIN INSIGHTS PAGE
═══════════════════════════════════════════════════════ */
export default function InsightsPage() {
  const { user } = useAuth();
  const vendorId = user?.vendorId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [convoTotal, setConvoTotal] = useState(0);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "pricing" | "wallet">("overview");

  /* ─── Fetch All Data ──────────────────────────────── */
  const fetchAll = useCallback(async () => {
    if (!vendorId) return;

    try {
      const [billingRes, dashRes, walletRes, convoRes] = await Promise.all([
        whatsappAnalyticsAPI.getBillingSummary(vendorId),
        whatsappAnalyticsAPI.getDashboardSummary(vendorId),
        whatsappAnalyticsAPI.getWallet(vendorId),
        whatsappAnalyticsAPI.getConversations(vendorId, { limit: 20 }),
      ]);

      setBilling(billingRes.data.data);
      setDashboard(dashRes.data.data);
      setWallet(walletRes.data.data);
      setConversations(convoRes.data.data.conversations);
      setConvoTotal(convoRes.data.data.total);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      toast.error("Failed to load insights data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  /* ─── Loading State ───────────────────────────────── */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto" />
            <BarChart3 className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">
            Loading insights...
          </p>
        </div>
      </div>
    );
  }

  const platformProfit = (billing?.totalChargedCost ?? 0) - (billing?.totalMetaCost ?? 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* ─── Header ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              WhatsApp Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 ml-[52px]">
              Billing analytics, conversation costs & wallet overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-muted rounded-lg p-1 gap-0.5">
              {(["overview", "pricing", "wallet"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════
              OVERVIEW TAB
          ═══════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* ─── Quick Stats Row ────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Messages Today */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <Send className="w-4 h-4 text-blue-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        <AnimatedNumber value={dashboard?.messagesToday ?? 0} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Messages sent today</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Messages This Month */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Month</span>
                        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                          <CalendarDays className="w-4 h-4 text-purple-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        <AnimatedNumber value={dashboard?.messagesThisMonth ?? 0} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Messages this month</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Conversations This Month */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="relative overflow-hidden border-l-4 border-l-green-500">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversations</span>
                        <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/30">
                          <MessagesSquare className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        <AnimatedNumber value={dashboard?.conversationsThisMonth ?? 0} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Conversations this month</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Cost This Month */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="relative overflow-hidden border-l-4 border-l-amber-500">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spent</span>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                          <IndianRupee className="w-4 h-4 text-amber-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        <AnimatedNumber value={dashboard?.costThisMonth ?? 0} prefix="₹" decimals={2} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Cost this month</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ─── Category Breakdown ──────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Conversation Breakdown
                    </CardTitle>
                    <CardDescription>
                      {billing?.totalConversations ?? 0} total conversations across all categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(categoryConfig).map(([key, config], idx) => {
                        const count = billing?.[
                          `${key}Conversations` as keyof BillingSummary
                        ] as number ?? 0;
                        const total = billing?.totalConversations || 1;
                        const pct = ((count / total) * 100).toFixed(1);

                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + idx * 0.08 }}
                            whileHover={{ scale: 1.02 }}
                            className={`relative rounded-xl border-2 ${config.borderColor} ${config.bgColor} ${config.darkBg} p-5 transition-all hover:shadow-lg`}
                          >
                            {/* Percentage badge */}
                            <div className="absolute top-3 right-3">
                              <span className={`text-[10px] font-bold ${config.textColor} bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full`}>
                                {pct}%
                              </span>
                            </div>

                            <div className="flex flex-col items-center text-center space-y-2.5">
                              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-md`}>
                                {config.icon}
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-foreground">{count}</p>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                  {config.label}
                                </p>
                              </div>
                            </div>

                            {/* Mini progress bar */}
                            <div className="mt-3 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.5 + idx * 0.1, duration: 0.8 }}
                                className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ─── Cost Summary ────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="h-full">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta Cost</p>
                          <p className="text-2xl font-bold text-foreground">
                            <AnimatedNumber value={billing?.totalMetaCost ?? 0} prefix="₹" decimals={2} />
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Base cost charged by Meta for all conversations</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="h-full">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
                          <TrendingDown className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Charged</p>
                          <p className="text-2xl font-bold text-foreground">
                            <AnimatedNumber value={billing?.totalChargedCost ?? 0} prefix="₹" decimals={2} />
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Total amount charged to your wallet (Meta + Platform)</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ y: -3 }}
                >
                  <Card className="h-full">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
                          <p className="text-2xl font-bold text-foreground">
                            <AnimatedNumber value={wallet?.balance ?? 0} prefix="₹" decimals={2} />
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Current pre-paid wallet balance</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ─── Total Messages Banner ───────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-xl">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                  <div className="relative flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">Total Messages Tracked</p>
                        <p className="text-4xl font-bold mt-0.5">
                          <AnimatedNumber value={billing?.totalMessages ?? 0} />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-white/90">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{billing?.totalConversations ?? 0}</p>
                        <p className="text-xs text-white/70 mt-0.5">Conversations</p>
                      </div>
                      <div className="w-px h-10 bg-white/20" />
                      <div className="text-center">
                        <p className="text-2xl font-bold">₹{platformProfit.toFixed(2)}</p>
                        <p className="text-xs text-white/70 mt-0.5">Platform Markup</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Recent Conversations (Collapsible) ─── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader className="cursor-pointer" onClick={() => setShowConversations(!showConversations)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Recent Conversations
                        </CardTitle>
                        <CardDescription>{convoTotal} total billable conversations</CardDescription>
                      </div>
                      {showConversations ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </CardHeader>

                  <AnimatePresence>
                    {showConversations && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <CardContent className="pt-0">
                          {conversations.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground/80 border-b border-border">
                                    <th className="px-4 py-3 text-left font-bold">Conversation ID</th>
                                    <th className="px-4 py-3 text-left font-bold">Category</th>
                                    <th className="px-4 py-3 text-right font-bold">Meta Cost</th>
                                    <th className="px-4 py-3 text-right font-bold">Charged</th>
                                    <th className="px-4 py-3 text-right font-bold">Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {conversations.map((conv, i) => {
                                    const cat = categoryConfig[conv.category] || categoryConfig.service;
                                    return (
                                      <motion.tr
                                        key={conv.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                                      >
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                          {conv.conversationId.slice(0, 20)}...
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cat.bgColor} ${cat.darkBg} ${cat.textColor} border ${cat.borderColor}`}>
                                            <span className="[&>svg]:w-3 [&>svg]:h-3">{cat.icon}</span>
                                            {cat.label}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">₹{conv.metaCost.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-foreground">₹{conv.chargedCost.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                          {new Date(conv.createdAt).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </td>
                                      </motion.tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-10">
                              <MessagesSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-muted-foreground font-medium">No conversations tracked yet</p>
                              <p className="text-xs text-muted-foreground mt-1">Conversations will appear here once messages are exchanged via WhatsApp</p>
                            </div>
                          )}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              PRICING TAB
          ═══════════════════════════════════════════ */}
          {activeTab === "pricing" && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    WhatsApp Conversation Pricing (India)
                  </CardTitle>
                  <CardDescription>
                    Per-conversation rates charged by Meta + GPSERP platform markup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-muted-foreground/80 bg-muted/30 border-b border-border">
                          <th className="px-6 py-4 text-left font-bold">Category</th>
                          <th className="px-6 py-4 text-right font-bold">Meta Cost</th>
                          <th className="px-6 py-4 text-right font-bold">Platform Markup</th>
                          <th className="px-6 py-4 text-right font-bold">Total Per Conversation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingTable.map((row, i) => {
                          const catKey = row.category.toLowerCase();
                          const cat = categoryConfig[catKey] || categoryConfig.service;
                          return (
                            <motion.tr
                              key={row.category}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg bg-gradient-to-br ${cat.gradient} text-white shadow-sm`}>
                                    {cat.icon}
                                  </div>
                                  <span className="font-semibold text-foreground">{row.category}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-muted-foreground">₹{row.meta.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  ₹{row.markup.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center gap-1.5 text-lg font-bold text-foreground">
                                  ₹{row.total.toFixed(2)}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-semibold mb-1">How pricing works</p>
                        <p>Meta charges per <strong>conversation</strong> (24-hour session), not per message. Multiple messages within the same conversation window are covered by a single charge. The platform markup covers infrastructure, delivery optimization, and support.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              WALLET TAB
          ═══════════════════════════════════════════ */}
          {activeTab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Wallet Balance Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 p-8 text-white shadow-xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.15),transparent_50%)]" />
                <div className="relative flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-sm">
                      <Wallet className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Wallet Balance</p>
                      <p className="text-5xl font-bold mt-1">
                        ₹<AnimatedNumber value={wallet?.balance ?? 0} decimals={2} />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                      <p className="text-lg font-bold">{wallet?.transactions?.length ?? 0}</p>
                      <p className="text-[10px] text-white/70 uppercase tracking-wider">Transactions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <Card>
                <CardHeader className="cursor-pointer" onClick={() => setShowTransactions(!showTransactions)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Transaction History
                      </CardTitle>
                      <CardDescription>All wallet debits and credits</CardDescription>
                    </div>
                    {showTransactions ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {showTransactions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="pt-0">
                        {(wallet?.transactions?.length ?? 0) > 0 ? (
                          <div className="space-y-2">
                            {wallet!.transactions.map((txn, i) => (
                              <motion.div
                                key={txn.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    txn.amount < 0
                                      ? "bg-red-50 dark:bg-red-950/30"
                                      : "bg-green-50 dark:bg-green-950/30"
                                  }`}>
                                    {txn.amount < 0
                                      ? <ArrowDownRight className="w-4 h-4 text-red-500" />
                                      : <ArrowUpRight className="w-4 h-4 text-green-500" />
                                    }
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{txn.description}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${
                                    txn.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                  }`}>
                                    {txn.amount < 0 ? "-" : "+"}₹{Math.abs(txn.amount).toFixed(2)}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Bal: ₹{txn.balanceAfter.toFixed(2)}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">No transactions yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Wallet transactions will appear here as conversations are billed
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
