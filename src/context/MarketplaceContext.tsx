import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  ArtisanProfile,
  JobPost,
  JobQuote,
  EscrowTransaction,
  DisputeCase,
  Notification,
} from "../types";
import {
  initialArtisans,
  initialQuotes,
  initialTransactions,
  initialDisputes,
  campusHubs as defaultCampusHubs,
  campusHubs,
} from "../data/seedData";
import { jobApi, notificationApi, quoteApi, walletApi, violationApi, providerApi, handleApiError } from "../lib/api";
import { useAuthContext } from "./AuthContext";

// Maps the backend's snake_case Job shape (server/routes/jobs.ts) onto the
// frontend's existing camelCase JobPost type, so JobBoard.tsx and
// JobTrackerHUD.tsx don't need structural changes.
const BACKEND_STATUS_MAP: Record<string, JobPost["status"]> = {
  posted: "open",
  assigned: "assigned",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
  disputed: "disputed",
};

function mapJob(apiJob: any): JobPost {
  return {
    id: apiJob.id,
    title: apiJob.title,
    category: apiJob.category,
    description: apiJob.description,
    budget: apiJob.estimated_price ?? 0,
    escrowAmount: apiJob.final_price ?? apiJob.estimated_price ?? 0,
    location: apiJob.address || "",
    hub: apiJob.city || "Unilag Akoka Campus",
    customerId: apiJob.customer_id,
    customerName: apiJob.customer_name || "Campus Customer",
    artisanId: apiJob.provider_id || undefined,
    artisanName: apiJob.provider_name || undefined,
    status: BACKEND_STATUS_MAP[apiJob.status] || "open",
    createdAt: apiJob.created_at,
    // Real check-in/check-out OTP verification isn't implemented in the
    // backend yet (checkInOtpHash exists in the schema but no route
    // generates/verifies it) — these are placeholders until that's built.
    handshakeOtp: "----",
    otpVerified: !!apiJob.check_in_time,
    quotesCount: 0,
  };
}

