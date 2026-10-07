export type PlatformName = 
  | 'Amazon'
  | 'Flipkart'
  | 'Croma'
  | 'Reliance Digital'
  | 'Myntra'
  | 'AJIO'
  | 'Zomato'
  | 'Swiggy'
  | 'EatClub'
  | "Domino's"
  | 'Magicpin'
  | 'Restaurant Direct'
  | 'Zepto'
  | 'Blinkit'
  | 'Instamart'
  | 'BigBasket'
  | 'JioMart';

export type DealCategory = 'shop' | 'food' | 'cafe' | 'qc';

export interface PlatformOffer {
  p: PlatformName | string;
  price: number | null;
  rating: number | null;
  eta: number | null; // in minutes
  fee: number;
  coupon: string | null;
  directUrl?: string;
  isVerified?: boolean;
}

export interface ScoredOffer extends PlatformOffer {
  t: number | null;
  disc: number;
  score: number;
  na?: boolean;
}

export interface Item {
  id: string;
  name: string;
  type: DealCategory;
  em: string;
  mrp: number;
  pop: number;
  o: PlatformOffer[];
}

export interface CouponItem {
  platform: string;
  title: string;
  code: string;
  minOrder: number;
  expires: string;
  category: 'food' | 'shop' | 'grocery' | 'pay' | 'gaming';
}

export interface ClickRecord {
  id: string;
  p: string;
  t: number;
  u: string | null;
  itemName?: string;
}

export interface PriceAlert {
  id: string;
  n: string;
  t: number; // target threshold price
  currentPrice?: number;
  dateCreated?: number;
}

export interface SectionConfig {
  home: boolean;
  shop: boolean;
  food: boolean;
  qc: boolean;
  deals: boolean;
  coupons: boolean;
  ai: boolean;
}

export interface DiscoveredOffer {
  platform: string;
  productName: string;
  price: number | null;
  mrp?: number | null;
  discountPct?: number;
  couponCode?: string | null;
  couponSavings?: number;
  deliveryFee: number;
  totalPayable: number | null;
  directUrl: string;
  etaMinutes?: number;
  rating?: number;
  isVerified: boolean;
  unverifiedNote?: string;
}

export interface CrossPlatformAnalysisResult {
  originalInput: string;
  isUrl: boolean;
  sourcePlatform?: string;
  identifiedItem: string;
  category: 'shop' | 'food' | 'qc';
  winner: {
    platform: string;
    productName: string;
    totalPrice: number;
    savingsVsHighest: number;
    reason: string;
    directUrl: string;
  } | null;
  offers: DiscoveredOffer[];
  analysisSummary: string;
  item?: Item;
}

export interface AppState {
  demo: boolean;
  loc: string;
  saved: string[]; // item ids
  alerts: PriceAlert[];
  clicks: ClickRecord[];
  hist: string[];
  plat: Record<string, boolean>;
  sections?: SectionConfig;
  user: string | null;
  aff: Record<string, string>;
  brand: string;
  theme: 'light' | 'dark' | null;
  q?: string;
}

export interface SecretCodeItem {
  id: string;
  code: string;
  status: 'active' | 'used' | 'disabled' | 'revoked';
  createdAt: number;
  usedAt: number | null;
  usedBy: string | null;
  note: string;
}

export interface EnrolledUser {
  name: string;
  code?: string;
  codeId?: string;
}

export type NavView = 'home' | 'shop' | 'food' | 'qc' | 'coupons' | 'deals' | 'ai' | 'account' | 'admin' | 'admin-login' | 'search';
export type SortOption = 'rec' | 'low' | 'disc' | 'rate' | 'fast' | 'val' | 'pop';
