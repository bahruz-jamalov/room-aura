// In-memory cart — deliberately not persisted (no localStorage), matching
// "don't overbuild" for MVP: losing an unsubmitted cart on refresh is an
// acceptable trade for not building persistence/sync logic nobody asked for.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  menuItemId: string;
  name: string;
  priceMinor: number;
  currency: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  totalMinor: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) => (i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.menuItemId !== menuItemId) : prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      setQuantity,
      clear,
      totalMinor: items.reduce((sum, i) => sum + i.priceMinor * i.quantity, 0),
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    [items, addItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
