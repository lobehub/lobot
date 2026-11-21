import { createWithEqualityFn } from 'zustand/traditional';

export interface MarketModalState {
  closeMarket: () => void;
  /** The connector whose detail page is showing; `null` is the catalog. */
  detailId: string | null;
  open: boolean;
  openMarket: () => void;
  setDetailId: (id: string | null) => void;
}

/** The Market dialog opened from the account menu; it always opens on the catalog. */
export const useMarketModalStore = createWithEqualityFn<MarketModalState>()((set) => ({
  closeMarket: () => set({ detailId: null, open: false }),
  detailId: null,
  open: false,
  openMarket: () => set({ detailId: null, open: true }),
  setDetailId: (detailId) => set({ detailId }),
}));
