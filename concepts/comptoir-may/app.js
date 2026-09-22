(() => {
  document.documentElement.classList.add('js');

  /* ───────── Données ─────────
     Carte du restaurant fictif Mây. [nom, unité / précision, prix en € — null = prix « à préciser au comptoir »] */
  const MENU = [
    { id: 'entrees', title: 'Entrées', note: 'Prix à la pièce, sauf mention contraire', items: [
      ['Nem porc-crevette', 'la pièce', 1.30],
      ['Nem poulet-citronnelle', 'la pièce', 1.30],
      ['Nem végétarien', 'la pièce', 1.20],
      ['Beignet de crevette', 'la pièce', 1.40],
      ['Samoussa légumes', 'la pièce', 1.30],
      ['Rouleau de printemps crevette', 'la pièce', 2.60],
      ['Rouleau de printemps tofu', 'la pièce', 2.30],
      ['Gyoza porc', '5 pièces', 5.90],
      ['Bánh bao porc', 'la pièce', 3.80],
    ]},
    { id: 'soupes', title: 'Soupes', items: [
      ['Phở bò (bœuf)', '', 9.50],
      ['Phở gà (poulet)', '', 9.00],
      ['Soupe de raviolis crevette', '', 8.50],
      ['Bún bò Huế (épicée)', '', 10.00],
    ]},
    { id: 'salades', title: 'Salades', items: [
      ['Salade de papaye verte', '', 5.50],
      ['Salade de pousses de soja', '', 3.80],
      ['Salade de poulet à la menthe', '', 6.00],
    ]},
    { id: 'plats', title: 'Plats au wok', items: [
      ['Poulet citronnelle', '', 8.50],
      ['Poulet au caramel', '', 8.50],
      ['Poulet curry coco', '', 8.90],
      ['Bœuf lok lak', '', 10.50],
      ['Bœuf sauté aux oignons', '', 9.50],
      ['Porc au caramel et œuf', '', 9.00],
      ['Crevettes sautées ail-poivre', '', 10.90],
      ['Tofu sauté aux légumes', '', 8.00],
      ['Brochettes de poulet grillé', '2 pièces', 5.50],
      ['Brochettes de bœuf citronnelle', '2 pièces', 6.50],
    ]},
    { id: 'nouilles', title: 'Bo-bún & nouilles', items: [
      ['Bo-bún bœuf', '', 10.50],
      ['Bo-bún nem', '', 9.50],
      ['Bo-bún tofu', '', 9.00],
      ['Nouilles sautées poulet', '', 8.50],
      ['Nouilles sautées crevettes', '', 9.50],
      ['Vermicelles sautés aux légumes', '', 7.90],
    ]},
    { id: 'accompagnements', title: 'Accompagnements', items: [
      ['Riz jasmin', '', 2.50],
      ['Riz sauté aux œufs', '', 3.90],
      ['Légumes sautés', '', 4.50],
    ]},
    { id: 'desserts', title: 'Desserts', items: [
      ['Perles de coco', '2 pièces', 3.50],
      ['Mochi', '2 pièces', 4.00],
      ['Banane flambée', '', 4.50],
      ['Chè au lait de coco', '', 4.50],
    ]},
    { id: 'boissons', title: 'Boissons', items: [
      ['Thé glacé citronnelle maison', '', 3.20],
      ['Limonade gingembre maison', '', 3.50],
      ['Eau minérale', '50 cl', 1.80],
      ['Soda', '33 cl', 2.50],
      ['Café glacé vietnamien', '', 3.90],
      ['Bière Saigon', '33 cl', 4.20],
    ]},
  ];

  // Horaires (fictifs) : mer–dim 11h30–14h30 / 18h30–22h, fermé lundi et mardi.
  const SERVICES = [[690, 870], [1110, 1320]];
  const HOURS = { 0: SERVICES, 1: [], 2: [], 3: SERVICES, 4: SERVICES, 5: SERVICES, 6: SERVICES };
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const $ = (s, r = document) => r.querySelector(s);
  const eur = n => n.toFixed(2).replace('.', ',') + ' €';
  const hm = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

  /* ───────── Statut ouvert / fermé (heure de Paris) ───────── */
  function parisNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { day, min: +p.hour * 60 + +p.minute };
  }

  function renderStatus() {
    const { day, min } = parisNow();
    const el = $('#status');
    const now = HOURS[day].find(([a, b]) => min >= a && min < b);
    let txt, cls;
    if (now) {
      cls = 'open'; txt = `Ouvert · jusqu'à ${hm(now[1])}`;
    } else {
      cls = 'closed';
      const next = HOURS[day].find(([a]) => a > min);
      if (next) txt = `Fermé · ouvre à ${hm(next[0])}`;
      else {
        let d = 1;
        while (!HOURS[(day + d) % 7].length) d++;
        const nd = (day + d) % 7;
        const when = d === 1 ? 'demain' : DAYS[nd].toLowerCase();
        txt = `Fermé · ouvre ${when} à ${hm(HOURS[nd][0][0])}`;
      }
    }
    el.className = 'status ' + cls;
    el.lastElementChild.textContent = txt;
    const pre = $('#preorder');
    if (pre) {
      pre.hidden = cls === 'open';
      if (cls === 'closed') pre.textContent = `Fermé pour le moment. Commandez dès maintenant : retrait à l'ouverture, ${txt.split('ouvre ')[1]}.`;
    }
  }

  function renderHours() {
    const { day } = parisNow();
    const order = [2, 3, 4, 5, 6, 0, 1];
    $('#hours tbody').innerHTML = order.map(d => {
      const h = HOURS[d];
      const cells = h.length ? h.map(([a, b]) => `${hm(a)}–${hm(b)}`).join(' · ') : 'Fermé';
      return `<tr class="${d === day ? 'today' : ''} ${h.length ? '' : 'off'}"><th scope="row">${DAYS[d]}</th><td>${cells}</td></tr>`;
    }).join('');
  }

  /* ───────── Carte + ticket ───────── */
  // (orders.js doit être chargé avant ce fichier)
  const qty = new Map(); // clé "cat:index" → quantité
  const flat = new Map();

  function renderMenu() {
    $('#chips').innerHTML = MENU.map(c => `<a href="#cat-${c.id}" data-cat="${c.id}">${c.title.split(' ')[0]}</a>`).join('');
    $('#menu').innerHTML = MENU.map(c => `
      <div class="cat" id="cat-${c.id}">
        <h3>${c.title}</h3>
        ${c.note ? `<p class="note">${c.note}</p>` : ''}
        ${c.items.map(([name, unit, price], i) => {
          const key = `${c.id}:${i}`;
          flat.set(key, { name, unit, price });
          return `<div class="dish">
            <div class="dish-name">${name}${unit ? `<small>${unit}</small>` : ''}</div>
            <div class="dish-price ${price == null ? 'tbc' : ''}">${price == null ? 'prix au comptoir' : eur(price)}</div>
            <div class="step" data-key="${key}">
              <button class="minus" type="button" aria-label="Retirer ${name}">−</button>
              <output aria-live="off">0</output>
              <button class="plus" type="button" aria-label="Ajouter ${name}">+</button>
            </div>
          </div>`;
        }).join('')}
      </div>`).join('');
  }

  function renderTicket() {
    const lines = [...qty].filter(([, n]) => n > 0);
    const count = lines.reduce((s, [, n]) => s + n, 0);
    let total = 0, unpriced = 0;
    $('#ticket-lines').innerHTML = lines.map(([key, n]) => {
      const d = flat.get(key);
      if (d.price == null) unpriced++; else total += d.price * n;
      return `<li><b>${n}×</b><span>${d.name}${d.unit ? `<em>${d.unit}</em>` : ''}</span><span>${d.price == null ? '—' : eur(d.price * n)}</span></li>`;
    }).join('');

    document.querySelectorAll('.step').forEach(s => {
      const n = qty.get(s.dataset.key) || 0;
      s.classList.toggle('has', n > 0);
      s.querySelector('output').textContent = n;
    });

    $('#ticket-empty').hidden = count > 0;
    $('#ticket-total').hidden = count === 0;
    $('#total-value').textContent = eur(total);
    const foot = $('#ticket-foot');
    foot.hidden = !unpriced;
    foot.textContent = unpriced ? `* ${unpriced} plat${unpriced > 1 ? 's' : ''} sans prix affiché : à préciser au comptoir.` : '';
    $('#copy').disabled = $('#clear').disabled = $('#order-btn').disabled = count === 0;
    const last = lastOrder();
    $('#reorder').hidden = count > 0 || !last;
    if (last) $('#reorder-label').textContent = `Refaire ma dernière commande (${last.reduce((s, [, n]) => s + n, 0)} articles)`;
    $('#dock-count').textContent = count;
  }

  function orderText() {
    const lines = [...qty].filter(([, n]) => n > 0).map(([key, n]) => {
      const d = flat.get(key);
      return `${n} × ${d.name}${d.unit ? ` (${d.unit})` : ''}`;
    });
    return `Bonjour, je voudrais commander chez Mây :\n${lines.join('\n')}\nMerci !`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.step button');
    if (b) {
      const key = b.parentElement.dataset.key;
      const n = (qty.get(key) || 0) + (b.classList.contains('plus') ? 1 : -1);
      qty.set(key, Math.max(0, Math.min(99, n)));
      renderTicket();
    }
  });

  $('#clear').addEventListener('click', () => { qty.clear(); renderTicket(); });
  $('#copy').addEventListener('click', async e => {
    const btn = e.currentTarget, text = orderText(), old = btn.textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copié ✓'; }
    catch { window.prompt('Copiez votre commande :', text); }
    setTimeout(() => (btn.textContent = old), 1800);
  });

  // numéro du prochain ticket = numéro réel de la prochaine commande du jour
  const pad = n => String(n).padStart(3, '0');
  const refreshNo = () => { $('#ticket-no').textContent = 'N° ' + pad(OrderStore.nextNo()); };
  refreshNo();

  // dernière commande (mémorisée seulement si le client l'a autorisé) : [[clé, quantité], …]
  function lastOrder() {
    try {
      const l = JSON.parse(localStorage.getItem('tv-last') || 'null');
      const ok = Array.isArray(l) ? l.filter(([k, n]) => flat.has(k) && n > 0) : [];
      return ok.length ? ok : null;
    } catch { return null; }
  }
  $('#reorder').addEventListener('click', () => {
    const l = lastOrder(); if (!l) return;
    qty.clear(); l.forEach(([k, n]) => qty.set(k, n)); renderTicket();
  });

  /* ───────── Commande ─────────
     Concept fictif : DEMO toujours actif, la commande n'est transmise à personne (visible sur comptoir.html).
     Pour un vrai restaurant : renseigner ENDPOINT (URL qui reçoit le JSON) et passer DEMO à false. */
  const CONFIG = { DEMO: true, ENDPOINT: null };

  renderMenu(); renderTicket(); renderStatus(); renderHours();
  setInterval(renderStatus, 60000);

  /* ───────── Commande ───────── (réglage CONFIG plus haut) */
  const dlg = $('#checkout'), form = $('#co-form');
  let openedAt = 0;

  const orderLines = () => [...qty].filter(([, n]) => n > 0).map(([key, n]) => ({ n, ...flat.get(key) }));

  function buildSlots() {
    const { day, min } = parisNow();
    const out = [];
    if (HOURS[day].some(([a, b]) => min >= a && min < b)) out.push('Dès que possible');
    for (let d = 0; d < 3 && out.length < 14; d++) {
      const di = (day + d) % 7;
      const label = d === 0 ? "Aujourd'hui" : d === 1 ? 'Demain' : DAYS[di];
      for (const [a, b] of HOURS[di]) {
        for (let t = a; t <= b - 15; t += 15) {
          if (d === 0 && t < min + 15) continue;
          out.push(`${label} · ${hm(t)}`);
        }
      }
    }
    return out;
  }

  function showView(done) {
    $('#co-form-view').hidden = done;
    $('#co-done-view').hidden = !done;
    $('#co-demo').hidden = !CONFIG.DEMO;
  }

  // suggestions au moment de commander : un accompagnement, une boisson (jamais d'alcool)
  const SUGGEST = [
    { cat: 'accompagnements', title: 'Un riz avec ça ?', keys: ['accompagnements:0', 'accompagnements:1'] },
    { cat: 'boissons', title: 'Une boisson ?', keys: ['boissons:0', 'boissons:1', 'boissons:2'] },
  ];

  function renderRecap() {
    const lines = orderLines();
    let total = 0;
    $('#co-recap').innerHTML = lines.map(l => {
      if (l.price != null) total += l.price * l.n;
      return `<li><b>${l.n}×</b><span>${l.name}${l.unit ? ` <small>${l.unit}</small>` : ''}</span><span>${l.price == null ? '—' : eur(l.price * l.n)}</span></li>`;
    }).join('');
    $('#co-total').textContent = eur(total);
    $('#co-suggest').innerHTML = SUGGEST
      .filter(s => ![...qty].some(([k, n]) => n > 0 && k.startsWith(s.cat + ':')))
      .map(s => `<div class="sg"><span>${s.title}</span>${s.keys.map(k => `<button type="button" data-add="${k}">+ ${flat.get(k).name} <b>${eur(flat.get(k).price)}</b></button>`).join('')}</div>`)
      .join('');
  }
  $('#co-suggest').addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    qty.set(b.dataset.add, (qty.get(b.dataset.add) || 0) + 1);
    renderTicket(); renderRecap();
  });

  function openCheckout() {
    if (!orderLines().length) return;
    renderRecap();
    $('#co-slot').innerHTML = buildSlots().map(s => `<option>${s}</option>`).join('');
    try {   // uniquement si le client a coché « Mémoriser » lors d'une commande précédente
      const n = localStorage.getItem('tv-name'), t = localStorage.getItem('tv-tel');
      if (n && t) { form.elements.name.value = n; form.elements.tel.value = t; form.elements.remember.checked = true; }
    } catch {}
    openedAt = Date.now();
    $('#co-err').textContent = '';
    form.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
    showView(false);
    dlg.showModal();
  }

  // Renvoie la commande enregistrée (avec son numéro), ou null si le serveur ne suit pas l'état de la commande.
  async function sendOrder(order) {
    if (!CONFIG.ENDPOINT) {
      if (!CONFIG.DEMO) throw new Error('no endpoint');
      await new Promise(r => setTimeout(r, 900));
      const total = order.items.reduce((s, l) => s + (l.price == null ? 0 : l.price * l.n), 0);
      return OrderStore.add({ ...order, total });       // démo : visible sur comptoir.html
    }
    const res = await fetch(CONFIG.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    if (!res.ok) throw new Error(String(res.status));
    return null;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.elements.name.value.trim(), tel = form.elements.tel.value.trim();
    const telOk = /^(?:\+33|0033|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/.test(tel);
    form.elements.name.classList.toggle('invalid', name.length < 2);
    form.elements.tel.classList.toggle('invalid', !telOk);
    form.elements.name.setAttribute('aria-invalid', String(name.length < 2));
    form.elements.tel.setAttribute('aria-invalid', String(!telOk));
    if (name.length < 2 || !telOk) {
      $('#co-err').textContent = name.length < 2 ? 'Indiquez votre prénom.' : 'Vérifiez votre numéro de téléphone (ex. 06 12 34 56 78).';
      (name.length < 2 ? form.elements.name : form.elements.tel).focus();
      return;
    }
    $('#co-err').textContent = '';
    const btn = $('#co-submit');
    btn.disabled = true; btn.textContent = 'Envoi…';
    const order = { name, tel, slot: form.elements.slot.value, note: form.elements.note.value.trim(), items: orderLines(), text: orderText() };
    // Anti-spam côté page : champ piège rempli ou envoi en moins de 2 s = robot → faux succès, rien n'est envoyé.
    // La vraie protection (limitation de débit, captcha type Turnstile) se fait côté serveur, sur ENDPOINT.
    const bot = form.elements.website.value !== '' || Date.now() - openedAt < 2000;
    let saved = null;
    try {
      if (!bot) saved = await sendOrder(order);
    } catch {
      $('#co-err').textContent = 'Envoi impossible. Appelez-nous au 04 65 71 20 26.';
      btn.disabled = false; btn.textContent = 'Envoyer ma commande';
      return;
    }
    try {
      if (form.elements.remember.checked) {
        localStorage.setItem('tv-name', name); localStorage.setItem('tv-tel', tel);
        localStorage.setItem('tv-last', JSON.stringify([...qty].filter(([, n]) => n > 0)));
      } else { ['tv-name', 'tv-tel', 'tv-last'].forEach(k => localStorage.removeItem(k)); }
    } catch {}
    currentId = saved ? saved.id : null;
    $('#co-num').textContent = 'Commande N° ' + pad(saved ? saved.no : OrderStore.nextNo());
    $('#co-name').textContent = name;
    $('#co-when').textContent = 'Retrait au comptoir · ' + order.slot;
    $('#co-park').hidden = !saved; $('#co-park-done').hidden = true;
    $('#co-park').disabled = false;
    renderTrack(saved ? saved.status : 'new');
    btn.disabled = false; btn.textContent = 'Envoyer ma commande';
    showView(true);
    $('#co-done-view').scrollIntoView({ block: 'start' });
  });

  // Suivi de la commande : l'écran du comptoir (comptoir.html) change l'état, le client le voit en direct.
  let currentId = null;
  function renderTrack(status) {
    const [s1, s2, s3] = document.querySelectorAll('#track li');
    const ready = status === 'ready' || status === 'done';
    s1.className = 'done';
    s2.className = ready ? 'done' : status === 'preparing' ? 'now' : '';
    s3.className = ready ? 'done' : '';
    $('#co-headline').textContent = ready ? 'Votre commande est prête !' : 'Nous préparons votre commande.';
  }
  OrderStore.subscribe(list => {
    refreshNo();
    const o = currentId && list.find(x => x.id === currentId);
    if (o) renderTrack(o.status);
  });
  $('#co-park').addEventListener('click', e => {
    if (currentId) OrderStore.update(currentId, { arrived: true, arrivedAt: Date.now() });
    e.currentTarget.disabled = true; e.currentTarget.hidden = true; $('#co-park-done').hidden = false;
  });

  $('#order-btn').addEventListener('click', openCheckout);
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  dlg.addEventListener('close', () => {
    if (!$('#co-done-view').hidden) {           // commande envoyée : on repart d'un ticket vide
      qty.clear(); renderTicket(); refreshNo();
      form.elements.note.value = '';
    }
    currentId = null;
    showView(false);
  });

  /* ───────── Carte : Google Maps chargé seulement sur clic ───────── */
  $('#map-load').addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.title = 'Carte : Valence';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.src = 'https://www.google.com/maps?q=Valence+Drôme&output=embed';
    $('#map').replaceChildren(f);
  });

  /* ───────── Route qui avance + apparitions + puces actives ───────── */
  const bar = $('#progress');
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1) * 100) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.hero-copy, .steps li, .stamp, .ticket, .score, .slip, .visit-grid > div').forEach(el => {
    el.classList.add('reveal'); io.observe(el);
  });

  const chips = [...document.querySelectorAll('.chips a')];
  const menuCol = $('.menu-col');
  const desktop = matchMedia('(min-width:981px)');
  let co;
  const watchCats = () => {
    if (co) co.disconnect();
    co = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) chips.forEach(c => c.classList.toggle('on', c.dataset.cat === en.target.id.slice(4)));
    }), { root: desktop.matches ? menuCol : null, rootMargin: desktop.matches ? '-15% 0px -70% 0px' : '-30% 0px -60% 0px' });
    document.querySelectorAll('.cat').forEach(c => co.observe(c));
  };
  watchCats();
  desktop.addEventListener('change', watchCats);

  // Bureau : un clic sur une puce fait défiler la carte dans son cadre, sans bouger la page
  $('#chips').addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || !desktop.matches) return;
    e.preventDefault();
    const cat = document.getElementById('cat-' + a.dataset.cat);
    menuCol.scrollTo({ top: cat.offsetTop - $('#chips').offsetHeight, behavior: 'smooth' });
    chips.forEach(c => c.classList.toggle('on', c === a));
  });
})();
