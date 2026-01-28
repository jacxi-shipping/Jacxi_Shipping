'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Truck,
  Package,
  User,
  Loader2,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'shipment' | 'item' | 'user';
  title: string;
  subtitle: string;
  link: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save to recent searches
  const saveToRecent = useCallback((search: string) => {
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Clear recent searches
  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        query: searchQuery,
        type: 'all',
        limit: '10',
      });

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      const searchResults: SearchResult[] = [];

      // Add shipments
      if (data.shipments) {
        data.shipments.forEach((shipment: { id: string; trackingNumber: string; vehicleType: string; status: string }) => {
          searchResults.push({
            id: shipment.id,
            type: 'shipment',
            title: shipment.trackingNumber,
            subtitle: `${shipment.vehicleType} - ${shipment.status}`,
            link: `/dashboard/shipments/${shipment.id}`,
          });
        });
      }

      // Add items
      if (data.items) {
        data.items.forEach((item: { id: string; vin: string; lotNumber: string; auctionCity: string; containerId: string }) => {
          searchResults.push({
            id: item.id,
            type: 'item',
            title: item.vin,
            subtitle: `Lot: ${item.lotNumber} - ${item.auctionCity}`,
            link: `/dashboard/containers/${item.containerId}`,
          });
        });
      }

      // Add users (admin only)
      if (data.users) {
        data.users.forEach((user: { id: string; name: string | null; email: string }) => {
          searchResults.push({
            id: user.id,
            type: 'user',
            title: user.name || user.email,
            subtitle: user.email,
            link: `/dashboard/users`,
          });
        });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = useCallback((result: SearchResult) => {
    saveToRecent(result.title);
    setIsOpen(false);
    setQuery('');
    router.push(result.link);
  }, [router, saveToRecent]);

  const handleRecentClick = (search: string) => {
    setQuery(search);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelect]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'shipment':
        return <Truck className="h-5 w-5 text-cyan-400" />;
      case 'item':
        return <Package className="h-5 w-5 text-purple-400" />;
      case 'user':
        return <User className="h-5 w-5 text-green-400" />;
      default:
        return <Search className="h-5 w-5 text-white/40" />;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm hidden lg:inline">Search...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 border border-white/20 rounded text-xs">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Search Box */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full max-w-2xl bg-[var(--text-primary)] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                  <Search className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search shipments, items, users..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/40 text-lg"
                  />
                  {loading && <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>

                {/* Results / Recent */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {query.trim() ? (
                    // Search Results
                    results.length > 0 ? (
                      <div className="p-2">
                        {results.map((result, index) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                              selectedIndex === index
                                ? 'bg-cyan-500/20 border border-cyan-500/40'
                                : 'hover:bg-white/5'
                            )}
                          >
                            <div className="flex-shrink-0">{getIcon(result.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{result.title}</p>
                              <p className="text-sm text-white/60 truncate">{result.subtitle}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-white/40 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : !loading ? (
                      <div className="p-12 text-center">
                        <Search className="h-12 w-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60">No results found</p>
                        <p className="text-sm text-white/40 mt-1">Try searching for a tracking number, VIN, or name</p>
                      </div>
                    ) : null
                  ) : (
                    // Recent Searches
                    recentSearches.length > 0 ? (
                      <div className="p-2">
                        <div className="flex items-center justify-between px-3 py-2">
                          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Recent Searches
                          </h3>
                          <button
                            onClick={clearRecent}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => handleRecentClick(search)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-white/5 transition-all"
                          >
                            <Search className="h-4 w-4 text-white/40" />
                            <span className="text-white/80">{search}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Search className="h-12 w-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60">Start typing to search</p>
                        <p className="text-sm text-white/40 mt-1">Find shipments, items, or users</p>
                      </div>
                    )
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-white/10 border border-white/20 rounded">↑↓</kbd>
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-white/10 border border-white/20 rounded">↵</kbd>
                      <span>Select</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 bg-white/10 border border-white/20 rounded">esc</kbd>
                      <span>Close</span>
                    </div>
                  </div>
                  <div className="text-xs text-white/40">
                    {results.length > 0 && `${results.length} result${results.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

