import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LotItem, PaymentMethod } from '../types';

export interface ResolvedLocation {
  formattedAddress: string;
  locality?: string;
  landmark?: string;
  ward?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface DraftPartner {
  id: string;
  name?: string;
  type?: 'aggregator' | 'recycler';
  address?: string;
}

export interface TransactionDraft {
  draftId: string;
  collectorId?: string;
  items: LotItem[];
  location?: ResolvedLocation;
  referencePrice?: { rate: number; total: number; source: string; region: string };
  selectedPartner?: DraftPartner;
  pickupDate?: string;
  pickupTime?: string;
  paymentPreference?: PaymentMethod;
  source?: 'material' | 'check-price' | 'pickup' | 'assistant';
  currentStep: 'materials' | 'location' | 'price' | 'pickup' | 'review';
}

interface DraftContextValue {
  draft: TransactionDraft | null;
  beginDraft: (source?: TransactionDraft['source']) => TransactionDraft;
  updateDraft: (changes: Partial<TransactionDraft>) => void;
  addItem: (item: LotItem) => void;
  updateItem: (index: number, changes: Partial<LotItem>) => void;
  removeItem: (index: number) => void;
  clearDraft: () => void;
}

const STORAGE_KEY = 'recysetu.transactionDraft';
const DraftContext = createContext<DraftContextValue | undefined>(undefined);

function makeDraft(source: TransactionDraft['source'] = 'material'): TransactionDraft {
  return {
    draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    items: [],
    source,
    currentStep: 'materials'
  };
}

export function TransactionDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TransactionDraft | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (draft) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [draft]);

  const beginDraft = (source: TransactionDraft['source'] = 'material') => {
    let startedDraft: TransactionDraft | null = null;

    setDraft(current => {
      if (!current) {
        startedDraft = { ...makeDraft(source), source };
        return startedDraft;
      }

      if (current.source === source) return current;
      const updated = { ...current, source };
      startedDraft = updated;
      return updated;
    });

    return startedDraft ?? draft;
  };

  const updateDraft = (changes: Partial<TransactionDraft>) => {
    setDraft(current => ({ ...(current || makeDraft()), ...changes }));
  };

  const addItem = (item: LotItem) => {
    setDraft(current => {
      const next = current || makeDraft();
      return { ...next, items: [...next.items, item], referencePrice: undefined, currentStep: 'materials' };
    });
  };

  const updateItem = (index: number, changes: Partial<LotItem>) => {
    setDraft(current => {
      if (!current) return current;
      return { ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item), referencePrice: undefined, currentStep: 'materials' };
    });
  };

  const removeItem = (index: number) => {
    setDraft(current => current ? { ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index), referencePrice: undefined, currentStep: 'materials' } : current);
  };

  return <DraftContext.Provider value={{ draft, beginDraft, updateDraft, addItem, updateItem, removeItem, clearDraft: () => setDraft(null) }}>{children}</DraftContext.Provider>;
}

export function useTransactionDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error('useTransactionDraft must be used within TransactionDraftProvider');
  return context;
}
