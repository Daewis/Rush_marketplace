import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  X,
  Wrench,
  Users,
  Briefcase,
  Star,
  ShieldCheck,
  MapPin,
  ArrowRight,
  ChevronRight,
  Tag,
  CornerDownLeft,
} from "lucide-react";
import { useMarketplace } from "../../context/MarketplaceContext";
import { categories } from "../../data/categories";
import { useAppStore } from "../../store/app-store";

interface GlobalSearchBarProps {
  className?: string;
  inputClassName?: string;
  isMobile?: boolean;
  onNavigateTab?: (tab: string) => void;
  onCloseMobileMenu?: () => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  className = "",
  inputClassName = "",
  isMobile = false,
  onNavigateTab,
  onCloseMobileMenu,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    artisans,
    jobs,
    setSelectedCategory,
    selectedHub,
  } = useMarketplace();
  const { setView } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const query = searchQuery.trim().toLowerCase();

  // Real-time matched categories
  const matchedCategories = useMemo(() => {
    if (!query) return [];
    return categories
      .filter((cat) => {
        const nameMatch = cat.name.toLowerCase().includes(query);
        const serviceMatch = cat.popularServices.some((s) =>
          s.toLowerCase().includes(query)
        );
        return nameMatch || serviceMatch;
      })
      .slice(0, 4);
  }, [query]);

  // Real-time matched artisans
  const matchedArtisans = useMemo(() => {
    if (!query) return [];
    return artisans
      .filter((artisan) => {
        const hubMatch =
          selectedHub === "All Campus Hubs" || artisan.hub === selectedHub;
        const nameMatch = artisan.displayName.toLowerCase().includes(query);
        const skillMatch = artisan.skills.some((s) =>
          s.toLowerCase().includes(query)
        );
        const catMatch = artisan.category.toLowerCase().includes(query);
        const bioMatch = artisan.bio
          ? artisan.bio.toLowerCase().includes(query)
          : false;
        return hubMatch && (nameMatch || skillMatch || catMatch || bioMatch);
      })
      .slice(0, 4);
  }, [query, artisans, selectedHub]);

  // Real-time matched jobs
  const matchedJobs = useMemo(() => {
    if (!query) return [];
    return jobs
      .filter((job) => {
        const hubMatch =
          selectedHub === "All Campus Hubs" || job.hub === selectedHub;
        const titleMatch = job.title.toLowerCase().includes(query);
        const descMatch = job.description.toLowerCase().includes(query);
        const catMatch = job.category.toLowerCase().includes(query);
        const locMatch = job.location.toLowerCase().includes(query);
        return hubMatch && (titleMatch || descMatch || catMatch || locMatch);
      })
      .slice(0, 4);
  }, [query, jobs, selectedHub]);

  const totalMatches =
    matchedCategories.length + matchedArtisans.length + matchedJobs.length;

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setIsOpen(false);
    if (onNavigateTab) {
      onNavigateTab("jobs");
    } else {
      setView("jobs");
    }
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSelectArtisan = (_artisanId: string) => {
    setIsOpen(false);
    if (onNavigateTab) {
      onNavigateTab("artisans");
    } else {
      setView("providers");
    }
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSelectJob = (_jobId: string) => {
    setIsOpen(false);
    if (onNavigateTab) {
      onNavigateTab("jobs");
    } else {
      setView("jobs");
    }
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleViewAllResults = () => {
    setIsOpen(false);
    if (onNavigateTab) {
      onNavigateTab("jobs");
    } else {
      setView("jobs");
    }
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleViewAllResults();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Bar Input */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search artisans, plumbing, electrical, repairs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (searchQuery.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-9 pr-8 py-2 text-xs bg-slate-100 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none transition ${inputClassName}`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Real-time Results Popover Dropdown */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isMobile ? "max-h-[70vh]" : "max-h-[520px]"
          } overflow-y-auto`}
        >
          {/* Header info */}
          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-orange-500" />
              <span>
                Search for "<span className="text-orange-600 font-bold">{searchQuery}</span>"
              </span>
            </span>
            <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {totalMatches} {totalMatches === 1 ? "match" : "matches"}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {/* 1. Matched Categories */}
            {matchedCategories.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-orange-500" />
                  <span>Service Categories ({matchedCategories.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {matchedCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.name)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-orange-50/80 group transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition truncate">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {cat.popularServices.slice(0, 2).join(" • ")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Matched Verified Artisans */}
            {matchedArtisans.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-500" />
                  <span>Verified Artisans ({matchedArtisans.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {matchedArtisans.map((artisan) => (
                    <button
                      key={artisan.id}
                      type="button"
                      onClick={() => handleSelectArtisan(artisan.id)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50/70 group transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            artisan.avatar ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={artisan.displayName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition truncate">
                              {artisan.displayName}
                            </p>
                            {artisan.ninVerified && (
                              <span
                                title="NIN Verified"
                                className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded shrink-0"
                              >
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>Vetted</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                            <span>{artisan.category}</span>
                            <span>•</span>
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              {artisan.rating}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              ₦{(artisan.hourlyRate || 3500).toLocaleString()}/hr
                            </span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Matched Jobs / Gigs */}
            {matchedJobs.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-blue-500" />
                  <span>Campus Jobs & Requests ({matchedJobs.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {matchedJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => handleSelectJob(job.id)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-blue-50/70 group transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium text-slate-600 truncate max-w-[120px]">
                            {job.category}
                          </span>
                          <span className="flex items-center gap-0.5 truncate text-slate-500">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {job.location}
                          </span>
                          <span className="text-emerald-600 font-bold ml-auto shrink-0">
                            ₦{job.budget.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state if nothing matches */}
            {totalMatches === 0 && (
              <div className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    No results found for "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Try searching by skill, service, technician name, or university location.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {["Plumbing", "Electrical", "Laundry", "Locksmith", "AC Repair", "Laptop"].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag);
                          setIsOpen(true);
                        }}
                        className="text-[10px] font-semibold bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 px-2 py-1 rounded-md transition cursor-pointer"
                      >
                        +{tag}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer view all */}
          <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200/80 flex items-center justify-between">
            <button
              type="button"
              onClick={handleViewAllResults}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore all results on marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <CornerDownLeft className="w-3 h-3" />
              <span>Press Enter</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
