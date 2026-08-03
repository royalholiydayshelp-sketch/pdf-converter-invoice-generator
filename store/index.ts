import { create } from "zustand";
import type { TransactionFilters, DatePreset } from "@/types";

interface FilterStore {
  filters: TransactionFilters;
  selectedIds: Set<string>;
  setSearch: (search: string) => void;
  setDatePreset: (preset: DatePreset) => void;
  setDateRange: (from?: string, to?: string) => void;
  setAmountRange: (min?: number, max?: number) => void;
  setDescriptionContains: (value: string) => void;
  setReference: (value: string) => void;
  setTypeFilter: (type: TransactionFilters["typeFilter"]) => void;
  resetFilters: () => void;
  toggleSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
}

const defaultFilters: TransactionFilters = {
  search: "",
  datePreset: "all",
  descriptionContains: "",
  reference: "",
  typeFilter: "all",
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  filters: defaultFilters,
  selectedIds: new Set(),
  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),
  setDatePreset: (datePreset) =>
    set((state) => ({ filters: { ...state.filters, datePreset } })),
  setDateRange: (dateFrom, dateTo) =>
    set((state) => ({
      filters: {
        ...state.filters,
        datePreset: "custom",
        dateFrom,
        dateTo,
      },
    })),
  setAmountRange: (amountMin, amountMax) =>
    set((state) => ({
      filters: { ...state.filters, amountMin, amountMax },
    })),
  setDescriptionContains: (descriptionContains) =>
    set((state) => ({
      filters: { ...state.filters, descriptionContains },
    })),
  setReference: (reference) =>
    set((state) => ({ filters: { ...state.filters, reference } })),
  setTypeFilter: (typeFilter) =>
    set((state) => ({ filters: { ...state.filters, typeFilter } })),
  resetFilters: () => set({ filters: defaultFilters }),
  toggleSelection: (id) => {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next });
  },
  setSelection: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
}));

interface UIStore {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
