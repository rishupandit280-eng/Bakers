/* ============================================================
   Cart — localStorage-backed, emits "cart:update" on changes.
   ============================================================ */
const Cart = (function () {
  const KEY = "bakers_cart_v1";

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function write(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {}
  }

  function notify() {
    document.dispatchEvent(new CustomEvent("cart:update"));
  }

  function add(id, qty = 1) {
    const map = read();
    map[id] = (map[id] || 0) + qty;
    if (map[id] <= 0) delete map[id];
    write(map);
    notify();
  }

  function setQty(id, qty) {
    const map = read();
    if (qty <= 0) delete map[id];
    else map[id] = qty;
    write(map);
    notify();
  }

  function remove(id) {
    const map = read();
    delete map[id];
    write(map);
    notify();
  }

  function clear() {
    write({});
    notify();
  }

  function qtyOf(id) {
    return read()[id] || 0;
  }

  function items() {
    const map = read();
    return Object.keys(map).map(id => {
      const it = (window.ALL_ITEMS || {})[id];
      return { id, qty: map[id], item: it };
    }).filter(x => x.item);
  }

  function count() {
    return items().reduce((s, x) => s + x.qty, 0);
  }

  function subtotal() {
    return items().reduce((s, x) => s + x.qty * x.item.price, 0);
  }

  return { add, setQty, remove, clear, qtyOf, items, count, subtotal };
})();
