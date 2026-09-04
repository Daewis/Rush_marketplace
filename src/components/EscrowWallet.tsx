import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CreditCard,
  Building2,
  Lock,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "../context/AuthContext";
import { useMarketplace } from "../context/MarketplaceContext";
import { GatewayType, EscrowTransaction } from "../types";
import { paymentApi, walletApi, handleApiError } from "../lib/api";

export const EscrowWallet: React.FC = () => {
  const { user, refreshWallet } = useAuthContext();
  const { transactions: localTransactions, addTransaction } = useMarketplace();

  // Transactions state (combines live backend ledger with optimistic entries)
  const [liveTransactions, setLiveTransactions] = useState<EscrowTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState<boolean>(false);

  // Top Up Modal State
  const [showTopUp, setShowTopUp] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(20000);
  const [gateway, setGateway] = useState<GatewayType>("Paystack");
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Active Paystack Session State
  const [paystackSession, setPaystackSession] = useState<{
    reference: string;
    authorization_url: string;
    amount: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Withdrawal Modal State
  const [showWithdraw, setShowWithdraw] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(10000);
  const [bankName, setBankName] = useState<string>("OPay Digital Bank");
  const [accountNumber, setAccountNumber] = useState<string>("8012345678");
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  const userId = user?.uid;

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    setLoadingTxs(true);
    try {
      const res = await walletApi.getTransactions({ limit: 50 });
      if (res.data?.success && res.data.data?.transactions) {
        setLiveTransactions(res.data.data.transactions);
      }
    } catch {
      // Fallback to marketplace context transactions
    } finally {
      setLoadingTxs(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
      refreshWallet();
    }
  }, [userId, fetchTransactions, refreshWallet]);

  // Check URL query parameters on load for Paystack callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paystackRef = params.get("paystack_ref") || params.get("reference") || params.get("trxref");

    if (paystackRef && userId) {
      verifyPaystackRef(paystackRef);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [userId]);

  const verifyPaystackRef = async (ref: string) => {
    setIsVerifying(true);
    try {
      const res = await paymentApi.verifyPaystack({ reference: ref });
      if (res.data?.success) {
        const verifiedAmount = res.data.data?.amount || amount;
        toast.success(`Paystack Top-Up Verified! ₦${verifiedAmount.toLocaleString()} credited to wallet.`);
        setPaystackSession(null);
        setShowTopUp(false);
        await refreshWallet();
        await fetchTransactions();
      } else {
        toast.error(res.data?.error || "Paystack verification pending or failed.");
      }
    } catch (err: any) {
      console.error("Paystack verify error:", err);
      toast.error(handleApiError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (gateway === "Paystack") {
      setIsInitializing(true);
      try {
        const res = await paymentApi.initializePaystack({
          amount,
          email: user.email || "customer@rushng.com",
          payment_type: "top_up",
        });

        if (res.data?.success && res.data.data?.authorization_url) {
          const { authorization_url, reference } = res.data.data;
          
          setPaystackSession({
            reference,
            authorization_url,
            amount,
          });

          window.open(authorization_url, "PaystackCheckout", "width=520,height=700,scrollbars=yes,resizable=yes");
          toast.info("Paystack Checkout opened! Complete your transaction and click Verify.");
        } else {
          toast.error(res.data?.error || "Failed to initialize Paystack transaction");
        }
      } catch (err: any) {
        console.error("Paystack topup init error:", err);
        toast.error(handleApiError(err));
      } finally {
        setIsInitializing(false);
      }
    } else {
      // Direct Top-up via Backend Wallet API
      setIsInitializing(true);
      try {
        const res = await walletApi.topUp({
          amount,
          gateway,
          reference: `${gateway.toUpperCase()}_TOPUP_${Date.now().toString().slice(-6)}`,
        });

        if (res.data?.success) {
          toast.success(`₦${amount.toLocaleString()} loaded into wallet via ${gateway}`);
          setShowTopUp(false);
          await refreshWallet();
          await fetchTransactions();
        } else {
          toast.error(res.data?.message || "Top up failed");
        }
      } catch (err: any) {
        toast.error(handleApiError(err));
      } finally {
        setIsInitializing(false);
      }
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (withdrawAmount > (user.walletBalance || 0)) {
      toast.error("Insufficient wallet balance for this withdrawal.");
      return;
    }

    setIsWithdrawing(true);
    try {
      const res = await walletApi.withdraw({
        amount: withdrawAmount,
        bankName,
        accountNumber,
      });

      if (res.data?.success) {
        toast.success(res.data.message || `Withdrawal request of ₦${withdrawAmount.toLocaleString()} submitted.`);
        setShowWithdraw(false);
        await refreshWallet();
        await fetchTransactions();
      } else {
        toast.error(res.data?.error || "Withdrawal failed");
      }
    } catch (err: any) {
      toast.error(handleApiError(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Combine live ledger entries with fallback local transactions
  const displayTxs = liveTransactions.length > 0 ? liveTransactions : localTransactions;
  const userTxs = displayTxs.filter((t) => t.userId === user?.uid || user?.role === "admin" || !t.userId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Rush Escrow Ledger & Wallet
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance settlement with automated escrow locking and instant Paystack / OPay payout hooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refreshWallet();
              fetchTransactions();
            }}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTxs ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowTopUp(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Top-up Wallet</span>
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-orange-400" />
            <span>Withdraw Payout</span>
          </button>
        </div>
      </div>

      {/* Balance Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Available Wallet Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl border border-slate-700 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              Available Cash
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">
            ₦{(user?.walletBalance || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">
            Ready for instant job posting or withdrawal
          </p>
        </div>

        {/* Escrow Locked Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
              Escrow Held
            </span>
            <Lock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            ₦{(user?.escrowHeld || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">
            Protected in Rush ledger pending OTP validation
          </p>
        </div>

        {/* Gateway Integration Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
              Supported Gateways
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[11px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Paystack Live
            </span>
            <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
              OPay Direct
            </span>
            <span className="text-[11px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              Flutterwave
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Live Paystack API initialized for cards & bank transfers
          </p>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900">
            Escrow Audit Ledger & Activity
          </h3>
          {loadingTxs && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing ledger...</span>
            </div>
          )}
        </div>

        {userTxs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No financial transactions recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {userTxs.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "top_up" || tx.type === "escrow_release" || tx.type === "refund"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-orange-50 text-orange-600 border border-orange-200"
                    }`}
                  >
                    {tx.type === "top_up" || tx.type === "escrow_release" || tx.type === "refund" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 capitalize">
                      {tx.type.replace("_", " ")}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Ref: {tx.reference} • {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                    {tx.notes && (
                      <p className="text-[11px] text-slate-500">{tx.notes}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-black text-sm ${
                      tx.type === "top_up" || tx.type === "escrow_release" || tx.type === "refund"
                        ? "text-emerald-600"
                        : "text-slate-900"
                    }`}
                  >
                    {tx.type === "top_up" || tx.type === "escrow_release" || tx.type === "refund"
                      ? "+"
                      : "-"}
                    ₦{tx.amount.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    {tx.gateway}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP UP MODAL */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span>Top-up Escrow Wallet</span>
            </h3>

            {paystackSession ? (
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Paystack Session Active</span>
                </div>
                
                <p className="text-xs text-slate-600">
                  Amount: <strong className="text-slate-900 font-extrabold">₦{paystackSession.amount.toLocaleString()}</strong>
                  <br />
                  Reference: <code className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">{paystackSession.reference}</code>
                </p>

                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href={paystackSession.authorization_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg text-center flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <span>Open Paystack Checkout Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => verifyPaystackRef(paystackSession.reference)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying with Paystack...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Confirm & Verify Payment Settlement</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaystackSession(null)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 text-center py-1 cursor-pointer"
                  >
                    Change amount or gateway
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTopUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-extrabold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Payment Gateway
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Paystack", "OPay", "Flutterwave"] as GatewayType[]).map((gt) => (
                      <button
                        key={gt}
                        type="button"
                        onClick={() => setGateway(gt)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          gateway === gt
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {gt === "Paystack" ? "Paystack (Live)" : gt}
                      </button>
                    ))}
                  </div>
                </div>

                {gateway === "Paystack" && (
                  <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
                    <p className="font-extrabold flex items-center gap-1.5 text-blue-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Paystack Secure Gateway
                    </p>
                    <p className="text-slate-600">
                      Pay with Credit/Debit Cards, Bank Transfer, USSD, Apple Pay or OPay.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTopUp(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInitializing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <span>Proceed to {gateway} Checkout</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Withdraw to Bank Account</span>
            </h3>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  max={user?.walletBalance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-extrabold bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Available: ₦{(user?.walletBalance || 0).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Name
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="OPay Digital Bank">OPay Digital Bank</option>
                  <option value="Palmpay">Palmpay</option>
                  <option value="Kuda Bank">Kuda Microfinance</option>
                  <option value="GTBank">Guaranty Trust Bank</option>
                  <option value="First Bank">First Bank Nigeria</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="United Bank for Africa">UBA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number (10 digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdraw(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Payout NUBAN</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
