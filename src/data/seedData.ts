import { ArtisanProfile, JobPost, JobQuote, EscrowTransaction, DisputeCase } from "../types";

export const initialArtisans: ArtisanProfile[] = [];

export const initialJobs: JobPost[] = [];

export const initialQuotes: JobQuote[] = [];

export const initialTransactions: EscrowTransaction[] = [];

export const initialDisputes: DisputeCase[] = [];

export const initialNotifications = [
  {
    id: "notif_1",
    user_id: "user_customer_1",
    title: "Quote Received for AC Servicing",
    message: "Engr. Tunde Bakare submitted a quote of ₦14,000 for your Jaja Hall AC Repair job.",
    type: "quote_received",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "notif_2",
    user_id: "user_customer_1",
    title: "Handshake OTP Active",
    message: "Your 4-digit verification OTP for Solar Inverter Installation is active. Share code with artisan upon physical check-in.",
    type: "job_update",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "notif_3",
    user_id: "user_customer_1",
    title: "Escrow Locked Successfully",
    message: "₦15,000 has been locked into Rush Escrow vault for 'AC Leakage & Gas Top-up'.",
    type: "escrow_hold",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "notif_4",
    user_id: "user_customer_1",
    title: "Biometric Identity Verified",
    message: "NIN & BVN verification complete. Your campus account has 100% verified status.",
    type: "security",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const campusHubs = [
  "Unilag Akoka Campus",
  "LASU Ojo Campus",
  "YabaTech Central Hub",
  "UI Ibadan Campus",
  "FUTA Main Campus",
  "OAU Ile-Ife Campus",
  "UNN Nsukka Hub",
  "ABU Zaria Main Campus",
];