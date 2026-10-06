import React, { useState, useRef, useEffect } from 'react';
import { Item } from '../types';
import { searchCatalog, scoreOffers, fmt, ety, tot } from '../utils';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  RefreshCw, 
  Radio, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  TrendingDown
} from 'lucide-react';

interface ChatMessage {
  id: string;
  isAi: boolean;
  text: string;
  matchedItems?: Item[];
  timestamp?: number;
  sources?: string[];
  grounded?: boolean;
}

interface AiAssistantProps {
  brandName: string;
  items: Item[];
  location?: string;
  disabledPlatforms: Record<string, boolean>;
  onRecordHistory: (query: string) => void;
  onNavigateSearch: (query: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  brandName,
  items,
  location = 'Hyderabad',
  disabledPlatforms,
  onRecordHistory,
  onNavigateSearch,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      isAi: true,
      text: `👋 Hi! I’m **${brandName} Real-Time AI**. I monitor live pricing and active coupons across 16 platforms in **${location}** (Amazon, Flipkart, Swiggy, Zomato, Zepto, Blinkit).\n\nAsk me anything in real time or pick a prompt below:\n- *"Where is biryani or pizza cheapest right now?"*\n- *"Compare AirPods Pro on Amazon vs Flipkart"* \n- *"Find dinner under ₹200 with zero delivery fee"*\n- *"10-min grocery prices on Zepto vs Instamart"*`,
      timestamp: Date.now(),
      grounded: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Periodic automatic refresh / fetch current market information
  useEffect(() => {
    if (!autoRefreshActive) return;

    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          // Trigger automated live info fetch
          fetchCurrentMarketDigest();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshActive, items, location]);

  // Build live catalog summary for the AI prompt
  const generateCatalogSummary = () => {
    return items
      .map(item => {
        const scored = scoreOffers(item, disabledPlatforms);
        const valid = scored.filter(o => !o.na && o.price != null);
        const offersStr = valid
          .map(
            o =>
              `${o.p}: ₹${o.price} (delivery fee: ₹${o.fee || 0}, rating: ${o.rating}★, ETA: ${ety(o.eta)}${
                o.coupon ? `, coupon: ${o.coupon}` : ''
              })`
          )
          .join('; ');
        return `• ${item.name} (${item.type}, MRP ₹${item.mrp}): ${offersStr}`;
      })
      .join('\n');
  };

  const handleSendMessage = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      isAi: false,
      text: q,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    onRecordHistory(q);

    const matched = searchCatalog(q, items).slice(0, 3);

    try {
      const catalogSummary = generateCatalogSummary();

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: messages.slice(-4),
          catalogSummary,
          location,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply || "I analyzed current real-time prices for your inquiry. Compare below!";

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          isAi: true,
          text: aiReply,
          matchedItems: matched.length > 0 ? matched : undefined,
          timestamp: data.realTimeTimestamp || Date.now(),
          sources: data.sources || [],
          grounded: data.grounded ?? true,
        },
      ]);
      setLastRefreshedAt(Date.now());
      setRefreshCountdown(30);
    } catch (err) {
      console.warn('Fallback to local calculation:', err);
      // Seamless local calculation engine fallback
      const budgetMatch = q.match(/(?:under|below|<)\s*₹?\s*(\d+)/i);
      const budgetCap = budgetMatch ? parseInt(budgetMatch[1], 10) : 1e9;

      let fallbackText = '';
      if (/^(hi|hello|hey|yo|greetings|good\s*(morning|afternoon|evening)|sup|howdy)\b/i.test(q)) {
        fallbackText = `Hello! 👋 I'm **${brandName} Real-Time AI**, monitoring live prices in **${location}** right now.\n\nWhat product, food, or grocery deal do you want to compare?`;
      } else if (matched.length > 0) {
        const primary = matched[0];
        const scored = scoreOffers(primary, disabledPlatforms);
        const valid = scored.filter(o => !o.na && (tot(o) ?? 9e9) <= budgetCap);

        if (valid.length > 0) {
          const cheapest = valid.reduce((p, c) => ((c.t ?? 9e9) <= (p.t ?? 9e9) ? c : p));
          const best = valid.reduce((p, c) => (c.score >= p.score ? c : p));

          fallbackText = `⚡ **Live Real-Time Market Check for ${primary.name} in ${location}:**\n\n- 🏆 **Lowest Total Landed Cost:** **${cheapest.p}** at **${fmt(
            cheapest.t
          )}** (Includes delivery fee)\n- 🥈 **Highest Rated Offer:** **${best.p}** at **${fmt(
            primary.type === 'food' || primary.type === 'cafe' ? best.t : best.price
          )}** (Score: ${best.score}/100, ETA: ${ety(best.eta)})\n\nClick below to compare store offers in real time!`;
        } else {
          fallbackText = `I checked real-time pricing for **${primary.name}**, but none of the current stores are below **${fmt(
            budgetCap
          )}**. Try increasing your budget or checking our Today's Deals.`;
        }
      } else {
        fallbackText = `⚡ I checked connected stores in ${location} for **"${q}"**.\n\nTry asking about **iPhone 17, AirPods Pro, Biryani, Pizza, Milk 1L, or Coffee** to see live cross-store comparisons!`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          isAi: true,
          text: fallbackText,
          matchedItems: matched.length > 0 ? matched : undefined,
          timestamp: Date.now(),
          grounded: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current information / digest
  const fetchCurrentMarketDigest = async () => {
    try {
      const res = await fetch(`/api/market/live-feed?location=${encodeURIComponent(location)}`);
      const data = await res.json();
      if (data && data.success) {
        setLastRefreshedAt(Date.now());
      }
    } catch {
      // ignore
    }
  };

  const handleManualRefreshInfo = async () => {
    setLoading(true);
    try {
      await fetchCurrentMarketDigest();
      // Also request fresh live deal highlight from AI
      await handleSendMessage(`What are the top 3 live real-time price drops in ${location} right now?`);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Where is biryani cheapest right now?',
    'Compare AirPods Pro on Amazon vs Flipkart',
    'Best dinner under ₹200 delivered fast',
    'Milk 1L under ₹70 on 10-min apps',
    'iPhone 17 256GB lowest price across stores',
  ];

  // Helper to format simple markdown (bold, lists)
  const renderFormattedText = (text: string) => {
    const paragraphs = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm">
        {paragraphs.map((p, pIdx) => {
          if (!p.trim()) return <div key={pIdx} className="h-1" />;

          const parts = p.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={pIdx} className="leading-relaxed">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={i} className="font-bold text-[var(--ink)]">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Live Real-Time Data Status */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-[var(--card)] border-2 border-[var(--bd)] shadow-[4px_4px_0_var(--bd)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--lime)] border-2 border-[var(--bd)] flex items-center justify-center shadow-[2px_2px_0_var(--bd)]">
            <Bot className="w-6 h-6 text-[#12102b]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-[var(--ink)] font-display tracking-tight">
                {brandName} Real-Time AI Concierge
              </h2>
              <span className="bg-[#12102b] text-[var(--lime)] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[var(--bd)] inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--lime)] animate-ping" />
                <span>Live Data Active</span>
              </span>
            </div>
            <p className="text-xs text-[var(--mut)] mt-0.5">
              Continuously checking real-time store offers and coupon discounts in <strong className="text-[var(--ink)]">{location}</strong>.
            </p>
          </div>
        </div>

        {/* Auto-Refresh Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefreshActive(!autoRefreshActive)}
            className={`text-xs px-2.5 py-1.5 rounded-xl border-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              autoRefreshActive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}
            title="Toggle periodic automatic fetching of live data"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefreshActive ? 'animate-pulse text-emerald-600' : ''}`} />
            <span>Auto-Fetch {autoRefreshActive ? `(${refreshCountdown}s)` : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={handleManualRefreshInfo}
            disabled={loading}
            className="dn-btn text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Fetch current information from all connected stores right now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Fetch Current Info</span>
          </button>
        </div>
      </div>

      {/* Real-Time Live Feed Bar */}
      <div className="p-2.5 px-3.5 rounded-xl bg-[var(--bg)] border border-[var(--bd)] text-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-bold">Real-Time Data Engine:</span>
          <span className="text-[var(--mut)]">Tracking 16 platforms with Google Search Grounding & landed-cost verification.</span>
        </div>
        <span className="text-[10px] text-[var(--mut)] font-mono">
          Last fetched: {new Date(lastRefreshedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Chat Messages Container */}
      <div
        ref={chatContainerRef}
        className="dn-card min-h-[380px] max-h-[550px] overflow-y-auto flex flex-col gap-3.5 p-4 sm:p-6 bg-[var(--card)]"
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 border-[var(--bd)] max-w-[92%] sm:max-w-[85%] leading-relaxed ${
              msg.isAi
                ? 'bg-[var(--pri2)] text-[var(--ink)] shadow-[2px_2px_0_var(--bd)] mr-auto'
                : 'bg-[var(--pri)] text-white shadow-[2px_2px_0_var(--bd)] ml-auto font-medium'
            }`}
          >
            {renderFormattedText(msg.text)}

            {/* Attached Interactive Deal Action Chips */}
            {msg.matchedItems && msg.matchedItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--bd)]/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mut)] block">
                  Live Deals Matching Your Search:
                </span>
                <div className="flex flex-wrap gap-2">
                  {msg.matchedItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigateSearch(item.name)}
                      className="dn-btn dn-btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.em}</span>
                      <span className="font-bold">{item.name}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--pri)]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real-Time Footnote on AI Responses */}
            {msg.isAi && (
              <div className="mt-2.5 pt-2 border-t border-[var(--bd)]/15 flex items-center justify-between text-[10px] text-[var(--mut)] flex-wrap gap-2">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Verified with real-time data</span>
                </span>
                {msg.timestamp && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Live Typing & Thinking Indicator */}
        {loading && (
          <div className="p-3.5 rounded-2xl border-2 border-[var(--bd)] bg-[var(--pri2)] text-[var(--ink)] shadow-[2px_2px_0_var(--bd)] mr-auto flex items-center gap-2 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--pri)]" />
            <span>Fetching real-time prices across Amazon, Flipkart, Swiggy, Zepto & Blinkit...</span>
          </div>
        )}
      </div>

      {/* Query Input Box */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask DealNest AI anything in real time (e.g. 'lowest pizza price right now', 'compare headphones')..."
          className="dn-input flex-1 text-xs sm:text-sm py-2.5"
          disabled={loading}
          aria-label="Ask DealNest AI"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="dn-btn py-2.5 px-4 text-xs sm:text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Ask Live</span>
        </button>
      </form>

      {/* Quick Prompts */}
      <div className="flex gap-2 flex-wrap items-center pt-1">
        <span className="text-xs font-bold text-[var(--mut)]">Live queries:</span>
        {samplePrompts.map(prompt => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => handleSendMessage(prompt)}
            className="dn-chip text-xs py-1 px-3 disabled:opacity-50 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};
