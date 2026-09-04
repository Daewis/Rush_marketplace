import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Scale,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useMarketplace } from "../context/MarketplaceContext";
import { useAuthContext } from "../context/AuthContext";

export const AccountabilityCenter: React.FC = () => {
  const { user } = useAuthContext();
  const { disputes, resolveDispute } = useMarketplace();

  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [penaltyNote, setPenaltyNote] = useState<string>("");

  const activeDispute = disputes.find((d) => d.id === selectedDisputeId);

  const handleResolve = (action: "refund" | "payout" | "dismiss") => {
    if (!selectedDisputeId) return;

    resolveDispute(
      selectedDisputeId,
      action,
      resolutionNote || "Arbitration decision reached by Rush Campus Compliance Admin.",
      penaltyNote
    );

    setSelectedDisputeId(null);
    setResolutionNote("");
    setPenaltyNote("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Accountability & Dispute Arbitration Center
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Community trust protection. Escrow holds remain frozen until neutral admin evaluation of GPS logs and job evidence.
          </p>
        </div>

        {user?.role === "admin" && (
          <span className="text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
            Admin Compliance Officer Mode
          </span>
        )}
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900">
          Reported Cases & Escalations ({disputes.length})
        </h3>

        {disputes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700">Zero Active Disputes</p>
            <p>All campus jobs are running smoothly!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((disp) => (
              <div
                key={disp.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      Case #{disp.id.slice(-5)}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                      {disp.reason}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      disp.status === "under_review"
                        ? "bg-amber-100 text-amber-800"
                        : disp.status === "resolved_refund"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {disp.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">
                    Job: {disp.jobTitle}
                  </h4>
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    "{disp.description}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <div>
                    Filed By: <span className="font-bold text-slate-800">{disp.filedByName}</span> ({disp.filedByRole})
                  </div>
                  <div>
                    Against: <span className="font-bold text-slate-800">{disp.againstName}</span>
                  </div>
                </div>

                {disp.resolutionNote && (
                  <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-lg text-xs text-purple-900 space-y-1">
                    <p className="font-bold">Arbitration Resolution:</p>
                    <p>{disp.resolutionNote}</p>
                    {disp.penaltyIssued && (
                      <p className="text-red-600 font-semibold">Penalty: {disp.penaltyIssued}</p>
                    )}
                  </div>
                )}

                {/* Admin Action Button */}
                {user?.role === "admin" && disp.status === "under_review" && (
                  <button
                    onClick={() => setSelectedDisputeId(disp.id)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                  >
                    Review Evidence & Arbitrate Case
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADMIN ARBITRATION MODAL */}
      {activeDispute && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Scale className="w-5 h-5 text-purple-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                Admin Arbitration Case #{activeDispute.id.slice(-5)}
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Arbitration Decision Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Summarize reasons for this decision..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Issue Strike / Penalty (Optional)
                </label>
                <input
                  type="text"
                  value={penaltyNote}
                  onChange={(e) => setPenaltyNote(e.target.value)}
                  placeholder="e.g. 1 Strike Issued to Artisan for No-Show"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleResolve("refund")}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Full Refund Client
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve("payout")}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Payout Artisan
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve("dismiss")}
                  className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Dismiss Claim
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDisputeId(null)}
                className="w-full py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg font-bold"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
