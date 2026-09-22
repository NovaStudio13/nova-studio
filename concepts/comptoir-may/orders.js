/* Boîte aux commandes (MODE DÉMO) — partagée entre le site (client) et comptoir.html (restaurant).
   Les commandes sont stockées dans le navigateur (localStorage) : la démo fonctionne donc entre deux onglets
   du même navigateur, sans serveur. Pour une vraie mise en service, remplacer ce fichier par un client d'API
   (Firebase, Supabase, serveur maison…) qui expose la MÊME interface : list, nextNo, add, update, clear, subscribe. */
(() => {
  const KEY = 'tv-orders';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const write = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
  const subs = new Set();
  const emit = () => { const l = read(); subs.forEach(f => f(l)); };
  addEventListener('storage', e => { if (e.key === KEY) emit(); });

  window.OrderStore = {
    list: read,
    nextNo() {
      const day = new Date().toDateString();
      const nums = read().filter(o => new Date(o.createdAt).toDateString() === day).map(o => o.no);
      return (nums.length ? Math.max(...nums) : 0) + 1;
    },
    add(o) {
      const list = read();
      const order = { ...o, id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        no: this.nextNo(), createdAt: Date.now(), status: 'new', arrived: false };
      list.push(order); write(list); emit();
      return order;
    },
    update(id, patch) {
      const list = read(), i = list.findIndex(o => o.id === id);
      if (i < 0) return;
      list[i] = { ...list[i], ...patch }; write(list); emit();
    },
    clear() { write([]); emit(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
})();
