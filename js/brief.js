// Nova Studio — questionnaire « Votre projet » : étapes, validation, brouillon local, envoi (Netlify Forms)
(function () {
  'use strict';

  var form = document.getElementById('brief-form');
  if (!form) return;

  var slug = form.getAttribute('data-slug') || 'brief';
  var steps = Array.prototype.slice.call(form.querySelectorAll('.brief-step'));
  var labels = Array.prototype.slice.call(document.querySelectorAll('[data-step-label]'));
  var bar = document.querySelector('.brief-progress span');
  var stepsNav = document.querySelector('.brief-steps');
  var progress = document.querySelector('.brief-progress');
  var prevBtn = document.getElementById('brief-prev');
  var nextBtn = document.getElementById('brief-next');
  var submitBtn = document.getElementById('brief-submit');
  var clearBtn = document.getElementById('brief-clear');
  var msg = document.getElementById('brief-error');
  var done = document.getElementById('brief-done');
  var started = document.getElementById('form-started');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var openedAt = Date.now();
  var current = 0;
  var last = steps.length - 1;
  var KEY = 'nova-brief-' + slug;

  if (started) started.value = String(openedAt);
  document.documentElement.classList.add('brief-js');

  // ---------------------------------------------------------
  // Messages
  // ---------------------------------------------------------
  function say(text, ok) {
    msg.textContent = text || '';
    msg.classList.toggle('is-ok', !!ok);
  }

  // ---------------------------------------------------------
  // Étapes
  // ---------------------------------------------------------
  function show(i, silent) {
    current = Math.max(0, Math.min(last, i));
    steps.forEach(function (s, idx) { s.classList.toggle('is-active', idx === current); });
    labels.forEach(function (l, idx) {
      l.classList.toggle('is-active', idx === current);
      l.classList.toggle('is-done', idx < current);
      if (idx === current) l.setAttribute('aria-current', 'step'); else l.removeAttribute('aria-current');
    });
    if (bar) bar.style.width = ((current + 1) / steps.length * 100) + '%';
    prevBtn.hidden = current === 0;
    nextBtn.hidden = current === last;
    submitBtn.hidden = current !== last;
    say('');
    if (!silent) {
      var top = form.getBoundingClientRect().top + window.scrollY - (stepsNav ? stepsNav.offsetHeight + 140 : 160);
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
      var legend = steps[current].querySelector('legend');
      if (legend) { legend.setAttribute('tabindex', '-1'); legend.focus({ preventScroll: true }); }
    }
  }

  // ---------------------------------------------------------
  // Validation (par étape)
  // ---------------------------------------------------------
  function clearErrors(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.has-error'), function (f) {
      f.classList.remove('has-error');
      var e = f.querySelector('.field-error');
      if (e) e.parentNode.removeChild(e);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
  }

  function fail(field, text, control) {
    field.classList.add('has-error');
    var p = document.createElement('p');
    p.className = 'field-error';
    p.textContent = text;
    field.appendChild(p);
    if (control) control.setAttribute('aria-invalid', 'true');
  }

  function validateStep(i) {
    var step = steps[i];
    var firstBad = null;
    clearErrors(step);

    Array.prototype.forEach.call(step.querySelectorAll('.field'), function (field) {
      var bad = false;
      if (field.classList.contains('field-choice')) {
        if (field.getAttribute('data-required') === 'true') {
          var picked = field.querySelector('input:checked');
          var other = field.querySelector('.chip-other');
          if (!picked && !(other && other.value.trim())) {
            fail(field, 'Choisissez au moins une réponse.');
            bad = true;
          }
        }
      } else if (field.classList.contains('field-consent')) {
        var box = field.querySelector('input[type="checkbox"]');
        if (box && box.required && !box.checked) {
          fail(field, 'Merci de cocher cette case pour continuer.', box);
          bad = true;
        }
      } else {
        var el = field.querySelector('input, textarea');
        if (el) {
          var v = el.value.trim();
          if (el.required && !v) {
            fail(field, 'Ce champ nous est nécessaire pour vous répondre.', el);
            bad = true;
          } else if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
            fail(field, 'Cette adresse e-mail semble incomplète (exemple : prenom@commerce.fr).', el);
            bad = true;
          }
        }
      }
      if (bad && !firstBad) firstBad = field;
    });

    if (firstBad) {
      var target = firstBad.querySelector('input, textarea');
      firstBad.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      if (target) target.focus({ preventScroll: true });
      say('Quelques réponses sont à compléter pour continuer.');
      return false;
    }
    return true;
  }

  // Les erreurs disparaissent dès que le visiteur corrige
  form.addEventListener('input', clearField);
  form.addEventListener('change', clearField);
  function clearField(e) {
    var field = e.target.closest && e.target.closest('.field');
    if (!field || !field.classList.contains('has-error')) return;
    field.classList.remove('has-error');
    var err = field.querySelector('.field-error');
    if (err) err.parentNode.removeChild(err);
    var el = field.querySelector('[aria-invalid]');
    if (el) el.removeAttribute('aria-invalid');
    say('');
  }

  prevBtn.addEventListener('click', function () { show(current - 1); });
  nextBtn.addEventListener('click', function () { if (validateStep(current)) show(current + 1); });

  // Entrée dans un champ simple : étape suivante (et non envoi anticipé)
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (!t || t.tagName !== 'INPUT' || t.type === 'checkbox' || t.type === 'radio' || t.type === 'submit') return;
    if (current < last) {
      e.preventDefault();
      nextBtn.click();
    }
  });

  // ---------------------------------------------------------
  // Brouillon local (jamais envoyé) — facultatif : sans stockage, tout fonctionne quand même
  // ---------------------------------------------------------
  var skip = /^(form-name|form-started|bot-field|metier|subject|recapitulatif|consentement)$/;
  var saveTimer = null;

  function collect() {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || skip.test(el.name)) return;
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (el.checked) (data[el.name] = data[el.name] || []).push(el.value);
      } else if (el.value) {
        data[el.name] = [el.value];
      }
    });
    return data;
  }

  function saveDraft() {
    try {
      var data = collect();
      if (Object.keys(data).length) {
        localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: data }));
      } else {
        localStorage.removeItem(KEY);
      }
    } catch (err) { /* stockage indisponible : on continue sans brouillon */ }
  }

  function restoreDraft() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || !saved.d || Date.now() - saved.t > 30 * 24 * 3600 * 1000) {
        localStorage.removeItem(KEY);
        return;
      }
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || skip.test(el.name) || !saved.d[el.name]) return;
        if (el.type === 'radio' || el.type === 'checkbox') {
          el.checked = saved.d[el.name].indexOf(el.value) !== -1;
        } else {
          el.value = saved.d[el.name][0];
        }
      });
      say('Vos réponses précédentes ont été retrouvées sur cet appareil.', true);
    } catch (err) { /* brouillon illisible : ignoré */ }
  }

  form.addEventListener('input', queueSave);
  form.addEventListener('change', queueSave);
  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }

  clearBtn.addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (err) { /* ignoré */ }
    form.reset();
    if (started) started.value = String(Date.now());
    clearErrors(form);
    show(0, true);
    say('Vos réponses ont été effacées de cet appareil.', true);
  });

  // ---------------------------------------------------------
  // Envoi
  // ---------------------------------------------------------
  // Récapitulatif lisible (question → réponse) joint à l'envoi : il sert à fabriquer les e-mails
  // (voir netlify/functions/submission-created.js). Les réponses vides sont ignorées.
  function labelText(el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.req'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function buildRecap() {
    return JSON.stringify(steps.map(function (step) {
      var items = [];
      Array.prototype.forEach.call(step.querySelectorAll('.field'), function (field) {
        if (field.classList.contains('field-consent')) return;
        var q, a;
        if (field.classList.contains('field-choice')) {
          q = labelText(field.querySelector('legend'));
          var vals = Array.prototype.map.call(field.querySelectorAll('input:checked'), function (i) { return i.value; });
          var other = field.querySelector('.chip-other');
          if (other && other.value.trim()) vals.push('Autre : ' + other.value.trim());
          a = vals.join(', ');
        } else {
          q = labelText(field.querySelector('label'));
          var el = field.querySelector('input, textarea');
          a = el ? el.value.trim() : '';
        }
        if (a) items.push([q, a]);
      });
      return { title: step.getAttribute('data-title') || '', items: items };
    }));
  }

  function prepareMail() {
    var v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var subject = document.getElementById('mail-subject');
    var recap = document.getElementById('recap');
    var metier = (form.elements.metier && form.elements.metier.value) || 'Projet';
    var activite = v('nom_activite');
    var nom = v('nom');
    if (subject) subject.value = ('Nouveau client · ' + metier + (activite ? ' · ' + activite : '') + (nom ? ' (' + nom + ')' : '')).replace(/[\r\n]+/g, ' ').slice(0, 180);
    if (recap) recap.value = buildRecap();
  }

  function finish() {
    try { localStorage.removeItem(KEY); } catch (err) { /* ignoré */ }
    form.hidden = true;
    if (stepsNav) stepsNav.hidden = true;
    if (progress) progress.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    done.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var i = 0; i < steps.length; i++) {
      if (!validateStep(i)) { show(i, true); validateStep(i); return; }
    }

    // Anti-spam : champ piège rempli, ou envoi en moins de 8 s = robot. On répond « merci » sans rien envoyer.
    var trap = form.querySelector('[name="bot-field"]');
    if ((trap && trap.value) || Date.now() - openedAt < 8000) { finish(); return; }

    prepareMail();
    submitBtn.disabled = true;
    say('Envoi en cours…', true);
    fetch(form.getAttribute('action') || '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('http ' + res.status);
      finish();
    }).catch(function () {
      say("L'envoi n'a pas abouti. Vos réponses sont conservées sur cet appareil : réessayez, ou écrivez-nous à NovaStudio.fra@gmail.com, ou appelez le 06 84 83 01 08.", false);
      saveDraft();
    }).then(function () {
      submitBtn.disabled = false;
    });
  });

  show(0, true);
  restoreDraft();
})();
