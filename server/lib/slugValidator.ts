/**
 * Slug validator + reserved-words list.
 *
 * Used by:
 *   - VendorProfile onboarding (business/store slug)
 *   - Vendor slug updates
 *   - Future: Provider slug, Product slug
 *
 * Reserved words are route-prefixed and platform-internal paths that
 * must never collide with a user-generated slug. Without this, someone
 * could create `rush.com/store/admin` and confuse routing forever.
 */

export const RESERVED_SLUGS: readonly string[] = [
  // Top-level routes
  'admin',
  'api',
  'auth',
  'login',
  'signup',
  'register',
  'logout',
  'dashboard',
  'settings',
  'account',
  'profile',
  'me',
  'verify',
  'refresh',
  'onboarding',
  // Marketplace nouns
  'products',
  'product',
  'stores',
  'store',
  'services',
  'service',
  'providers',
  'provider',
  'vendors',
  'vendor',
  'riders',
  'rider',
  'drivers',
  'driver',
  'jobs',
  'job',
  'orders',
  'order',
  'cart',
  'checkout',
  'payments',
  'payment',
  'ratings',
  'rating',
  'reviews',
  'review',
  'notifications',
  'notification',
  'violations',
  'violation',
  'categories',
  'category',
  'search',
  'explore',
  // Logistics
  'logistics',
  'rides',
  'ride',
  'dispatch',
  'delivery',
  'deliveries',
  'track',
  'tracking',
  // Brand/namespace
  'rush',
  'rushng',
  'www',
  'app',
  'web',
  'help',
  'support',
  'terms',
  'privacy',
  'about',
  'contact',
  'blog',
  'news',
];

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/;

export interface SlugValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSlugFormat(slug: string): SlugValidationResult {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, reason: 'Slug is required' };
  }
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 3) {
    return { valid: false, reason: 'Slug must be at least 3 characters' };
  }
  if (normalized.length > 48) {
    return { valid: false, reason: 'Slug must be 48 characters or fewer' };
  }
  if (!SLUG_REGEX.test(normalized)) {
    return {
      valid: false,
      reason: 'Slug must be lowercase letters, digits, and hyphens only; cannot start or end with a hyphen; no consecutive hyphens',
    };
  }
  if (RESERVED_SLUGS.includes(normalized)) {
    return { valid: false, reason: `'${normalized}' is a reserved slug` };
  }
  return { valid: true };
}

/**
 * Suggests a slug from a business name — used to prefill the slug input
 * in the onboarding form. Always returns something valid-format (or empty
 * string if the input can't yield anything usable).
 */
export function suggestSlugFromName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