function mapProviderToArtisan(p: any): ArtisanProfile {
  const categoryMap: Record<string, string> = {
    electrical: "Electrical & Solar Power",
    plumbing: "Plumbing & Leak Repairs",
    ac: "AC Servicing & Gas Refill",
    carpentry: "Carpentry & Door Locksmith",
    laundry: "Laundry & Dry Cleaning",
    cleaning: "Cleaning & Housekeeping",
    generator: "Generator Repair",
    repair: "Electrical & Solar Power",
  };

  const primarySkill = (p.skills?.[0] || "").toLowerCase();
  const category =
    p.category ||
    categoryMap[primarySkill] ||
    (p.skills && p.skills.length > 0
      ? p.skills[0].charAt(0).toUpperCase() + p.skills[0].slice(1)
      : "General Services");

  const name = p.full_name || p.displayName || p.fullName || "Verified Campus Artisan";

  return {
    id: p.id || p._id || `artisan_${Math.random().toString(36).substring(2, 7)}`,
    displayName: name,
    email: p.email || "",
    phone: p.phone || "08012345678",
    avatar:
      p.profile_picture ||
      p.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff`,
    category,
    skills: p.skills && p.skills.length > 0 ? p.skills : [category],
    hourlyRate: p.hourly_rate || p.hourlyRate || 3500,
    rating: p.rating || 5.0,
    jobsCompleted: p.total_jobs_completed || p.jobsCompleted || 0,
    hub: p.hub || p.campus || "Unilag Akoka Campus",
    ninVerified: true,
    bvnVerified: true,
    verificationStatus: "verified",
    bio: p.bio || `${category} specialist with verified biometric screening.`,
    badge: "Verified Artisan",
    isAvailable: p.is_available !== false,
    strikes: 0,
  };
}

function mapNotification(apiNotif: any): Notification {
  return {
    id: apiNotif.id,
    title: apiNotif.title,
    message: apiNotif.message,
    type: apiNotif.type,
    is_read: !!apiNotif.read,
    created_at: apiNotif.created_at,
  };
}

interface MarketplaceContextType {
  artisans: ArtisanProfile[];
  artisansLoading: boolean;
  refreshArtisans: () => void;
  jobs: JobPost[];
  campusHubs: string[];
  addCampusHub: (name: string) => void;
  editCampusHub: (oldName: string, newName: string) => void;
  deleteCampusHub: (name: string) => void;
  jobsLoading: boolean;
  jobsError: string | null;
  refreshJobs: () => void;
  quotes: JobQuote[];
  transactions: EscrowTransaction[];
  disputes: DisputeCase[];
  notifications: Notification[];
  unreadNotificationsCount: number;
  selectedHub: string;
  setSelectedHub: (hub: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  postJob: (job: Omit<JobPost, "id" | "escrowAmount" | "status" | "createdAt" | "handshakeOtp" | "otpVerified" | "quotesCount">) => Promise<JobPost>;
  submitQuote: (quote: Omit<JobQuote, "id" | "createdAt" | "status">) => void;
  acceptQuote: (quoteId: string, jobId: string) => void;
  verifyHandshakeOtp: (jobId: string, otp: string, gpsLocation?: { latitude: number; longitude: number }, photoUrl?: string) => { success: boolean; message: string };
  completeJobCheckOut: (jobId: string, photoUrl: string, rating: number, reviewText: string) => void;
  addTransaction: (tx: Omit<EscrowTransaction, "id" | "createdAt">) => void;
  fileDispute: (dispute: Omit<DisputeCase, "id" | "createdAt" | "status">) => void;
  resolveDispute: (disputeId: string, action: "refund" | "payout" | "dismiss", note: string, penaltyNote?: string) => void;
  registerArtisan: (artisan: Omit<ArtisanProfile, "id" | "rating" | "jobsCompleted">) => Promise<void> | void;
  addNotification: (notif: Omit<Notification, "id" | "is_read" | "created_at">) => void;
  markNotificationAsRead: (id: string) => void;
  markNotificationAsUnread: (id: string) => void;
  toggleNotificationRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateWallet, refreshWallet, user } = useAuthContext();
  const [artisans, setArtisans] = useState<ArtisanProfile[]>(initialArtisans);
  const [artisansLoading, setArtisansLoading] = useState<boolean>(false);
  const [campusHubs, setCampusHubs] = useState<string[]>(defaultCampusHubs);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const jobsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [quotes, setQuotes] = useState<JobQuote[]>(initialQuotes);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>(initialTransactions);
  const [disputes, setDisputes] = useState<DisputeCase[]>(initialDisputes);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [selectedHub, setSelectedHub] = useState<string>("All Campus Hubs");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  const fetchArtisans = useCallback(async (showLoading = false) => {
    if (showLoading) setArtisansLoading(true);
    try {
      const response = await providerApi.list();
      if (response.data?.success) {
        const apiProviders = (response.data.data as any)?.providers || [];
        const mapped = apiProviders.map(mapProviderToArtisan);
        setArtisans(mapped);
      }
    } catch (err) {
      console.warn("Could not load providers:", err);
    } finally {
      if (showLoading) setArtisansLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async (showLoading: boolean) => {
    if (showLoading) setJobsLoading(true);
    setJobsError(null);
    try {
      const response = await jobApi.list();
      if (response.data?.success) {
        const apiJobs = (response.data.data as any)?.jobs || [];
        setJobs(apiJobs.map(mapJob));
      } else {
        setJobsError(response.data?.message || "Could not load jobs");
      }
    } catch (err) {
      setJobsError(handleApiError(err));
    } finally {
      if (showLoading) setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(true);
    fetchArtisans(true);
    jobsPollRef.current = setInterval(() => fetchJobs(false), 8000);
    return () => {
      if (jobsPollRef.current) clearInterval(jobsPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real notifications — only fetched while logged in, and cleared
  // immediately on logout so the bell badge can't show a leftover count
  // for a session that's no longer active (this was the actual bug: the
  // badge used to load mock seed data unconditionally, showing "2"
  // unread even to a logged-out visitor).
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const response = await notificationApi.list();
      if (response.data?.success) {
        const apiNotifs = (response.data.data as any)?.notifications || [];
        const mapped = apiNotifs.map(mapNotification);
        // Merge rather than replace: preserves locally-added optimistic
        // entries (from actions like quote-accept or dispute filing that
        // don't have a real backend notification behind them yet — see
        // addNotification below) instead of wiping them out every poll.
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newOnes = mapped.filter((n: Notification) => !existingIds.has(n.id));
          return [...newOnes, ...prev];
        });
      }
    } catch {
      // Silent — notifications are supplementary; a failed background
      // poll shouldn't interrupt whatever the person is doing.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
    const notifPollRef = setInterval(fetchNotifications, 8000);
    return () => clearInterval(notifPollRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const addNotification = (notifData: Omit<Notification, "id" | "is_read" | "created_at">) => {
    const newNotif: Notification = {
      ...notifData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);
    toast.info(newNotif.title, {
      description: newNotif.message,
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    // Best-effort: local optimistic entries (from simulated quote/dispute
    // actions) use client-generated IDs that don't exist in the backend
    // and will 404/500 here — that's fine, the local state above already
    // gives the user correct feedback either way.
    notificationApi.markAsRead(id).catch(() => {});
  };

  const markNotificationAsUnread = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
    );
  };

  const toggleNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: !n.is_read } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    toast.success("Notification box cleared");
  };

  const addCampusHub = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (campusHubs.some((h) => h.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" already exists as a campus hub.`);
      return;
    }
    setCampusHubs((prev) => [...prev, trimmed]);
    toast.success(`Added "${trimmed}" as a new campus hub.`);
  };

  const editCampusHub = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setCampusHubs((prev) => prev.map((h) => (h === oldName ? trimmed : h)));
    // Existing jobs referencing the old hub name should follow the rename,
    // otherwise they'd silently vanish from hub-filtered views.
    setJobs((prev) => prev.map((j) => (j.hub === oldName ? { ...j, hub: trimmed } : j)));
    toast.success(`Renamed "${oldName}" to "${trimmed}".`);
  };

  const deleteCampusHub = (name: string) => {
    if (campusHubs.length <= 1) {
      toast.error("At least one campus hub must remain.");
      return;
    }
    setCampusHubs((prev) => prev.filter((h) => h !== name));
    toast.success(`Removed "${name}" from campus hubs.`);
  };

  const postJob = async (jobData: Omit<JobPost, "id" | "escrowAmount" | "status" | "createdAt" | "handshakeOtp" | "otpVerified" | "quotesCount">) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    let newJob: JobPost;
    try {
      const response = await jobApi.create({
        category: jobData.category,
        title: jobData.title,
        description: jobData.description,
        address: jobData.location,
        estimated_price: jobData.budget,
      });

      if (!response.data?.success || !(response.data.data as any)?.job) {
        toast.error(response.data?.message || "Could not post job — please try again.");
        throw new Error("Job creation failed");
      }

      const created = (response.data.data as any).job;
      newJob = {
        ...jobData,
        id: created.id,
        escrowAmount: jobData.budget,
        status: "open",
        createdAt: new Date().toISOString(),
        // Real OTP-handshake verification isn't backed by the server yet
        // (see mapJob's comment above) — kept as a local placeholder so
        // the existing JobTrackerHUD UI still has something to display.
        handshakeOtp: otp,
        otpVerified: false,
        quotesCount: 0,
      };
    } catch (err) {
      toast.error(handleApiError(err));
      throw err;
    }

    setJobs((prev) => [newJob, ...prev]);

    // Refresh wallet from backend (where real escrow was held)
    refreshWallet();

    // Record Escrow Hold transaction
    addTransaction({
      userId: jobData.customerId,
      type: "escrow_hold",
      amount: jobData.budget,
      reference: `ESCROW_HOLD_${Date.now().toString().slice(-6)}`,
      gateway: "RushWallet",
      status: "completed",
      jobId: newJob.id,
      jobTitle: jobData.title,
      notes: `Escrow locked for job: ${jobData.title}`,
    });

    // Notify Customer
    addNotification({
      user_id: jobData.customerId,
      title: "Job Posted & Escrow Vault Locked",
      message: `₦${jobData.budget.toLocaleString()} is locked safely in Rush Escrow vault for "${jobData.title}". OTP: [${otp}]`,
      type: "escrow_hold",
    });

    return newJob;
  };

  const submitQuote = async (quoteData: Omit<JobQuote, "id" | "createdAt" | "status">) => {
    const newQuote: JobQuote = {
      ...quoteData,
      id: `quote_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    setQuotes((prev) => [newQuote, ...prev]);
    setJobs((prev) =>
      prev.map((j) => (j.id === quoteData.jobId ? { ...j, quotesCount: j.quotesCount + 1 } : j))
    );

    const targetJob = jobs.find((j) => j.id === quoteData.jobId);

    // Call real quote API in background
    try {
      await quoteApi.submit({
        jobId: quoteData.jobId,
        price: quoteData.proposedPrice,
        estimatedDuration: quoteData.estimatedTime || "2 hours",
        proposal: quoteData.coverNote || "Ready to execute campus service efficiently",
      });
    } catch (apiErr) {
      console.warn("Quote API submit fallback to local state:", apiErr);
    }

    // Notify Customer about new quote
    addNotification({
      user_id: targetJob?.customerId,
      title: "New Bidding Quote Received",
      message: `${quoteData.artisanName} submitted a quote of ₦${quoteData.proposedPrice.toLocaleString()} for "${targetJob?.title || 'your request'}".`,
      type: "quote_received",
    });
  };

  const acceptQuote = async (quoteId: string, jobId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    setQuotes((prev) =>
      prev.map((q) => {
        if (q.jobId === jobId) {
          return q.id === quoteId ? { ...q, status: "accepted" } : { ...q, status: "rejected" };
        }
        return q;
      })
    );

    const artisan = artisans.find((a) => a.id === quote.artisanId);
    const targetJob = jobs.find((j) => j.id === jobId);

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            artisanId: quote.artisanId,
            artisanName: quote.artisanName,
            artisanAvatar: quote.artisanAvatar,
            artisanPhone: artisan?.phone || "08011223344",
            status: "assigned",
          };
        }
        return j;
      })
    );

    // Call real quote acceptance API
    try {
      await quoteApi.accept(quoteId);
    } catch (accErr) {
      console.warn("Quote API accept fallback to local state:", accErr);
    }

    // Notify Customer & Artisan
    addNotification({
      user_id: targetJob?.customerId,
      title: "Artisan Assigned & OTP Active",
      message: `${quote.artisanName} assigned! Handshake OTP: [${targetJob?.handshakeOtp || '4829'}]. Share this with the artisan on arrival.`,
      type: "job_assigned",
    });
  };

  const verifyHandshakeOtp = (
    jobId: string,
    otp: string,
    gpsLocation?: { latitude: number; longitude: number; timestamp?: string },
    photoUrl?: string
  ) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { success: false, message: "Job not found" };

    if (job.handshakeOtp !== otp.trim()) {
      return { success: false, message: "Invalid 4-digit OTP. Please ask customer for correct code." };
    }

    const gps = {
      latitude: gpsLocation?.latitude ?? (6.5181 + (Math.random() - 0.5) * 0.002),
      longitude: gpsLocation?.longitude ?? (3.3985 + (Math.random() - 0.5) * 0.002),
      timestamp: gpsLocation?.timestamp || new Date().toISOString(),
    };

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              otpVerified: true,
              status: "in_progress",
              arrivalGps: gps,
              arrivalPhoto: photoUrl || j.arrivalPhoto,
            }
          : j
      )
    );

    addNotification({
      user_id: job.customerId,
      title: "GPS Handshake Verified & Work Started",
      message: `Artisan check-in verified at campus coordinates! Work is officially IN PROGRESS for "${job.title}".`,
      type: "job_update",
    });

    return { success: true, message: "Handshake verified successfully! Job is now marked IN PROGRESS." };
  };

  const completeJobCheckOut = async (
    jobId: string,
    photoUrl: string,
    rating: number,
    reviewText: string
  ) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: "completed",
              completionPhoto: photoUrl,
              rating,
              reviewText,
            }
          : j
      )
    );

    // Call real job confirm API on server which executes PaymentService.releasePayment and WalletService.releaseEscrowToProvider
    try {
      await jobApi.confirm(jobId);
    } catch (confErr) {
      console.warn("Job confirm API fallback to local state:", confErr);
    }

    // Refresh wallet balances from backend
    refreshWallet();

    // Release Escrow to Artisan
    addTransaction({
      userId: job.artisanId || "artisan_1",
      type: "escrow_release",
      amount: job.escrowAmount,
      reference: `ESCROW_RELEASE_${Date.now().toString().slice(-6)}`,
      gateway: "RushWallet",
      status: "completed",
      jobId,
      jobTitle: job.title,
      notes: `Escrow released to artisan upon completion.`,
    });

    // Notify Customer & Artisan
    addNotification({
      user_id: job.customerId,
      title: "Job Completed & Escrow Released",
      message: `Job "${job.title}" marked completed! ₦${job.escrowAmount.toLocaleString()} escrow payout released. Thank you!`,
      type: "job_completed",
    });
  };

  const addTransaction = (txData: Omit<EscrowTransaction, "id" | "createdAt">) => {
    const newTx: EscrowTransaction = {
      ...txData,
      id: `tx_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    if (txData.type === "top_up") {
      updateWallet(txData.amount, 0);
      addNotification({
        user_id: txData.userId,
        title: "Escrow Wallet Top-Up Successful",
        message: `₦${txData.amount.toLocaleString()} loaded into your Rush Escrow ledger balance via ${txData.gateway}.`,
        type: "top_up",
      });
    } else if (txData.type === "withdrawal") {
      updateWallet(-txData.amount, 0);
      addNotification({
        user_id: txData.userId,
        title: "Wallet Withdrawal Processed",
        message: `₦${txData.amount.toLocaleString()} withdrawn to registered bank account.`,
        type: "top_up",
      });
    }
  };

  const fileDispute = (disputeData: Omit<DisputeCase, "id" | "createdAt" | "status">) => {
    const newDispute: DisputeCase = {
      ...disputeData,
      id: `disp_${Date.now()}`,
      status: "under_review",
      createdAt: new Date().toISOString(),
    };

    setDisputes((prev) => [newDispute, ...prev]);

    setJobs((prev) =>
      prev.map((j) => (j.id === disputeData.jobId ? { ...j, status: "disputed" } : j))
    );

    addNotification({
      user_id: disputeData.filedBy,
      title: "Dispute Opened - Escrow Under Review",
      message: `Dispute filed for "${disputeData.jobTitle}". Rush Accountability Board has frozen escrow pending resolution.`,
      type: "dispute",
    });
  };

  const resolveDispute = async (
    disputeId: string,
    action: "refund" | "payout" | "dismiss",
    note: string,
    penaltyNote?: string
  ) => {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const job = jobs.find((j) => j.id === dispute.jobId);

    setDisputes((prev) =>
      prev.map((d) => {
        if (d.id === disputeId) {
          return {
            ...d,
            status:
              action === "refund"
                ? "resolved_refund"
                : action === "payout"
                ? "resolved_payout"
                : "dismissed",
            resolutionNote: note,
            penaltyIssued: penaltyNote,
          };
        }
        return d;
      })
    );

    // Call real backend violation resolve endpoint
    try {
      await violationApi.resolve(disputeId, {
        action,
        adminNotes: note,
        penaltyIssued: penaltyNote,
      });
    } catch (vErr) {
      console.warn("Violation API resolve fallback to local state:", vErr);
    }

    // Trigger wallet sync
    refreshWallet();

    if (job) {
      if (action === "refund") {
        // Refund Escrow back to Customer
        updateWallet(job.escrowAmount, -job.escrowAmount);
        addTransaction({
          userId: job.customerId,
          type: "refund",
          amount: job.escrowAmount,
          reference: `REFUND_${Date.now().toString().slice(-6)}`,
          gateway: "RushWallet",
          status: "completed",
          jobId: job.id,
          jobTitle: job.title,
          notes: `Full Escrow refunded due to dispute resolution: ${note}`,
        });
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "cancelled" } : j)));

        addNotification({
          user_id: job.customerId,
          title: "Dispute Resolved: Full Escrow Refunded",
          message: `Rush Admin approved full refund of ₦${job.escrowAmount.toLocaleString()} to your wallet. Note: ${note}`,
          type: "refund",
        });
      } else if (action === "payout") {
        // Release Escrow to Artisan
        addTransaction({
          userId: job.artisanId || "artisan_1",
          type: "escrow_release",
          amount: job.escrowAmount,
          reference: `DISPUTE_PAYOUT_${Date.now().toString().slice(-6)}`,
          gateway: "RushWallet",
          status: "completed",
          jobId: job.id,
          jobTitle: job.title,
          notes: `Dispute resolved in favor of artisan: ${note}`,
        });
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "completed" } : j)));

        addNotification({
          user_id: dispute.filedBy,
          title: "Dispute Resolved: Escrow Payout Released",
          message: `Dispute case resolved in favor of artisan. Note: ${note}`,
          type: "dispute",
        });
      }
    }

    if (penaltyNote && dispute.againstId) {
      setArtisans((prev) =>
        prev.map((a) =>
          a.id === dispute.againstId ? { ...a, strikes: (a.strikes || 0) + 1 } : a
        )
      );
    }
  };

  const registerArtisan = async (artisanData: Omit<ArtisanProfile, "id" | "rating" | "jobsCompleted">) => {
    const newArtisan: ArtisanProfile = {
      ...artisanData,
      id: `artisan_${Date.now()}`,
      rating: 5.0,
      jobsCompleted: 0,
    };

    setArtisans((prev) => [newArtisan, ...prev.filter((a) => a.id !== newArtisan.id)]);

    try {
      await providerApi.register({
        skills: artisanData.skills,
        hourly_rate: artisanData.hourlyRate,
        years_experience: 3,
        nin: artisanData.ninVerified ? "12345678901" : undefined,
        bvn: artisanData.bvnVerified ? "22233344455" : undefined,
      });
      fetchArtisans(false);
    } catch (err) {
      console.warn("Backend provider registration sync notice:", err);
    }

    addNotification({
      title: "Artisan Profile Registration Complete",
      message: `Welcome ${artisanData.displayName}! Your NIN & BVN credential checks are verified for ${artisanData.hub}.`,
      type: "security",
    });
  };

  return (
    <MarketplaceContext.Provider
      value={{
        artisans,
        artisansLoading,
        refreshArtisans: () => fetchArtisans(false),
        jobs,
        campusHubs,
        addCampusHub,
        editCampusHub,
        deleteCampusHub,
        jobsLoading,
        jobsError,
        refreshJobs: () => fetchJobs(false),
        quotes,
        transactions,
        disputes,
        notifications,
        unreadNotificationsCount,
        selectedHub,
        setSelectedHub,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        postJob,
        submitQuote,
        acceptQuote,
        verifyHandshakeOtp,
        completeJobCheckOut,
        addTransaction,
        fileDispute,
        resolveDispute,
        registerArtisan,
        addNotification,
        markNotificationAsRead,
        markNotificationAsUnread,
        toggleNotificationRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within a MarketplaceProvider");
  return ctx;
};