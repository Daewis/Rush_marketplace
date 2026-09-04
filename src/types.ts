// ============================================================
// Legacy frontend types — kept for components that haven't been
// migrated to the multi-capability model yet (App.tsx routing,
// SidebarNavigation, etc.). New code should use the types in
// ./types/index.ts (Capability, capability_status, etc.).
// ============================================================

import type { Capability, CapabilityStatus, SystemRole } from './types/index';

/**
 * Legacy role strings. The actual authz decision is made by
 * `capabilities[]` + `capabilityStatus{}` on the backend — this is
 * just a UI hint derived from `active_workspace` for routing logic
 * that hasn't been refactored yet.
 *
 * "artisan" is an alias for SERVICE_PROVIDER (kept for the existing
 * ArtisanOnboardingModal / ProviderDashboard imports).
 * "driver" is an alias for RIDER.
 */
export type UserRole = 'customer' | 'vendor' | 'artisan' | 'rider' | 'driver' | 'admin' | 'support' | 'dispatcher';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

export type GatewayType = 'OPay' | 'Paystack' | 'Flutterwave' | 'RushWallet';

export type TransactionType = 'top_up' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'refund';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** Legacy single-role UI hint. Derived from active_workspace. */
  role: UserRole;
  walletBalance: number;
  escrowHeld: number;
  nin?: string;
  bvn?: string;
  ninVerified?: boolean;
  bvnVerified?: boolean;
  campusHub?: string;

  /** NEW: marketplace capabilities this identity holds. */
  capabilities?: Capability[];
  /** NEW: per-capability verification status map. */
  capability_status?: Partial<Record<Exclude<Capability, 'CUSTOMER'>, CapabilityStatus>>;
  /** NEW: which workspace the user is currently viewing. */
  active_workspace?: Capability;
  /** NEW: operational/admin roles (separate from marketplace identity). */
  system_roles?: SystemRole[];
}

export interface ArtisanProfile {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  avatar: string;
  category: string;
  skills: string[];
  hourlyRate: number;
  rating: number;
  jobsCompleted: number;
  hub: string;
  ninVerified: boolean;
  bvnVerified: boolean;
  verificationStatus: VerificationStatus;
  bio: string;
  badge?: string;
  isAvailable: boolean;
  strikes?: number;
}

export interface JobQuote {
  id: string;
  jobId: string;
  artisanId: string;
  artisanName: string;
  artisanAvatar: string;
  artisanRating: number;
  artisanJobsCompleted: number;
  proposedPrice: number;
  estimatedTime: string;
  coverNote: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface JobPost {
  id: string;
  title: string;
  category: string;
  description: string;
  budget: number;
  escrowAmount: number;
  location: string;
  hub: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  artisanId?: string;
  artisanName?: string;
  artisanPhone?: string;
  artisanAvatar?: string;
  status: JobStatus;
  createdAt: string;
  handshakeOtp: string;
  otpVerified: boolean;
  arrivalGps?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  arrivalPhoto?: string;
  completionPhoto?: string;
  rating?: number;
  reviewText?: string;
  quotesCount: number;
}

export interface EscrowTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  reference: string;
  gateway: GatewayType;
  status: 'pending' | 'completed' | 'failed';
  jobId?: string;
  jobTitle?: string;
  createdAt: string;
  notes?: string;
}

export interface DisputeCase {
  id: string;
  jobId: string;
  jobTitle: string;
  filedBy: string;
  filedByName: string;
  filedByRole: UserRole;
  againstId: string;
  againstName: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved_refund' | 'resolved_payout' | 'dismissed';
  createdAt: string;
  resolutionNote?: string;
  penaltyIssued?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  avgCost: string;
  popularServices: string[];
}

export type RideStatus = 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';

export type VehicleType = 'bike' | 'keke' | 'car' | 'van';

export interface DriverProfile {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  avatar: string;
  vehicleType: VehicleType;
  vehiclePlateNumber: string;
  licenseVerified: boolean;
  status: 'offline' | 'available' | 'on_trip';
  rating: number;
  totalTrips: number;
}

export interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  sourceJobId?: string;
  sourceJobTitle?: string;
  pickupName: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffName: string;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  driverLocation?: { lat: number; lng: number };
  itemType?: string;
  notes?: string;
  fare: number;
  status: RideStatus;
  trackingCode: string;
  createdAt: string;
  pickedUpAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface DispatchLogEntry {
  id: string;
  rideId: string;
  event: 'driver_assigned' | 'picked_up' | 'arrived' | 'completed' | 'cancelled';
  createdAt: string;
}

export * from './types/index';
