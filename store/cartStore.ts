import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  itemId: string;
  quantity: number;
};

export type ServiceMode = "mobile" | "walkin";

export type CartAddress = {
  text: string;
  lat: number;
  lng: number;
};

type CartState = {
  items: CartLine[];
  serviceMode: ServiceMode | null;
  address: CartAddress | null;
  /** Free-form notes about the address (gate code, unit colour, landlord
   * instructions, etc.). Stored separately from the address text so the
   * map pin / formatted address stay untouched. */
  addressNote: string;
  addItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  setServiceMode: (mode: ServiceMode) => void;
  setAddress: (address: CartAddress | null) => void;
  setAddressNote: (note: string) => void;
  reset: () => void;
  getTotalQuantity: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      serviceMode: null,
      address: null,
      addressNote: "",
      addItem: (itemId) =>
        set((state) => {
          const existing = state.items.find((line) => line.itemId === itemId);
          if (existing) {
            return {
              items: state.items.map((line) =>
                line.itemId === itemId
                  ? { ...line, quantity: line.quantity + 1 }
                  : line,
              ),
            };
          }
          return { items: [...state.items, { itemId, quantity: 1 }] };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((line) => line.itemId !== itemId),
        })),
      updateQuantity: (itemId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter((line) => line.itemId !== itemId),
            };
          }
          return {
            items: state.items.map((line) =>
              line.itemId === itemId ? { ...line, quantity: qty } : line,
            ),
          };
        }),
      clearCart: () => set({ items: [] }),
      setServiceMode: (mode) =>
        set((state) => {
          if (state.serviceMode === mode) return state;
          return {
            serviceMode: mode,
            items: [],
            address: mode === "walkin" ? null : state.address,
            addressNote: mode === "walkin" ? "" : state.addressNote,
          };
        }),
      setAddress: (address) => set({ address }),
      setAddressNote: (note) => set({ addressNote: note }),
      reset: () =>
        set({ items: [], serviceMode: null, address: null, addressNote: "" }),
      getTotalQuantity: () =>
        get().items.reduce((total, line) => total + line.quantity, 0),
    }),
    {
      name: "polish-me-up-cart",
    },
  ),
);
