// ============================================================
// USER & AUTH TYPES — multi-capability account model
// (mirrors server/models/User.ts exactly)
// ============================================================

/**
 * Marketplace capabilities a user can hold. CUSTOMER is implicit on
 * every account. VENDOR / SERVICE_PROVIDER / RIDER are activated via
 * /api/onboarding/* — they don't get added at registration.
 */
export type Capability =
  | 'CUSTOMER'
  | 'VENDOR'
  | 'SERVICE_PROVIDER'
  | 'RIDER';

/**
 * Operational/admin roles, kept separate from marketplace identity.
 * Assigned internally — never self-activated.
 */
export type SystemRole = 'ADMIN' | 'DISPATCHER' | 'SUPPORT';

/**
 * Per-capability verification state. A capability is only "usable"
 * when (a) it appears in `user.capabilities[]` AND (b) its entry here
 * is ACTIVE. Auth middleware on the backend checks both.
 */
export type CapabilityStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

/**
 * Legacy role strings still referenced by older frontend code paths
 * (AuthContext, useAuth, App.tsx routing logic). Kept for backward
 * compat — the actual authz decision is made by `capabilities[]` +
 * `capabilityStatus{}` on the backend.
 */
export type UserRole =
  | 'customer'
  | 'vendor'
  | 'service_provider'
  | 'rider'
  | 'admin'
  | 'support'
  | 'dispatcher';

export interface User {
  id?: string;
  uid?: string;
  email: string;
  phone?: string;
  full_name?: string;
  displayName?: string;

  /** Marketplace capabilities. CUSTOMER is always present. */
  capabilities?: Capability[];
  /** Operational/admin roles. */
  system_roles?: SystemRole[];
  /** Per-capability verification state map. */
  capability_status?: Partial<Record<Exclude<Capability, 'CUSTOMER'>, CapabilityStatus>>;
  /** UI hint: which workspace the user is currently viewing. */
  active_workspace?: Capability;

  /** Legacy single-role string — kept for components that haven't
   *  been migrated yet. Derived from active_workspace on login. */
  role?: string;
  /** Legacy plural — kept as alias for capabilities[]. */
  roles?: string[];

  is_verified?: boolean;
  is_active?: boolean;
  profile_picture?: string;
  avatar?: string;
  walletBalance?: number;
  escrowHeld?: number;
  campusHub?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

// ============================================================
// VENDOR PROFILE + PRODUCT TYPES
// ============================================================

export interface VendorProfile {
  id: string;
  business_name: string;
  slug: string;
  description?: string;
  logo?: string | null;
  cover_image?: string | null;
  category?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  location?: {
    country?: string;
    state?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
  store_theme?: string;
  store_cover_color?: string;
  store_visibility?: 'PUBLIC' | 'LINK_ONLY' | 'PRIVATE';
  delivery_enabled?: boolean;
  delivery_fee?: number;
  delivery_radius_km?: number;
  estimated_delivery_hours?: number;
  store_views?: number;
  total_products?: number;
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  category?: string | null;
  tags: string[];
  price: number;
  compare_at_price?: number | null;
  stock: number;
  status: ProductStatus;
  views?: number;
  total_sold?: number;
  rating?: number;
  created_at?: string;
}

// ============================================================
// CART + ORDER TYPES
// ============================================================

export interface CartItem {
  product_id: string;
  vendor_id: string;
  vendor_name?: string;
  product_name: string;
  product_image?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  added_at: string;
}

export interface Cart {
  items: CartItem[];
  vendor_subtotals: { vendor_id: string; subtotal: number }[];
  total: number;
  total_items: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'HELD';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  vendor_name?: string | null;
  vendor_slug?: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  service_fee?: number;
  total: number;
  payment_status: OrderPaymentStatus;
  order_status: OrderStatus;
  delivery_address: {
    fullName: string;
    phone: string;
    address: string;
    city?: string;
    state?: string;
    notes?: string;
  };
  tracking_code?: string;
  created_at: string;
}

// ============================================================
// PROVIDER TYPES (service provider)
// ============================================================

export type VerificationLevel = 'basic' | 'verified' | 'certified';

export interface Provider {
  id: string;
  user_id: string;
  skills: string[];
  years_experience: number;
  hourly_rate?: number;
  service_radius_km: number;
  verification_level: VerificationLevel;
  is_available: boolean;
  rating: number;
  total_jobs_completed: number;
  total_jobs_cancelled: number;
  compliance_score: number;
  portfolio_urls: string[];
  current_latitude?: number;
  current_longitude?: number;
  nin?: string;
  bvn?: string;
  id_card_url?: string;
  created_at?: string;
  updated_at?: string;
  user?: User;
}

// ============================================================
// JOB TYPES
// ============================================================

export type JobStatus =
  | 'posted'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface Job {
  id: string;
  customer_id: string;
  provider_id?: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  address: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  status: JobStatus;
  estimated_price?: number;
  final_price?: number;
  start_time?: string;
  end_time?: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_photo?: string;
  check_out_photo?: string;
  created_at: string;
  updated_at?: string;
  customer?: User;
  provider?: Provider;
}

// ============================================================
// PAYMENT & ESCROW TYPES
// ============================================================

export type PaymentGateway = 'opay' | 'paystack' | 'flutterwave';
export type PaymentStatus =
  | 'pending'
  | 'held'
  | 'released'
  | 'refunded'
  | 'failed'
  | 'disputed';

export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  platform_fee: number;
  provider_earnings: number;
  provider: PaymentGateway;
  reference: string;
  status: PaymentStatus;
  held_at?: string;
  released_at?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================
// VIOLATIONS & COMPLIANCE
// ============================================================

export type ViolationSeverity = 'minor' | 'major' | 'critical';
export type ViolationStatus =
  | 'pending_review'
  | 'confirmed'
  | 'dismissed'
  | 'appealed'
  | 'resolved';

export interface Violation {
  id: string;
  user_id: string;
  job_id?: string;
  type: string;
  severity: ViolationSeverity;
  title: string;
  description: string;
  status: ViolationStatus;
  points_deducted: number;
  created_at: string;
  updated_at?: string;
}

// ============================================================
// NOTIFICATIONS & REVIEWS
// ============================================================

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Rating {
  id: string;
  job_id: string;
  rater_id: string;
  target_id: string;
  rating: number;
  comment?: string;
  categories?: Record<string, number>;
  created_at: string;
}

// ============================================================
// API RESPONSE HELPERS
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
