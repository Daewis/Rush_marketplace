import React, { useState, useMemo } from "react";
import {
  Wrench,
  Zap,
  Wind,
  Hammer,
  Paintbrush,
  Cog,
  Grid as GridIcon,
  Tv,
  Shirt,
  Sparkles,
  Laptop,
  Scissors,
  Truck,
  Key,
  Flame,
  ArrowRight,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { categories } from "../data/categories";
import { useMarketplace } from "../context/MarketplaceContext";

interface CategoriesGridProps {
  onSelectCategory: (catName: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-6 h-6 text-blue-600" />,
  Zap: <Zap className="w-6 h-6 text-amber-500" />,
  Wind: <Wind className="w-6 h-6 text-cyan-600" />,
  Hammer: <Hammer className="w-6 h-6 text-amber-700" />,
  Paintbrush: <Paintbrush className="w-6 h-6 text-purple-600" />,
  Cog: <Cog className="w-6 h-6 text-emerald-600" />,
  Grid: <GridIcon className="w-6 h-6 text-rose-600" />,
  Tv: <Tv className="w-6 h-6 text-indigo-600" />,
  Shirt: <Shirt className="w-6 h-6 text-sky-600" />,
  Sparkles: <Sparkles className="w-6 h-6 text-teal-600" />,
  Laptop: <Laptop className="w-6 h-6 text-violet-600" />,
  Scissors: <Scissors className="w-6 h-6 text-pink-600" />,
  Truck: <Truck className="w-6 h-6 text-orange-600" />,
  Key: <Key className="w-6 h-6 text-yellow-600" />,
  Flame: <Flame className="w-6 h-6 text-red-600" />,
};

const ITEMS_PER_PAGE = 8;

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({ onSelectCategory }) => {
  const { selectedCategory, setSelectedCategory, artisans, jobs, searchQuery, setSearchQuery } = useMarketplace();
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Compute live statistics for categories from real state
  const computedCategories = useMemo(() => {
    return categories.map((cat) => {
      // Count real verified artisans matching this category
      const matchingArtisans = artisans.filter((artisan) => {
        const catMatch = artisan.category?.toLowerCase() === cat.name.toLowerCase();
        const skillMatch = artisan.skills?.some(
          (s) => s.toLowerCase() === cat.name.toLowerCase()
        );
        return catMatch || skillMatch;
      });

      // Compute average budget if real jobs exist for this category
      const matchingJobs = jobs.filter(
        (job) => job.category?.toLowerCase() === cat.name.toLowerCase() && job.budget > 0
      );

      let priceLabel = cat.avgCost || "Based on Escrow Scope";
      if (matchingJobs.length > 0) {
        const total = matchingJobs.reduce((sum, j) => sum + j.budget, 0);
        const avg = Math.round(total / matchingJobs.length);
        priceLabel = `Avg ₦${avg.toLocaleString()}`;
      } else if (matchingArtisans.length > 0) {
        const totalRate = matchingArtisans.reduce((sum, a) => sum + (a.hourlyRate || 0), 0);
        const avgRate = Math.round(totalRate / matchingArtisans.length);
        priceLabel = `From ₦${avgRate.toLocaleString()}/hr`;
      }

      return {
        ...cat,
        liveArtisanCount: matchingArtisans.length,
        displayPrice: priceLabel,
      };
    });
  }, [artisans, jobs]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return computedCategories;
    const q = searchQuery.toLowerCase();
    return computedCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.popularServices.some((s) => s.toLowerCase().includes(q))
    );
  }, [computedCategories, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCategories = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCategories, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Vetted Campus Artisan Services
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {filteredCategories.length} Categories
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse specialized skill categories verified with NIN/BVN background checks and transparent escrow protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search services or tasks..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <button
            onClick={() => {
              setSelectedCategory("All");
              setSearchQuery("");
              setCurrentPage(1);
              onSelectCategory("All");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedCategory === "All" && !searchQuery
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Show All Services
          </button>
        </div>
      </div>

      {/* Grid of Categories */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">No Services Matching "{searchQuery}"</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Try checking for different keywords or clear the search query to explore all campus categories.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedCategories.map((cat) => {
            const isSelected = selectedCategory === cat.name;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  onSelectCategory(cat.name);
                }}
                className={`bg-white rounded-xl border p-5 transition duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20"
                    : "border-slate-200 hover:border-orange-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition">
                      {iconMap[cat.icon] || <Wrench className="w-6 h-6 text-slate-600" />}
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {cat.displayPrice}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-orange-600 transition">
                    {cat.name}
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    {cat.liveArtisanCount > 0
                      ? `${cat.liveArtisanCount} verified artisan${cat.liveArtisanCount > 1 ? "s" : ""} online`
                      : "Open for campus bids"}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Popular Tasks:
                    </p>
                    {cat.popularServices.map((srv, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-600 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{srv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs font-bold text-orange-600 pt-2 border-t border-slate-100">
                  <span>View Available Jobs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredCategories.length > ITEMS_PER_PAGE && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredCategories.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{filteredCategories.length}</span> services
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                  safeCurrentPage === page
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

