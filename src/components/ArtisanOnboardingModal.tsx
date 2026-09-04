import React, { useState } from "react";
import { X, ShieldCheck, UserCheck, CreditCard, Building } from "lucide-react";
import { useMarketplace } from "../context/MarketplaceContext";

interface ArtisanOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArtisanOnboardingModal: React.FC<ArtisanOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { registerArtisan, campusHubs } = useMarketplace();

  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [category, setCategory] = useState<string>("Plumbing & Leak Repairs");
  const [skillsText, setSkillsText] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<number>(3500);
  const [hub, setHub] = useState<string>(campusHubs[0] || "Unilag Akoka Campus");
  const [bio, setBio] = useState<string>("");
  const [nin, setNin] = useState<string>("");
  const [bvn, setBvn] = useState<string>("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    registerArtisan({
      displayName,
      email,
      phone,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || "Artisan")}&background=0D9488&color=fff`,
      category,
      skills: skillsText.trim()
        ? skillsText.split(",").map((s) => s.trim()).filter(Boolean)
        : [category],
      hourlyRate,
      hub,
      ninVerified: !!nin,
      bvnVerified: !!bvn,
      verificationStatus: "verified",
      bio: bio || `${category} technician available across ${hub}.`,
      badge: "Verified Artisan",
      isAvailable: true,
      strikes: 0,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Artisan Biometric Onboarding (NIN & BVN)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Samuel Kazeem"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NIN (11 Digits)
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                BVN (11 Digits)
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={bvn}
                onChange={(e) => setBvn(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Category
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
                <option value="Generator Repair">Generator Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hourly Base Rate (₦)
              </label>
              <input
                type="number"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Campus Hub Base
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Skills (comma separated)
            </label>
            <input
              type="text"
              required
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Short Bio / Experience
            </label>
            <textarea
              rows={2}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. 5 years experience in Unilag student hostels repairing AC gas leaks and piping..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              By submitting, your NIN & BVN records will be cross-referenced with NIMC databases.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              Register & Verify Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
