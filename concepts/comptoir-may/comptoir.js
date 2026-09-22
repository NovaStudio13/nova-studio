(() => {
  const $ = s => document.querySelector(s);
  const eur = n => n.toFixed(2).replace('.', ',') + ' €';
  const pad = n => String(n).padStart(3, '0');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const NEXT = { new: ['preparing', 'Lancer la préparation'], preparing: ['ready', 'Commande prête'], ready: ['done', 'Remise au client'] };
  let sound = false, seen = new Set(), arrivedSeen = new Set(), first = true;

  function beep(times = 2) {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = i % 2 ? 660 : 880;
        g.gain.setValueAtTime(.0001, ctx.currentTime + i * .28);
        g.gain.exponentialRampToValueAtTime(.3, ctx.currentTime + i * .28 + .02);
        g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + i * .28 + .25);
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * .28); o.stop(ctx.currentTime + i * .28 + .26);
      }
    } catch {}
  }

  const hhmm = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', 'h');
  const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? "à l'instant" : `il y a ${m} min`; };

  function card(o) {
    const c = el('article', 'pass-card'); c.dataset.status = o.status; c.dataset.id = o.id;
    const head = el('header'); head.append(el('b', '', 'N° ' + pad(o.no)), el('span', '', `${hhmm(o.createdAt)} · ${ago(o.createdAt)}`));
    const who = el('p', 'who', o.name + ' · '); const tel = el('a', '', o.tel); tel.href = 'tel:' + o.tel.replace(/[^\d+]/g, ''); who.append(tel);
    const items = el('ul');
    o.items.forEach(l => { const li = el('li'); li.append(el('b', '', l.n + '×')); const s = el('span', '', l.name); if (l.unit) s.append(' ', el('small', '', l.unit)); li.append(s); items.append(li); });
    c.append(head, who, el('p', 'slot', 'Retrait : ' + o.slot + (o.total != null ? ` · ${eur(o.total)}` : '')), items);
    if (o.note) c.append(el('p', 'note', '« ' + o.note + ' »'));
    if (o.arrived) c.append(el('p', 'park', 'Le client est garé devant !'));
    const [next, label] = NEXT[o.status];
    const b = el('button', 'act', label); b.type = 'button'; b.dataset.next = next; c.append(b);
    return c;
  }

  function render(list) {
    const live = list.filter(o => o.status !== 'done');
    ['new', 'preparing', 'ready'].forEach(st => {
      const col = $('#col-' + st), rows = live.filter(o => o.status === st).sort((a, b) => a.createdAt - b.createdAt);
      col.replaceChildren(...(rows.length ? rows.map(card) : [el('p', 'pass-empty', 'Rien pour le moment.')]));
      $('#n-' + st).textContent = rows.length;
    });
    $('#foot').textContent = `${list.filter(o => o.status === 'done').length} commande(s) remise(s) aujourd'hui.`;
    // alertes sonores : nouvelle commande ou client arrivé
    let ring = false;
    list.forEach(o => {
      if (!seen.has(o.id)) { seen.add(o.id); if (!first && o.status === 'new') ring = true; }
      if (o.arrived && !arrivedSeen.has(o.id)) { arrivedSeen.add(o.id); if (!first) ring = true; }
    });
    first = false;
    if (ring) beep();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.act'); if (!b) return;
    OrderStore.update(b.closest('.pass-card').dataset.id, { status: b.dataset.next });
    render(OrderStore.list());
  });
  $('#sound').addEventListener('click', e => {
    sound = !sound; e.currentTarget.setAttribute('aria-pressed', String(sound));
    e.currentTarget.textContent = sound ? 'Son activé' : 'Activer le son'; if (sound) beep(1);
  });
  $('#simulate').addEventListener('click', () => {
    const names = ['Camille', 'Yanis', 'Léa', 'Karim', 'Sophie'];
    OrderStore.add({ name: names[Math.floor(Math.random() * names.length)], tel: '06 12 34 56 78', slot: 'Dès que possible', note: '',
      items: [{ n: 4, name: 'Nem porc-crevette', unit: 'la pièce', price: 1.3 }, { n: 1, name: 'Phở bò (bœuf)', unit: '', price: 9.5 }], total: 14.7 });
    render(OrderStore.list());
  });
  $('#wipe').addEventListener('click', () => { if (confirm('Effacer toutes les commandes de la démo ?')) { OrderStore.clear(); render([]); } });

  OrderStore.subscribe(render);
  render(OrderStore.list());
  setInterval(() => render(OrderStore.list()), 30000);   // rafraîchit les « il y a X min »
})();
