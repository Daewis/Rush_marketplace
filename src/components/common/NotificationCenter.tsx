import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Check,
  Trash2,
  X,
  Briefcase,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Search,
  Copy,
  ExternalLink,
  MailCheck,
  MailOpen,
  Filter,
} from "lucide-react";
import { useMarketplace } from "../../context/MarketplaceContext";
import { Notification } from "../../types";
import { toast } from "sonner";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markNotificationAsUnread,
    toggleNotificationRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useMarketplace();

  const [filter, setFilter] = useState<"all" | "unread" | "read" | "jobs" | "escrow" | "security">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter & Search Logic
  const filteredNotifications = notifications.filter((n) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = n.title.toLowerCase().includes(q);
      const matchesMsg = n.message.toLowerCase().includes(q);
      if (!matchesTitle && !matchesMsg) return false;
    }

    // Category / Read status filter
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    if (filter === "jobs")
      return (
        n.type === "job_update" ||
        n.type === "quote_received" ||
        n.type === "job_assigned" ||
        n.type === "job_completed"
      );
    if (filter === "escrow")
      return (
        n.type === "escrow_hold" ||
        n.type === "escrow_release" ||
        n.type === "top_up" ||
        n.type === "refund"
      );
    if (filter === "security")
      return n.type === "security" || n.type === "dispute" || n.type === "verification";
    return true;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case "quote_received":
      case "job_update":
      case "job_assigned":
        return <Briefcase className="w-4 h-4 text-orange-600" />;
      case "job_completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "escrow_hold":
      case "escrow_release":
      case "top_up":
      case "refund":
        return <Wallet className="w-4 h-4 text-blue-600" />;
      case "dispute":
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case "security":
      case "verification":
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "quote_received":
      case "job_update":
      case "job_assigned":
      case "job_completed":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "escrow_hold":
      case "escrow_release":
      case "top_up":
      case "refund":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "dispute":
        return "bg-red-100 text-red-800 border-red-200";
      case "security":
      case "verification":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  const extractOtp = (message: string) => {
    const match = message.match(/\[(\d{4})\]/);
    return match ? match[1] : null;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Centered Modal Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 my-auto max-h-[85vh] sm:max-h-[80vh] animate-in zoom-in-95 duration-200 z-[100000]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-xl bg-slate-800 border border-slate-700">
              <Bell className="w-5 h-5 text-orange-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Campus Notifications
                </h3>
                {unreadNotificationsCount > 0 ? (
                  <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                    {unreadNotificationsCount} UNREAD
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ALL READ
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {unreadNotificationsCount > 0
                  ? `${unreadNotificationsCount} unread alert${unreadNotificationsCount > 1 ? "s" : ""} requiring attention`
                  : "All campus job, escrow, & security alerts are up to date"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Quick Controls */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications by title or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-800 placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between text-xs px-1">
            <button
              onClick={markAllNotificationsAsRead}
              disabled={unreadNotificationsCount === 0}
              className="flex items-center gap-1.5 font-bold text-orange-600 hover:text-orange-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition text-[11px]"
            >
              <MailCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>

            <button
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
              className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all ({notifications.length})</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                filter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                filter === "unread"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Unread ({unreadNotificationsCount})
            </button>
            <button
              onClick={() => setFilter("read")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                filter === "read"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Read ({notifications.length - unreadNotificationsCount})
            </button>
            <button
              onClick={() => setFilter("jobs")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                filter === "jobs"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => setFilter("escrow")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                filter === "escrow"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Escrow
            </button>
            <button
              onClick={() => setFilter("security")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                filter === "security"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Security
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-sm">
                  {searchQuery ? "No matching notifications" : "No notifications found"}
                </p>
                <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                  {searchQuery
                    ? `No alert matches "${searchQuery}". Try a different search phrase.`
                    : filter === "unread"
                    ? "You have read all your campus notifications!"
                    : "Real-time updates regarding quotes, escrow holds, and job handshakes will appear here."}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const otpCode = extractOtp(notif.message);
              const isExpanded = expandedId === notif.id;

              return (
                <div
                  key={notif.id}
                  className={`rounded-xl border transition flex flex-col relative group ${
                    !notif.is_read
                      ? "bg-orange-50/70 border-orange-200 shadow-2xs"
                      : "bg-white border-slate-200/80 hover:bg-slate-50/80"
                  }`}
                >
                  {/* Card Main Row */}
                  <div
                    onClick={() => {
                      // Expand & mark as read
                      setExpandedId(isExpanded ? null : notif.id);
                      if (!notif.is_read) {
                        markNotificationAsRead(notif.id);
                      }
                    }}
                    className="p-3.5 flex items-start gap-3 cursor-pointer"
                  >
                    {/* Icon Column */}
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs mt-0.5">
                      {getIconForType(notif.type)}
                    </div>

                    {/* Main Text Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <span className="bg-orange-600 text-white text-[9px] px-1.5 py-0.2 rounded font-black shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-bold">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2 break-words font-medium">
                        {notif.message}
                      </p>
                    </div>

                    {/* Dedicated Logic Controls: Mark Read/Unread & Delete */}
                    <div
                      className="flex flex-col items-end justify-between self-stretch shrink-0 gap-1.5 pl-1 border-l border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Mark Read/Unread Button */}
                      <button
                        onClick={() => toggleNotificationRead(notif.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer text-xs flex items-center justify-center ${
                          notif.is_read
                            ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                            : "text-orange-600 bg-orange-100/60 hover:bg-orange-200/70"
                        }`}
                        title={notif.is_read ? "Mark as Unread" : "Mark as Read"}
                      >
                        {notif.is_read ? (
                          <MailOpen className="w-3.5 h-3.5" />
                        ) : (
                          <MailCheck className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Delete Notification Button */}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition cursor-pointer hover:bg-red-50"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Actions Section */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBadgeColor(notif.type)}`}>
                          {notif.type.replace("_", " ")}
                        </span>
                        <span>{new Date(notif.created_at).toLocaleString()}</span>
                      </div>

                      {/* Action Triggers based on context */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {otpCode && (
                          <button
                            onClick={() => copyToClipboard(otpCode, "Handshake OTP")}
                            className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-700 transition cursor-pointer shadow-2xs"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy OTP [{otpCode}]</span>
                          </button>
                        )}

                        {(notif.type === "quote_received" ||
                          notif.type === "job_assigned" ||
                          notif.type === "job_update") && (
                          <button
                            onClick={() => {
                              onClose();
                              onNavigateTab?.("tracker");
                            }}
                            className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Job Tracker HUD</span>
                          </button>
                        )}

                        {(notif.type === "escrow_hold" ||
                          notif.type === "top_up" ||
                          notif.type === "refund") && (
                          <button
                            onClick={() => {
                              onClose();
                              onNavigateTab?.("wallet");
                            }}
                            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open Escrow Vault</span>
                          </button>
                        )}

                        {notif.type === "dispute" && (
                          <button
                            onClick={() => {
                              onClose();
                              onNavigateTab?.("disputes");
                            }}
                            className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Dispute Case</span>
                          </button>
                        )}

                        <button
                          onClick={() => toggleNotificationRead(notif.id)}
                          className="flex items-center gap-1 border border-slate-200 bg-white text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer ml-auto"
                        >
                          {notif.is_read ? "Mark Unread" : "Mark Read"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center shrink-0">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rush Escrow Protection & OTP Verification Active</span>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

