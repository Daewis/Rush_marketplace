import React, { useState } from "react";
import { X, PlusCircle, ShieldCheck, MapPin, Building, Lock } from "lucide-react";
import { useMarketplace } from "../context/MarketplaceContext";
import { useAuthContext } from "../context/AuthContext";

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthContext();
  const { postJob, selectedHub, campusHubs } = useMarketplace();

  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("Plumbing & Leak Repairs");
  const [description, setDescription] = useState<string>("");
  const [budget, setBudget] = useState<number | string>("");
  const [location, setLocation] = useState<string>("Jaja Hall, Room 304");
  const [hub, setHub] = useState<string>(selectedHub === "All Campus Hubs" ? "Unilag Akoka Campus" : selectedHub);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numericBudget = Number(budget);
    if (!budget || isNaN(numericBudget) || numericBudget < 1000) {
      alert("Please enter a valid escrow budget (Minimum ₦1,000)");
      return;
    }

    if (numericBudget > user.walletBalance) {
      alert(`Your wallet balance (₦${user.walletBalance.toLocaleString()}) is insufficient for ₦${numericBudget.toLocaleString()} escrow lock. Please top-up in the Wallet tab.`);
      return;
    }

    setLoading(true);

    try {
      await postJob({
        title,
        category,
        description,
        budget: numericBudget,
        location,
        hub,
        customerId: user.uid,
        customerName: user.displayName,
        customerPhone: user.phone,
        customerAvatar: user.avatar,
      });

      onClose();
      setTitle("");
      setDescription("");
      setBudget("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-orange-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Post Campus Repair Request
            </h3>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Job Title / Short Problem Summary
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Leaking Pipe behind Bathroom Sink"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
              >
                <option value="Plumbing & Leak Repairs">Plumbing & Leak Repairs</option>
                <option value="Electrical & Solar Power">Electrical & Solar Power</option>
                <option value="AC Servicing & Gas Refill">AC Servicing & Gas Refill</option>
                <option value="Carpentry & Door Locksmith">Carpentry & Door Locksmith</option>
                <option value="Painting & Wall Finishing">Painting & Wall Finishing</option>
                <option value="Generator Repair">Generator Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Campus Hub
              </label>
              <select
                value={hub}
                onChange={(e) => setHub(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
              >
                {campusHubs.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Escrow Budget (₦)
            </label>
            <input
              type="number"
              required
              min={1000}
              placeholder="Enter budget in ₦ (e.g. 5000)"
              value={budget}
              onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-black bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Funds will be locked in Rush Escrow until you confirm 4-digit OTP.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Specific Room / Building Address
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Block B, Room 102, Queen Amina Hall"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Problem Description
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the issue, required tools, or urgency..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {budget && Number(budget) > 0
                ? `₦${Number(budget).toLocaleString()} will be automatically locked into Escrow from your Rush wallet upon posting.`
                : "Enter an escrow budget amount above to lock funds upon posting."}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
            >
              {loading ? "Locking Escrow..." : "Confirm & Post Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
