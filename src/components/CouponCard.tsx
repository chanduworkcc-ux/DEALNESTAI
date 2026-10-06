import React, { useState } from 'react';
import { CouponItem } from '../types';
import { fmt } from '../utils';
import { CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';

interface CouponCardProps {
  coupon: CouponItem;
  onUseOffer: (platform: string, code: string) => void;
  onToast: (msg: string) => void;
  demoMode?: boolean;
}

export const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  onUseOffer,
  onToast,
  demoMode = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      onToast(`Copied ${coupon.code} to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast(`Code: ${coupon.code}`);
    }
  };

  return (
    <div className="border-2 border-dashed border-[var(--bd)] rounded-[20px] p-4 sm:p-5 bg-[var(--card)] shadow-[4px_4px_0_var(--bd)] flex flex-col justify-between transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_var(--bd)]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-[var(--ink)]">
              {coupon.platform}
            </span>
            <span className="bg-[#12102b] text-[var(--lime)] rounded-md px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[var(--lime)]" />
              <span>VERIFIED</span>
            </span>
          </div>

          {demoMode && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[var(--pri2)] text-[var(--ink)] border border-dashed border-[var(--bd)] rounded">
              DEMO
            </span>
          )}
        </div>

        <div className="font-display font-extrabold text-xl sm:text-2xl text-[var(--ink)] tracking-tight my-1">
          {coupon.title}
        </div>

        <div className="my-2.5">
          <div className="inline-flex items-center gap-2 font-mono font-extrabold text-base bg-[var(--lime)] text-[#12102b] border-2 border-[var(--bd)] py-1 px-3 rounded-lg shadow-[2px_2px_0_var(--bd)]">
            <span>{coupon.code}</span>
          </div>
        </div>

        <div className="text-xs text-[var(--mut)] mb-3">
          Minimum order {fmt(coupon.minOrder)} · Expires {coupon.expires}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--bd)]/20">
        <button
          type="button"
          onClick={handleCopy}
          className="dn-btn dn-btn-secondary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
        </button>

        <button
          type="button"
          onClick={() => onUseOffer(coupon.platform, coupon.code)}
          className="dn-btn text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5"
        >
          <span>USE OFFER</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
