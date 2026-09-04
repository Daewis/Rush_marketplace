import React, { useState } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Phone,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  X,
  MessageSquare,
  Lock,
  Search,
} from "lucide-react";
import { JobPost, JobQuote } from "../types";
import { useMarketplace } from "../context/MarketplaceContext";
import { useAuthContext } from "../context/AuthContext";

interface JobBoardProps {
  onOpenPostJob: () => void;
}

export const JobBoard: React.FC<JobBoardProps> = ({ onOpenPostJob }) => {
  const { user } = useAuthContext();
  const {
    jobs,
    quotes,
    selectedHub,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    submitQuote,
    acceptQuote,
  } = useMarketplace();

  // Modal States
  const [biddingJob, setBiddingJob] = useState<JobPost | null>(null);
  const [viewQuotesJob, setViewQuotesJob] = useState<JobPost | null>(null);

  // Quote Form State
  const [proposedPrice, setProposedPrice] = useState<number>(10000);
  const [estimatedTime, setEstimatedTime] = useState<string>("1 Hour");
  const [coverNote, setCoverNote] = useState<string>("");

  // Filter Scope State (default to my_jobs for customers, all for artisans/admins)
  const [scopeFilter, setScopeFilter] = useState<"my_jobs" | "all">(
    user?.role === "customer" ? "my_jobs" : "all"
  );

  const myJobs = user
    ? jobs.filter(
        (job) =>
          job.customerId === user.uid ||
          job.customerId === (user as any).id ||
          (user.displayName && job.customerName === user.displayName) ||
          (user.email && job.customerId === user.email)
      )
    : [];

  // Filter Logic
  const filteredJobs = jobs.filter((job) => {
    const isMyJob =
      user &&
      (job.customerId === user.uid ||
        job.customerId === (user as any).id ||
        (user.displayName && job.customerName === user.displayName) ||
        (user.email && job.customerId === user.email));

    if (scopeFilter === "my_jobs" && !isMyJob) {
      return false;
    }

    const matchesHub =
      selectedHub === "All Campus Hubs" || job.hub === selectedHub;
    const matchesCat =
      selectedCategory === "All" || job.category === selectedCategory;
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesHub && matchesCat && matchesSearch;
  });

  const handleSendQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!biddingJob || !user) return;

    submitQuote({
      jobId: biddingJob.id,
      artisanId: user.uid,
      artisanName: user.displayName,
      artisanAvatar:
        user.avatar ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      artisanRating: 4.9,
      artisanJobsCompleted: 42,
      proposedPrice,
      estimatedTime,
      coverNote,
    });

    setBiddingJob(null);
    setCoverNote("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Active Category Filter */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Campus Job Board & Bidding
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {scopeFilter === "my_jobs"
                ? "Viewing your personal posted repair requests and escrow locks."
                : "Browse open campus repairs. All jobs are 100% funded in Escrow before bidding begins."}
            </p>
          </div>

          {/* Right Controls: Search & Scope Filter Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search campus jobs & tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-orange-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shrink-0 border border-slate-200">
              <button
                onClick={() => setScopeFilter("my_jobs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  scopeFilter === "my_jobs"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Posted Requests ({myJobs.length})
              </button>
              <button
                onClick={() => setScopeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {user?.role === "admin"
                  ? `All Campus Jobs (Admin: ${jobs.length})`
                  : `All Campus Requests (${jobs.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters & Active Search Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-slate-400 font-medium shrink-0">
              Category:
            </span>
            {["All", "Plumbing & Leak Repairs", "Electrical & Solar Power", "AC Servicing & Gas Refill", "Carpentry & Door Locksmith"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          {searchQuery && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-800 px-2.5 py-1 rounded-md text-xs font-semibold">
              <span>Matching: "<strong>{searchQuery}</strong>"</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="hover:text-orange-950 p-0.5"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Active Requests Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No job matches your selected filters in <span className="font-semibold">{selectedHub}</span>. Be the first student or resident to post a request!
          </p>
          <button
            onClick={onOpenPostJob}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-xs hover:bg-orange-700 transition"
          >
            Post a Job to Escrow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const jobQuotes = quotes.filter((q) => q.jobId === job.id);
            const userHasQuoted = jobQuotes.some(
              (q) => q.artisanId === user?.uid
            );

            return (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between space-y-4 relative"
              >
                {/* Status & Escrow Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Escrow Locked
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{job.id.slice(-6)}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      job.status === "open"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : job.status === "assigned"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : job.status === "in_progress"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : job.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {job.status.replace("_", " ")}
                  </span>
                </div>

                {/* Job Content */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                    {job.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Metadata Pills */}
                  <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Building className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{job.hub}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Info & Budget Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        job.customerAvatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={job.customerName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">
                        {job.customerName}
                      </p>
                      <p className="text-[9px] text-slate-400">Verified Student</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-slate-400">
                      Escrow Budget
                    </p>
                    <p className="text-sm font-black text-emerald-600">
                      ₦{job.budget.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="pt-2 flex items-center gap-2">
                  {user?.role === "artisan" && job.status === "open" && (
                    <button
                      onClick={() => {
                        setBiddingJob(job);
                        setProposedPrice(job.budget);
                      }}
                      disabled={userHasQuoted}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                        userHasQuoted
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{userHasQuoted ? "Quote Submitted" : "Submit Proposal Bid"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setViewQuotesJob(job)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {jobQuotes.length} Bid{jobQuotes.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Bidding Form */}
      {biddingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Submit Artisan Quote
                </h3>
                <p className="text-xs text-slate-500">
                  Bidding on: {biddingJob.title}
                </p>
              </div>
              <button
                onClick={() => setBiddingJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proposed Price (₦)
                </label>
                <input
                  type="number"
                  required
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-extrabold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Client locked ₦{biddingJob.budget.toLocaleString()} in Escrow.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Arrival & Duration
                </label>
                <select
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none"
                >
                  <option value="30 Minutes">Within 30 Minutes</option>
                  <option value="1 Hour">1 Hour</option>
                  <option value="2 Hours">2 Hours</option>
                  <option value="Same Day">Later Today</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cover Note / Strategy
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain your approach, equipment available, or warranty guarantee..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Rush Merchant Escrow will hold ₦{proposedPrice.toLocaleString()} securely until the client validates your 4-digit OTP code at job completion.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBiddingJob(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  Confirm & Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quotes / Bids Inspector */}
      {viewQuotesJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Proposals & Quotes
                </h3>
                <p className="text-xs text-slate-500">
                  Job: {viewQuotesJob.title}
                </p>
              </div>
              <button
                onClick={() => setViewQuotesJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bids List */}
            {quotes.filter((q) => q.jobId === viewQuotesJob.id).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold">No bids submitted yet</p>
                <p>Verified artisans on campus will receive instant push notifications.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes
                  .filter((q) => q.jobId === viewQuotesJob.id)
                  .map((quote) => (
                    <div
                      key={quote.id}
                      className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={quote.artisanAvatar}
                            alt={quote.artisanName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-300"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs text-slate-900">
                                {quote.artisanName}
                              </h4>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                                ★ {quote.artisanRating}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              {quote.artisanJobsCompleted} campus jobs completed
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">
                            ₦{quote.proposedPrice.toLocaleString()}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Est: {quote.estimatedTime}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                        "{quote.coverNote}"
                      </p>

                      {/* Accept Quote Action for Client */}
                      {user?.uid === viewQuotesJob.customerId &&
                        viewQuotesJob.status === "open" && (
                          <button
                            onClick={() => {
                              acceptQuote(quote.id, viewQuotesJob.id);
                              setViewQuotesJob(null);
                            }}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                          >
                            Accept & Assign Artisan
                          </button>
                        )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
