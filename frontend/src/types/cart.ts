/**
 * A line in the browser's draft cart.
 *
 * `name` and `unitPrice` are a **display snapshot** taken when the item was
 * added, so the cart can render itself without the menu being loaded. They are
 * never sent to the API as money: `POST /order` receives ids and quantities
 * only, and the API prices the order from its own records. A stale snapshot can
 * therefore show a wrong estimate, but can never cause a wrong charge.
 */
export interface CartItem {
  foodId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}
