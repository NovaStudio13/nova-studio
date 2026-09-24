/* Nacre · données du salon + carnet de rendez-vous (MODE DÉMO) — partagé entre le site (index.html)
   et l'agenda du salon (agenda.html).
   Les rendez-vous sont stockés dans le navigateur (localStorage) : la démo fonctionne entre deux onglets
   du même navigateur, sans serveur. Pour une vraie mise en service, remplacer le bloc « Carnet » par un client
   d'API (Supabase, Firebase, outil de réservation existant…) qui expose la MÊME interface :
   list, add, update, subscribe, clear. Le calcul des créneaux (freeSlots) doit alors être refait côté serveur. */
(() => {
  /* ───────── Le salon (fictif) ───────── */
  // Horaires d'ouverture en minutes depuis minuit, index = jour (0 = dimanche).
  const OPEN = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1200], 5: [540, 1140], 6: [540, 1020] };
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // skills : catégories de prestations que la personne réalise. days : jours travaillés.
  const STAFF = [
    { id: 'ines',  name: 'Inès',  role: 'Fondatrice · coloriste', days: [2, 3, 4, 5, 6], skills: ['femme', 'couleur', 'soin', 'enfant'] },
    { id: 'malo',  name: 'Malo',  role: 'Coupe homme · barbier',  days: [2, 4, 5, 6],    skills: ['homme', 'enfant', 'soin'] },
    { id: 'clara', name: 'Clara', role: 'Coupe · chignons',       days: [3, 4, 5, 6],    skills: ['femme', 'couleur', 'soin', 'enfant'] },
  ];

  // Prestations : [id, catégorie, nom, précision, durée (min), prix (€), « à partir de » ?]
  const CATS = [
    { id: 'femme',   title: 'Femme' },
    { id: 'homme',   title: 'Homme' },
    { id: 'couleur', title: 'Couleur' },
    { id: 'soin',    title: 'Soins' },
    { id: 'enfant',  title: 'Enfant' },
  ];
  const SERVICES = [
    ['cb-court',  'femme',   'Coupe & brushing', 'cheveux courts', 45, 48],
    ['cb-long',   'femme',   'Coupe & brushing', 'cheveux mi-longs à longs', 60, 58],
    ['brushing',  'femme',   'Brushing', 'toutes longueurs', 30, 32],
    ['chignon',   'femme',   'Chignon & attache', 'mariage, soirée', 60, 65, true],
    ['h-coupe',   'homme',   'Coupe homme', 'shampooing compris', 30, 28],
    ['h-barbe',   'homme',   'Coupe & barbe', 'taille à la tondeuse et au rasoir', 45, 40],
    ['barbe',     'homme',   'Taille de barbe', 'serviette chaude', 20, 18],
    ['racines',   'couleur', 'Couleur racines', 'temps de pose compris', 75, 52],
    ['balayage',  'couleur', 'Balayage', 'éclaircissement à main levée', 150, 110, true],
    ['gloss',     'couleur', 'Gloss', 'patine brillance, 6 semaines', 30, 30],
    ['diag',      'couleur', 'Diagnostic couleur', 'avant une première couleur', 15, 0],
    ['soin',      'soin',    'Soin profond', 'masque & massage crânien', 20, 22],
    ['massage',   'soin',    'Rituel détente', 'shampooing massant, 25 minutes', 25, 30],
    ['enfant',    'enfant',  'Coupe enfant', 'moins de 12 ans', 30, 20],
  ].map(([id, cat, name, detail, dur, price, from]) => ({ id, cat, name, detail, dur, price, from: !!from }));
  const byId = new Map(SERVICES.map(s => [s.id, s]));

  /* ───────── Dates (heure de Paris) ───────── */
  const pad = n => String(n).padStart(2, '0');
  const hm = m => `${Math.floor(m / 60)}h${pad(m % 60)}`;
  function parisNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const key = `${p.year}-${p.month}-${p.day}`;
    return { key, day: dow(key), min: +p.hour * 60 + +p.minute };
  }
  const toUTC = key => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const dow = key => new Date(toUTC(key)).getUTCDay();
  function addDays(key, n) {
    const d = new Date(toUTC(key) + n * 864e5);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function longDate(key) {
    const [, m, d] = key.split('-').map(Number);
    return `${DAYS[dow(key)].toLowerCase()} ${d === 1 ? '1er' : d} ${MONTHS[m - 1]}`;
  }

  /* ───────── Rendez-vous déjà pris (fictifs) ─────────
     Pour que l'agenda ne soit pas vide, chaque journée reçoit des rendez-vous inventés, toujours les mêmes
     pour une date donnée (générateur pseudo-aléatoire initialisé par la date et la personne). Rien n'est stocké. */
  const FIRST = ['Camille', 'Léa', 'Hugo', 'Nadia', 'Louis', 'Sarah', 'Yanis', 'Chloé', 'Paul', 'Manon', 'Rémi', 'Inaya', 'Jeanne', 'Tom', 'Aïcha', 'Lucas', 'Élise', 'Karim'];
  function rng(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  const seedCache = new Map();
  function seeded(key) {
    if (seedCache.has(key)) return seedCache.get(key);
    const out = [], open = OPEN[dow(key)];
    if (open) for (const st of STAFF) {
      if (!st.days.includes(dow(key))) continue;
      const r = rng(key + st.id), pool = SERVICES.filter(s => st.skills.includes(s.cat) && s.price > 0);
      const lunch = 720 + Math.floor(r() * 5) * 15;              // pause de 45 min entre 12h et 13h
      out.push({ id: `demo-${key}-${st.id}-pause`, demo: true, pause: true, date: key, staffId: st.id, start: lunch, dur: 45, services: [], name: 'Pause' });
      let t = open[0];
      while (t < open[1]) {
        if (t >= lunch && t < lunch + 45) { t = lunch + 45; continue; }
        if (r() < 0.38) { t += 15 * (1 + Math.floor(r() * 3)); continue; }
        const s = pool[Math.floor(r() * pool.length)];
        const end = t + s.dur;
        if (end > open[1] || (t < lunch && end > lunch)) { t += 15; continue; }
        out.push({ id: `demo-${key}-${st.id}-${t}`, demo: true, date: key, staffId: st.id, start: t, dur: s.dur,
          services: [s.id], name: `${FIRST[Math.floor(r() * FIRST.length)]} ${String.fromCharCode(65 + Math.floor(r() * 26))}.` });
        t = end;
      }
    }
    seedCache.set(key, out);
    return out;
  }

  /* ───────── Carnet (localStorage) ───────── */
  const KEY = 'nacre-rdv';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const write = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
  const subs = new Set();
  const emit = () => { const l = read(); subs.forEach(f => f(l)); };
  addEventListener('storage', e => { if (e.key === KEY) emit(); });

  const Store = {
    list: read,
    add(b) {
      const list = read();
      const ref = 'NAC-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const rec = { ...b, id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ref, createdAt: Date.now(), status: 'booked' };
      list.push(rec); write(list); emit();
      return rec;
    },
    update(id, patch) {
      const list = read(), i = list.findIndex(b => b.id === id);
      if (i < 0) return;
      list[i] = { ...list[i], ...patch }; write(list); emit();
    },
    clear() { write([]); emit(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };

  /* ───────── Créneaux libres ───────── */
  // Tous les rendez-vous d'une journée (fictifs + réels non annulés).
  const dayBookings = key => seeded(key).concat(read().filter(b => b.date === key && b.status !== 'cancelled'));
  const canDo = (st, ids) => ids.every(id => st.skills.includes(byId.get(id).cat));
  const duration = ids => ids.reduce((t, id) => t + byId.get(id).dur, 0);
  const works = (st, key) => !!OPEN[dow(key)] && st.days.includes(dow(key));

  // → [{ start, staffIds: [...] }] : pas de 15 min, au moins 1 h à l'avance le jour même.
  function freeSlots(key, ids, staffId = 'any') {
    const open = OPEN[dow(key)];
    if (!open || !ids.length) return [];
    const dur = duration(ids), now = parisNow();
    if (key < now.key) return [];
    const minStart = key === now.key ? Math.ceil((now.min + 60) / 15) * 15 : 0;
    const team = STAFF.filter(st => (staffId === 'any' || st.id === staffId) && works(st, key) && canDo(st, ids));
    const all = dayBookings(key), slots = new Map();
    for (const st of team) {
      const busy = all.filter(b => b.staffId === st.id);
      for (let t = Math.max(open[0], minStart); t + dur <= open[1]; t += 15) {
        if (busy.some(b => t < b.start + b.dur && b.start < t + dur)) continue;
        if (!slots.has(t)) slots.set(t, []);
        slots.get(t).push(st.id);
      }
    }
    return [...slots].sort((a, b) => a[0] - b[0]).map(([start, staffIds]) => ({ start, staffIds }));
  }

  window.Salon = { OPEN, DAYS, STAFF, CATS, SERVICES, byId, Store,
    pad, hm, parisNow, dow, addDays, longDate, seeded, dayBookings, freeSlots, duration, canDo, works };
})();
