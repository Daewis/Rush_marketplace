import React, { useState, useEffect } from 'react';
import { X, Store, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { onboardingApi, storeApi, handleApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';

interface VendorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORE_CATEGORIES = [
  'Food & Beverages',
  'Electronics & Gadgets',
  'Fashion & Apparel',
  'Textbooks & Stationery',
  'Groceries & Provisions',
  'Health & Beauty',
  'Hostel & Dorm Essentials',
  'Other',
];

export const VendorOnboardingModal: React.FC<VendorOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, setUser } = useAppStore();
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(STORE_CATEGORIES[0]);
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.phone || '');
  const [city, setCity] = useState('Lagos');
  const [submitting, setSubmitting] = useState(false);

  // Auto suggest slug on name change
  useEffect(() => {
    if (!businessName.trim()) {
      setSlug('');
      setSlugStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await onboardingApi.slugSuggest(businessName);
        if (res.data?.success && res.data.data?.slug) {
          const suggestedSlug = res.data.data.slug;
          setSlug(suggestedSlug);
          checkSlugAvailability(suggestedSlug);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [businessName]);

  const checkSlugAvailability = async (candidateSlug: string) => {
    if (!candidateSlug) return;
    setSlugStatus('checking');
    try {
      const res = await storeApi.checkSlug(candidateSlug);
      if (res.data?.data?.available) {
        setSlugStatus('available');
      } else {
        setSlugStatus('taken');
      }
    } catch {
      setSlugStatus('idle');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error('Please enter a business name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onboardingApi.vendor({
        businessName: businessName.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        category,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        city: city.trim(),
      });

      if (!res.data?.success) {
        toast.error(res.data?.message || 'Could not activate vendor storefront');
        setSubmitting(false);
        return;
      }

      const responseData = res.data.data as any;
      if (user) {
        setUser({
          ...user,
          capabilities: (responseData?.capabilities || [...(user as any).capabilities, 'VENDOR']).map((c: string) =>
            c.toUpperCase()
          ),
          capability_status: responseData?.capability_status || {
            ...(user as any).capability_status,
            VENDOR: 'ACTIVE',
          },
          active_workspace: 'VENDOR',
        } as any);
      }

      toast.success('Vendor storefront activated! Welcome to your Merchant Dashboard.');
      onClose();
    } catch (err: any) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Open Campus Merchant Store</h3>
              <p className="text-xs text-slate-500">Sell products directly to students with instant dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Business / Store Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Campus Tech & Provisions Hub"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Storefront Web Slug
              </label>
              {slugStatus === 'available' && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Available
                </span>
              )}
              {slugStatus === 'taken' && (
                <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Slug taken
                </span>
              )}
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="text-slate-400 font-mono">rush.ng/store/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  checkSlugAvailability(e.target.value);
                }}
                className="bg-transparent flex-1 text-slate-800 font-semibold focus:outline-hidden pl-1"
                placeholder="campus-tech"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Primary Store Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 bg-white"
            >
              {STORE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell campus buyers what you sell, dispatch speed, and warranty..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp Contact
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="08012345678"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !businessName.trim() || slugStatus === 'taken'}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Store...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Activate Storefront</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
