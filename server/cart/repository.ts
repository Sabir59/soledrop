import type { CartRow } from "@/server/cart/types"

export interface CartRepository {
  findByTokenHash(storeId: string, tokenHash: string): Promise<CartRow | null>
  findById(id: string): Promise<CartRow | null>
  findActiveByCustomer(storeId: string, customerId: string): Promise<CartRow | null>
  create(cart: CartRow): Promise<CartRow>
  /** Replaces lines, codes and owner; bumps updated_at. */
  save(cart: CartRow): Promise<CartRow>
  /** merge_carts: moves the guest cart's lines into the customer's cart (quantities add, capped by stock). */
  merge(guestCartId: string, customerCartId: string): Promise<CartRow>
  /** Deletes abandoned guest carts untouched for `olderThanDays`; returns how many. */
  purgeAbandoned(olderThanDays: number): Promise<number>
}
