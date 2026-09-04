import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  MapPin,
  Camera,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  Upload,
  Star,
  User,
  Phone,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useMarketplace } from "../context/MarketplaceContext";
import { useAuthContext } from "../context/AuthContext";

export const JobTrackerHUD: React.FC = () => {
  const { user } = useAuthContext();
  const { jobs, verifyHandshakeOtp, completeJobCheckOut, fileDispute } = useMarketplace();

  // Active / Trackable Jobs
  const trackableJobs = jobs.filter(
    (j) => j.status === "assigned" || j.status === "in_progress" || j.status === "completed"
  );

  const [selectedJobId, setSelectedJobId] = useState<string>(
    trackableJobs[0]?.id || jobs[0]?.id || ""
  );

  const currentJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  // OTP Verification Form State
  const [inputOtp, setInputOtp] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");
  const [otpSuccess, setOtpSuccess] = useState<string>("");

  // Check-Out Completion Form State
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("Job well done, arrived on time!");
  const [completionPhotoUrl, setCompletionPhotoUrl] = useState<string>(
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80"
  );

  // Dispute Filing Form State
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>("Quality Issue");
  const [disputeDesc, setDisputeDesc] = useState<string>("");

  if (!currentJob) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <Clock className="w-8 h-8 text-slate-300 mx-auto" />
        <h3 className="font-bold text-sm text-slate-800">No Jobs Active to Track</h3>
        <p className="text-xs text-slate-500">Post a request or accept a bid to view live HUD.</p>
      </div>
    );
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setOtpSuccess("");

    const res = verifyHandshakeOtp(currentJob.id, inputOtp);
    if (res.success) {
      setOtpSuccess(res.message);
      setInputOtp("");
    } else {
      setOtpError(res.message);
    }
  };

  const handleCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    completeJobCheckOut(currentJob.id, completionPhotoUrl, rating, reviewText);
  };

  const handleFileDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    fileDispute({
      jobId: currentJob.id,
      jobTitle: currentJob.title,
      filedBy: user.uid,
      filedByName: user.displayName,
      filedByRole: user.role,
      againstId: currentJob.artisanId || "unassigned",
      againstName: currentJob.artisanName || "Artisan",
      reason: disputeReason,
      description: disputeDesc,
    });

    setShowDisputeModal(false);
    setDisputeDesc("");
  };

  // Step Calculation
  const isAssigned = currentJob.status !== "open";
  const isOtpDone = currentJob.otpVerified || currentJob.status === "in_progress" || currentJob.status === "completed";
  const isCompleted = currentJob.status === "completed";

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-400">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              Live Job Execution Tracker HUD
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time GPS Check-in, Handshake OTP verification, and photographic job completion ledger.
          </p>
        </div>

        {/* Job Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Select Job:</span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 rounded-lg outline-none cursor-pointer"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                #{j.id.slice(-5)} - {j.title.slice(0, 25)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-orange-600 tracking-wider">
              Tracked Order
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              {currentJob.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Location: {currentJob.location}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Escrow Locked
            </span>
            <p className="text-lg font-black text-emerald-600">
              ₦{currentJob.escrowAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Stepper Graphic */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
          {/* Step 1 */}
          <div className={`p-4 rounded-xl border transition ${isAssigned ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Step 1</span>
              <CheckCircle2 className={`w-4 h-4 ${isAssigned ? "text-emerald-600" : "text-slate-300"}`} />
            </div>
            <h4 className="font-bold text-xs text-slate-900">Artisan Assigned</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {currentJob.artisanName || "Awaiting quote acceptance"}
            </p>
          </div>

          {/* Step 2 */}
          <div className={`p-4 rounded-xl border transition ${isOtpDone ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Step 2</span>
              <KeyRound className={`w-4 h-4 ${isOtpDone ? "text-emerald-600" : "text-amber-500"}`} />
            </div>
            <h4 className="font-bold text-xs text-slate-900">Handshake OTP & GPS</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isOtpDone ? "GPS Logged & OTP Verified" : "Artisan must enter client OTP"}
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-4 rounded-xl border transition ${isCompleted ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Step 3</span>
              <ShieldCheck className={`w-4 h-4 ${isCompleted ? "text-emerald-600" : "text-slate-300"}`} />
            </div>
            <h4 className="font-bold text-xs text-slate-900">Photo Proof & Check-Out</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isCompleted ? "Escrow Funds Released" : "Photo audit before payout"}
            </p>
          </div>
        </div>
      </div>

      {/* Main HUD Body: OTP Verification & Customer Handshake Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OTP Code Display Box (Client Side) & OTP Verification Form (Artisan Side) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-orange-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                4-Digit Security Handshake OTP
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
              GPS Enforced
            </span>
          </div>

          {/* Customer View of OTP */}
          <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 text-center space-y-2">
            <p className="text-[11px] text-orange-800 font-bold">
              CUSTOMER HANDSHAKE CODE:
            </p>
            <div className="text-3xl font-black tracking-widest text-orange-600 font-mono">
              {currentJob.handshakeOtp}
            </div>
            <p className="text-[10px] text-orange-700">
              Only read this code to the artisan AFTER they arrive at your campus hostel/room.
            </p>
          </div>

          {/* Artisan Verification Input */}
          {!currentJob.otpVerified && currentJob.status !== "completed" && (
            <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Artisan Check-in: Enter Client's 4-Digit OTP Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 4821"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-bold tracking-widest outline-none focus:bg-white focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                >
                  Verify GPS & OTP
                </button>
              </div>

              {otpError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg font-medium border border-red-200">
                  {otpError}
                </div>
              )}

              {otpSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg font-medium border border-emerald-200">
                  {otpSuccess}
                </div>
              )}
            </form>
          )}

          {currentJob.arrivalGps && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>GPS Coordinates Logged:</span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 pl-5">
                Lat: {currentJob.arrivalGps.latitude.toFixed(4)}, Long: {currentJob.arrivalGps.longitude.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* Completion Check-Out & Escrow Payout Trigger */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Job Completion & Escrow Payout
              </h3>
            </div>
            <button
              onClick={() => setShowDisputeModal(true)}
              className="text-[11px] text-red-600 font-bold hover:underline"
            >
              File Dispute
            </button>
          </div>

          {currentJob.status === "completed" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-slate-900 text-sm">
                Job Successfully Completed & Paid
              </h4>
              <p className="text-xs text-slate-600">
                Escrow payout of ₦{currentJob.escrowAmount.toLocaleString()} has been transferred to artisan's wallet ledger.
              </p>
              {currentJob.reviewText && (
                <div className="bg-white p-3 rounded-lg text-xs italic text-slate-700 border border-emerald-100">
                  "{currentJob.reviewText}" - ★ {currentJob.rating}/5
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCheckOut} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Completion Proof Photo (Mock Upload)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={completionPhotoUrl}
                    onChange={(e) => setCompletionPhotoUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rate Artisan Performance
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client Feedback
                </label>
                <textarea
                  rows={2}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition"
              >
                Approve Completion & Release ₦{currentJob.escrowAmount.toLocaleString()} Escrow
              </button>
            </form>
          )}
        </div>
      </div>

      {/* DISPUTE MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900">
              File Accountability Case / Dispute
            </h3>
            <p className="text-xs text-slate-500">
              Escrow funds will remain frozen in Rush Merchant ledger until admin audit.
            </p>

            <form onSubmit={handleFileDisputeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dispute Category
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Quality Issue">Unsatisfactory Quality / Damage</option>
                  <option value="No Show">Artisan No-Show</option>
                  <option value="Unreasonable Extra Demand">Unreasonable Extra Payment Demand</option>
                  <option value="Unprofessional Conduct">Unprofessional Conduct</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Explanation
                </label>
                <textarea
                  required
                  rows={3}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Explain exactly what happened..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white hover:bg-red-700 font-bold text-xs rounded-lg"
                >
                  Freeze Escrow & File Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
