import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Ban,
  Power,
  RotateCcw,
  Lock,
  LogOut,
  Sparkles,
  Settings,
  BarChart3,
  Search,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Users,
  ShieldAlert,
  ChevronDown,
  ShoppingBag,
  UtensilsCrossed,
  Zap,
  Flame,
  Tag,
  Bot,
  Home
} from 'lucide-react';
import { SecretCodeItem, SectionConfig, ClickRecord } from '../types';
import { PLATFORM_COLORS, DEFAULT_PLATFORM_LINKS } from '../data';

interface AdminDashboardProps {
  adminToken: string;
  needsChange: boolean;
  brandName: string;
  onBrandNameChange: (name: string) => void;
  demoMode: boolean;
  onToggleDemo: (val: boolean) => void;
  sections: SectionConfig;
  onToggleSection: (sec: keyof SectionConfig, enabled: boolean) => void;
  disabledPlatforms: Record<string, boolean>;
  onTogglePlatform: (plat: string, enabled: boolean) => void;
  customAffiliates: Record<string, string>;
  onAffiliateChange: (plat: string, url: string) => void;
  clicks: ClickRecord[];
  searchesCount: number;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminToken,
  needsChange: initialNeedsChange,
  brandName,
  onBrandNameChange,
  demoMode,
  onToggleDemo,
  sections,
  onToggleSection,
  disabledPlatforms,
  onTogglePlatform,
  customAffiliates,
  onAffiliateChange,
  clicks,
  searchesCount,
  onLogout,
  onToast,
}) => {
  // Navigation tabs within Admin Dashboard
  const [activeTab, setActiveTab] = useState<'codes' | 'sections' | 'change-code' | 'affiliates'>('codes');

  // Codes state
  const [codes, setCodes] = useState<SecretCodeItem[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codeFilter, setCodeFilter] = useState<'all' | 'active' | 'used' | 'disabled' | 'revoked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Generate Codes form state
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [generatePrefix, setGeneratePrefix] = useState<string>('NEST');
  const [generateNote, setGenerateNote] = useState<string>('Standard Access Pass');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newlyGenerated, setNewlyGenerated] = useState<SecretCodeItem[]>([]);

  // Change Admin Access Code state
  const [needsChange, setNeedsChange] = useState<boolean>(initialNeedsChange);
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmNewCode, setConfirmNewCode] = useState('');
  const [isChangingCode, setIsChangingCode] = useState(false);
  const [changeCodeError, setChangeCodeError] = useState<string | null>(null);
  const [changeCodeSuccess, setChangeCodeSuccess] = useState<string | null>(null);

  // Fetch codes on mount
  const fetchCodes = async () => {
    setLoadingCodes(true);
    try {
      const res = await fetch('/api/admin/codes', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCodes(data.codes);
      } else {
        onToast(data.error || 'Failed to load secret codes.');
      }
    } catch {
      onToast('Network error loading codes.');
    } finally {
      setLoadingCodes(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [adminToken]);

  // Handle single or batch code generation
  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          count: generateCount,
          prefix: generatePrefix,
          note: generateNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCodes(prev => [...data.codes, ...prev]);
        setNewlyGenerated(data.codes);
        setShowGenerateModal(true);
        onToast(`Successfully generated ${data.codes.length} new access code(s)!`);
      } else {
        onToast(data.error || 'Failed to generate codes.');
      }
    } catch {
      onToast('Network error while generating codes.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update status (active / disabled / revoked)
  const handleUpdateStatus = async (id: string, status: 'active' | 'disabled' | 'revoked') => {
    try {
      const res = await fetch(`/api/admin/codes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCodes(prev => prev.map(c => (c.id === id ? data.code : c)));
        onToast(`Code status updated to ${status.toUpperCase()}.`);
      } else {
        onToast(data.error || 'Failed to update code status.');
      }
    } catch {
      onToast('Error updating code status.');
    }
  };

  // Delete code
  const handleDeleteCode = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/codes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCodes(prev => prev.filter(c => c.id !== id));
        onToast('Secret code removed from inventory.');
      } else {
        onToast(data.error || 'Failed to delete code.');
      }
    } catch {
      onToast('Error deleting code.');
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    onToast(`Copied code: ${code}`);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2000);
  };

  // Copy all newly generated
  const handleCopyAllNew = () => {
    const all = newlyGenerated.map(c => c.code).join('\n');
    navigator.clipboard.writeText(all);
    onToast(`Copied all ${newlyGenerated.length} codes to clipboard!`);
  };

  // Change Admin Access Code
  const handleChangeAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeCodeError(null);
    setChangeCodeSuccess(null);

    if (newCode !== confirmNewCode) {
      setChangeCodeError('New code and confirmation code do not match.');
      return;
    }

    if (newCode.length < 5) {
      setChangeCodeError('New admin code must be at least 5 characters.');
      return;
    }

    if (newCode === '12345') {
      setChangeCodeError('Please choose a new custom code instead of the default 12345.');
      return;
    }

    setIsChangingCode(true);

    try {
      const res = await fetch('/api/admin/change-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentCode,
          newCode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setChangeCodeSuccess('Admin Access Code updated successfully! Default code replaced.');
        setNeedsChange(false);
        setCurrentCode('');
        setNewCode('');
        setConfirmNewCode('');
        onToast('Admin Access Code changed successfully.');
      } else {
        setChangeCodeError(data.error || 'Failed to update code.');
      }
    } catch {
      setChangeCodeError('Network error updating admin access code.');
    } finally {
      setIsChangingCode(false);
    }
  };

  // Filtered codes
  const filteredCodes = codes.filter(c => {
    if (codeFilter !== 'all' && c.status !== codeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = c.code.toLowerCase().includes(q);
      const noteMatch = (c.note || '').toLowerCase().includes(q);
      const userMatch = (c.usedBy || '').toLowerCase().includes(q);
      return codeMatch || noteMatch || userMatch;
    }
    return true;
  });

  // Stats
  const totalCodes = codes.length;
  const activeCodes = codes.filter(c => c.status === 'active').length;
  const usedCodes = codes.filter(c => c.status === 'used').length;
  const disabledCodes = codes.filter(c => c.status === 'disabled').length;
  const revokedCodes = codes.filter(c => c.status === 'revoked').length;

  const sectionItems: {
    key: keyof SectionConfig;
    label: string;
    description: string;
    icon: React.ReactNode;
    requiresAdminBadge?: boolean;
  }[] = [
    {
      key: 'home',
      label: 'Homepage & Deals Feed',
      description: 'Main homepage dashboard showcase, live deals feed, and category shelves.',
      icon: <Home className="w-4 h-4 text-cyan-400" />,
    },
    {
      key: 'shop',
      label: 'Shopping & Electronics',
      description: 'Tech, mobile phones, audio gear, and retail catalog price comparison.',
      icon: <ShoppingBag className="w-4 h-4 text-pink-400" />,
    },
    {
      key: 'food',
      label: 'Food & Dining',
      description: 'Zomato, Swiggy, and direct restaurant delivery comparison.',
      icon: <UtensilsCrossed className="w-4 h-4 text-emerald-400" />,
    },
    {
      key: 'qc',
      label: 'Quick Groceries (10-min)',
      description: 'Zepto, Blinkit, and Instamart essentials and dairy deals.',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    {
      key: 'deals',
      label: "Today's Deals & Price Drops",
      description: 'Today’s featured bargain ranking and home showcase deals.',
      icon: <Flame className="w-4 h-4 text-rose-400" />,
    },
    {
      key: 'coupons',
      label: 'Coupon Code Zone',
      description: 'Platform promo codes, instant card offers, and copy vouchers.',
      icon: <Tag className="w-4 h-4 text-purple-400" />,
    },
    {
      key: 'ai',
      label: 'DealNest AI Shopping Assistant',
      description: 'Conversational cross-platform comparison powered by Gemini.',
      icon: <Bot className="w-4 h-4 text-[#ccff00]" />,
      requiresAdminBadge: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d0b1a] text-white p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Admin Command Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2b2754]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#5b3df5] to-[#8869ff] border-2 border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(91,61,245,0.4)]">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                Admin Command Dashboard
              </h1>
              <span className="bg-[#ccff00] text-[#12102b] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-black/20">
                Live Admin Mode
              </span>
            </div>
            <p className="text-xs text-white/50">
              Manage user enrollment codes, system sections, and catalog security.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setActiveTab('change-code')}
            className="text-xs font-bold bg-[#1a1738] hover:bg-[#252150] text-white/90 px-3 py-2 rounded-xl border border-[#3b3670] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-[#ccff00]" />
            <span>Change Admin Code</span>
          </button>
          
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-3.5 py-2 rounded-xl border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Mandatory First-Login Password Change Banner */}
      {needsChange && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-sm block text-amber-300">
                Important Security Requirement: Initial Admin Code In Use (12345)
              </span>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                The initial code `12345` was provided for initial setup. Please change your Admin Access Code to a custom secure code now.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('change-code')}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl cursor-pointer flex-shrink-0 transition-colors"
          >
            Update Code Now
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#2b2754]/60">
        <button
          type="button"
          onClick={() => setActiveTab('codes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'codes'
              ? 'bg-[#5b3df5] text-white shadow-[0_0_15px_rgba(91,61,245,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Secret Code Generator & Inventory</span>
          <span className="bg-black/30 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {totalCodes}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'sections'
              ? 'bg-[#5b3df5] text-white shadow-[0_0_15px_rgba(91,61,245,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Section Visibility Controls</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('change-code')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'change-code'
              ? 'bg-[#5b3df5] text-white shadow-[0_0_15px_rgba(91,61,245,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Change Admin Access Code</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('affiliates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'affiliates'
              ? 'bg-[#5b3df5] text-white shadow-[0_0_15px_rgba(91,61,245,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Affiliate & Click Tracker</span>
        </button>
      </div>

      {/* --- TAB 1: SECRET CODES MANAGEMENT --- */}
      {activeTab === 'codes' && (
        <div className="space-y-6">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-[#14112c] border border-[#2b2754]">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Total Codes</span>
              <span className="text-2xl font-black font-display text-white mt-1 block">{totalCodes}</span>
              <span className="text-[10px] text-white/40">Generated in system</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#14112c] border border-emerald-500/30">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Active / Ready</span>
              <span className="text-2xl font-black font-display text-emerald-300 mt-1 block">{activeCodes}</span>
              <span className="text-[10px] text-emerald-400/60">Ready for user enrollment</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#14112c] border border-blue-500/30">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Used / Enrolled</span>
              <span className="text-2xl font-black font-display text-blue-300 mt-1 block">{usedCodes}</span>
              <span className="text-[10px] text-blue-400/60">Redeemed by members</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#14112c] border border-amber-500/30">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Disabled</span>
              <span className="text-2xl font-black font-display text-amber-300 mt-1 block">{disabledCodes}</span>
              <span className="text-[10px] text-amber-400/60">Temporarily paused</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#14112c] border border-rose-500/30">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Revoked</span>
              <span className="text-2xl font-black font-display text-rose-300 mt-1 block">{revokedCodes}</span>
              <span className="text-[10px] text-rose-400/60">Permanently invalidated</span>
            </div>
          </div>

          {/* Generator Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#14112c] border-2 border-[#2b2754] relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#ccff00]" />
                  <span>Generate New Secret Access Codes</span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Generate single or bulk access codes. Give these codes to users manually to enroll.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateCodes} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-white/60 mb-1 uppercase tracking-wider">
                  Quantity
                </label>
                <select
                  value={generateCount}
                  onChange={e => setGenerateCount(Number(e.target.value))}
                  className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:border-[#5b3df5] focus:outline-none"
                >
                  <option value={1}>1 Code (Single)</option>
                  <option value={5}>5 Codes (Batch)</option>
                  <option value={10}>10 Codes (Batch)</option>
                  <option value={25}>25 Codes (Bulk)</option>
                  <option value={50}>50 Codes (Maximum)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-white/60 mb-1 uppercase tracking-wider">
                  Prefix (Max 8 chars)
                </label>
                <input
                  type="text"
                  value={generatePrefix}
                  maxLength={8}
                  onChange={e => setGeneratePrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. NEST, VIP"
                  className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-3 py-2 text-xs font-mono uppercase focus:border-[#5b3df5] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-white/60 mb-1 uppercase tracking-wider">
                  Note / Recipient Tag
                </label>
                <input
                  type="text"
                  value={generateNote}
                  onChange={e => setGenerateNote(e.target.value)}
                  placeholder="e.g. VIP Member Pass, Early Access"
                  className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-3 py-2 text-xs focus:border-[#5b3df5] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-[#ccff00] hover:bg-[#b8e600] text-[#12102b] font-extrabold text-xs py-2.5 px-3 rounded-xl border border-[#12102b] shadow-[2px_2px_0_#12102b] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'all', label: `All (${totalCodes})` },
                { key: 'active', label: `Active (${activeCodes})` },
                { key: 'used', label: `Used (${usedCodes})` },
                { key: 'disabled', label: `Disabled (${disabledCodes})` },
                { key: 'revoked', label: `Revoked (${revokedCodes})` },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setCodeFilter(f.key as any)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    codeFilter === f.key
                      ? 'bg-[#5b3df5] text-white shadow-[0_0_10px_rgba(91,61,245,0.4)]'
                      : 'bg-[#14112c] text-white/60 hover:text-white border border-[#2b2754]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search code, note, or user..."
                className="w-full bg-[#14112c] border border-[#2b2754] text-white rounded-xl pl-9 pr-3 py-1.5 text-xs focus:border-[#5b3df5] focus:outline-none"
              />
            </div>
          </div>

          {/* Codes Inventory Table */}
          <div className="bg-[#14112c] border-2 border-[#2b2754] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2b2754] bg-[#1a1738] text-white/60 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Secret Code</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created Date</th>
                    <th className="py-3 px-3">Usage Info</th>
                    <th className="py-3 px-3">Note / Tag</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2754]/50">
                  {loadingCodes ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-white/50">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#5b3df5]" />
                        <span>Loading codes inventory...</span>
                      </td>
                    </tr>
                  ) : filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-white/50">
                        No secret codes match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map(item => {
                      const isCopied = copiedCodeId === item.id;

                      const statusBadge = {
                        active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                        used: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                        disabled: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                        revoked: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                      }[item.status];

                      return (
                        <tr key={item.id} className="hover:bg-[#1e1a3f]/50 transition-colors">
                          {/* Code + Copy */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-[#ccff00] tracking-wide">
                                {item.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(item.code, item.id)}
                                title="Copy code"
                                className="p-1.5 rounded-lg bg-[#252150] hover:bg-[#342e6d] text-white/80 hover:text-white cursor-pointer transition-colors"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${statusBadge}`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="py-3 px-3 text-white/60 font-mono text-[11px]">
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          {/* Usage Info */}
                          <td className="py-3 px-3">
                            {item.status === 'used' ? (
                              <div>
                                <span className="font-bold text-white block">{item.usedBy || 'Anonymous'}</span>
                                <span className="text-[10px] text-white/40 font-mono">
                                  {item.usedAt ? new Date(item.usedAt).toLocaleDateString() : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-white/40 italic text-[11px]">Unused</span>
                            )}
                          </td>

                          {/* Note */}
                          <td className="py-3 px-3 text-white/70 max-w-[180px] truncate" title={item.note}>
                            {item.note || '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Active / Disabled */}
                              {item.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(item.id, 'disabled')}
                                  title="Disable code"
                                  className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 cursor-pointer"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {item.status === 'disabled' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(item.id, 'active')}
                                  title="Re-enable code"
                                  className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Revoke (if not already revoked) */}
                              {item.status !== 'revoked' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(item.id, 'revoked')}
                                  title="Revoke code permanently"
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCode(item.id)}
                                title="Delete code"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/30 text-white/40 hover:text-rose-200 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: SECTION VISIBILITY CONTROLS --- */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#14112c] border-2 border-[#2b2754]">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-[#ccff00]" />
              <span>Section Activation & Visibility Controls</span>
            </h3>
            <p className="text-xs text-white/50 mb-6">
              Administrator can activate or hide any main section: Today's Deals, Coupons, Groceries, Shopping, Food, or the AI Assistant.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionItems.map(sec => {
                const isEnabled = sections[sec.key];

                return (
                  <div
                    key={sec.key}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                      isEnabled
                        ? 'bg-[#1b173a] border-[#3b3670]'
                        : 'bg-[#120f26]/60 border-dashed border-gray-700 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 font-extrabold text-sm text-white">
                          {sec.icon}
                          <span>{sec.label}</span>
                        </div>
                        {sec.requiresAdminBadge && (
                          <span className="bg-[#ccff00] text-[#12102b] text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            Admin Only
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">
                        {sec.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                        isEnabled ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{isEnabled ? 'Active in Public UI' : 'Hidden from Users'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onToggleSection(sec.key, !isEnabled)}
                        className={`text-xs py-1.5 px-3 rounded-xl font-bold cursor-pointer transition-all ${
                          isEnabled
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40'
                            : 'bg-[#ccff00] hover:bg-[#b8e600] text-[#12102b] font-black'
                        }`}
                      >
                        {isEnabled ? 'Hide Section' : 'Activate Section'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: CHANGE ADMIN ACCESS CODE --- */}
      {activeTab === 'change-code' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#14112c] border-2 border-[#2b2754] relative">
            <div className="w-12 h-12 rounded-2xl bg-[#5b3df5]/20 border border-[#5b3df5] flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#ccff00]" />
            </div>

            <h3 className="text-xl font-black font-display text-white">
              Change Admin Access Code
            </h3>
            <p className="text-xs text-white/50 mt-1 mb-6 leading-relaxed">
              Update the master code required to enter this Admin Dashboard. Passwords and codes are stored with cryptographic salt & SHA-256 hashing.
            </p>

            {changeCodeError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{changeCodeError}</span>
              </div>
            )}

            {changeCodeSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{changeCodeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeAdminCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                  Current Admin Access Code
                </label>
                <input
                  type="password"
                  value={currentCode}
                  onChange={e => setCurrentCode(e.target.value)}
                  placeholder="Enter current code"
                  required
                  className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#5b3df5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                  New Admin Access Code
                </label>
                <input
                  type="password"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="At least 5 characters (custom code)"
                  required
                  className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#5b3df5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                  Confirm New Code
                </label>
                <input
                  type="password"
                  value={confirmNewCode}
                  onChange={e => setConfirmNewCode(e.target.value)}
                  placeholder="Repeat new code"
                  required
                  className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#5b3df5] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingCode}
                className="w-full py-3 bg-[#ccff00] hover:bg-[#b8e600] text-[#12102b] font-black text-sm rounded-xl border border-black shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isChangingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Access Code...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Save New Access Code</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB 4: AFFILIATE & CLICKS --- */}
      {activeTab === 'affiliates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#14112c] border border-[#2b2754]">
              <span className="text-xs text-white/50 block">Tracked Outbound Referrals</span>
              <span className="text-3xl font-black font-display text-white mt-1 block">{clicks.length}</span>
              <p className="text-[11px] text-white/40 mt-1">
                {searchesCount} total user catalog searches executed
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#14112c] border border-[#2b2754]">
              <span className="text-xs text-white/50 block">Platform Brand Name</span>
              <input
                type="text"
                value={brandName}
                onChange={e => onBrandNameChange(e.target.value)}
                className="w-full bg-[#1e1a3f] border border-[#37316a] text-white rounded-xl px-3 py-2 text-sm mt-2 font-bold focus:border-[#5b3df5] focus:outline-none"
              />
            </div>
          </div>

          {/* Platforms */}
          <div className="p-6 rounded-2xl bg-[#14112c] border-2 border-[#2b2754]">
            <h3 className="text-base font-extrabold text-white mb-3">
              Platform Integration & Affiliate Search URLs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {Object.keys(DEFAULT_PLATFORM_LINKS).map(platform => {
                const isEnabled = disabledPlatforms[platform] !== false;
                return (
                  <div key={platform} className="p-3 rounded-xl bg-[#1e1a3f] border border-[#37316a] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-white">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={e => onTogglePlatform(platform, e.target.checked)}
                          className="w-4 h-4 rounded text-[#5b3df5]"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: PLATFORM_COLORS[platform] || '#555' }}
                        />
                        <span>{platform}</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={customAffiliates[platform] || ''}
                      placeholder={DEFAULT_PLATFORM_LINKS[platform]}
                      onChange={e => onAffiliateChange(platform, e.target.value)}
                      className="bg-[#14112c] border border-[#2b2754] text-white/90 text-xs px-2.5 py-1.5 rounded-lg font-mono"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Generated Codes Modal (Shown after successful bulk generation) */}
      {showGenerateModal && newlyGenerated.length > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#14112c] border-2 border-[#5b3df5] rounded-[24px] p-6 max-w-lg w-full shadow-[0_0_50px_rgba(91,61,245,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black font-display text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ccff00]" />
                  <span>{newlyGenerated.length} New Code(s) Generated!</span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Give these secret codes to users manually to grant access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-white/40 hover:text-white text-xs px-2 py-1 rounded-lg border border-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 bg-[#0d0b1a] p-3 rounded-xl border border-[#2b2754] mb-4">
              {newlyGenerated.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-[#1a1738] border border-[#2b2754]">
                  <div>
                    <span className="font-mono font-black text-sm text-[#ccff00]">
                      {item.code}
                    </span>
                    <span className="text-[10px] text-white/40 block">
                      {item.note}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(item.code, item.id)}
                    className="p-1.5 rounded-lg bg-[#252150] hover:bg-[#342e6d] text-white/80 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyAllNew}
                className="flex-1 py-2.5 bg-[#ccff00] hover:bg-[#b8e600] text-[#12102b] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy All Codes</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
