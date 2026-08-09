'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, Sparkles, ShoppingBag, CheckCircle2 } from 'lucide-react';

export default function SearchFoodModal({ isOpen, mealType, onClose, onSelectFood }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // MyFitnessPal style UI segmentation state: 'common' vs 'branded'
  const [activeTab, setActiveTab] = useState('common');

  if (!isOpen) return null;

  // Triggered when user submits a query string
  const handleSearchAction = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search-food?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.success) {
        setSearchResults(data.products || []);
        
        // MyFitnessPal optimization behavior: 
        // If the first items look branded, automatically view branded, otherwise stay on common.
        const hasBrandedItems = data.products.some(item => item.brand !== 'Generic');
        setActiveTab(hasBrandedItems ? 'branded' : 'common');
      }
    } catch (err) {
      console.error("MFP Search Engine Exception:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Separate choices dynamically between generic/homemade foods and commercial groceries
  const commonChoices = searchResults.filter(item => item.brand === 'Generic');
  const brandedChoices = searchResults.filter(item => item.brand !== 'Generic');
  const currentTabChoices = activeTab === 'common' ? commonChoices : brandedChoices;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#121A2A] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header Block */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/60">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Log Choice</h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
              Section Allocation: <span className="text-emerald-400 font-bold">{mealType}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1C2638] rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Text Form Search Field */}
        <form onSubmit={handleSearchAction} className="p-4 bg-[#141D2F] relative flex items-center">
          <input 
            type="text"
            required
            placeholder="Search matching food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-10 pr-24 py-2.5 text-xs text-white focus:outline-none focus:border-[#00A86B] font-sans"
          />
          <Search className="w-4 h-4 text-gray-600 absolute left-7 pointer-events-none" />
          <button 
            type="submit"
            disabled={isSearching}
            className="absolute right-6 bg-[#00A86B] hover:bg-[#00945D] text-white font-bold px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* --- MYFITNESSPAL DUAL-SEGMENT TAB STRIP --- */}
        {searchResults.length > 0 && (
          <div className="flex border-b border-gray-800/60 bg-[#0F1624] px-2">
            <button
              onClick={() => setActiveTab('common')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border-b-2 ${
                activeTab === 'common' 
                  ? 'text-emerald-400 border-emerald-500 bg-[#121A2A]/40' 
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Common ({commonChoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('branded')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border-b-2 ${
                activeTab === 'branded' 
                  ? 'text-[#00A86B] border-[#00A86B] bg-[#121A2A]/40' 
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Branded ({brandedChoices.length})</span>
            </button>
          </div>
        )}

        {/* Mapped Choice Output Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px] max-h-[380px] bg-[#0E1524]/50">
          {currentTabChoices.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs text-gray-500 font-mono">No matching choice listings found here.</p>
              <p className="text-[10px] text-gray-600 max-w-[260px] mt-1">
                {searchResults.length > 0 
                  ? "Try shifting to the alternative tab layer option to find your entry match."
                  : "Type standard food strings or grocery keywords to search our live web source index."}
              </p>
            </div>
          ) : (
            currentTabChoices.map((item, index) => (
              <button
                key={index}
                onClick={() => onSelectFood(item)}
                className="w-full text-left flex justify-between items-center bg-[#161F30]/40 border border-gray-800/50 hover:border-gray-700 p-3 rounded-xl hover:bg-[#161F30]/80 transition-all group"
              >
                <div>
                  <div className="flex items-baseline space-x-2">
  <span className="font-bold text-xs text-gray-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
    {item.foodName}
    
    {/* --- BLUE CREDIBILITY BADGE CHECKMARK --- */}
    {item.isVerified && (
      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-500/10 inline-block" strokeWidth={2.5} />
    )}
  </span>
  
  {item.brand && item.brand !== 'Generic' && (
    <span className="text-[8px] font-black bg-emerald-950 border border-emerald-900 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
      {item.brand}
    </span>
  )}
</div>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    Standard Portions calculated per {item.servingSize}{item.unit}
                  </p>
                </div>

                <div className="text-right flex items-center space-x-4">
                  <div>
                    <p className="text-xs font-mono font-bold text-amber-500">+{item.calories} kcal</p>
                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                      C:{item.carbs}g · P:{item.protein}g · F:{item.fat}g
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  );
}