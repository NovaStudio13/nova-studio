// Nova Studio — interactions & motion
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------
  // Header shadow/border on scroll
  // ---------------------------------------------------------
  var header = document.getElementById('site-header');
  var onScroll = function () {
    if (window.scrollY > 8) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------------------------------------------------------
  // Header logo: full wordmark → compact avatar as you scroll.
  // A CSS transition on --logo-p does the smoothing, so this only
  // needs to update the value, rAF-throttled during scroll.
  // ---------------------------------------------------------
  var logoRoot = document.documentElement;
  var logoTicking = false;
  var LOGO_MORPH_RANGE = 160;
  var updateLogoProgress = function () {
    var p = Math.min(1, window.scrollY / LOGO_MORPH_RANGE);
    logoRoot.style.setProperty('--logo-p', p.toFixed(3));
    logoTicking = false;
  };
  document.addEventListener('scroll', function () {
    if (!logoTicking) {
      logoTicking = true;
      requestAnimationFrame(updateLogoProgress);
    }
  }, { passive: true });
  updateLogoProgress();

  // ---------------------------------------------------------
  // Mobile nav toggle
  // ---------------------------------------------------------
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.innerHTML = isOpen
        ? '<svg class="icon" width="22" height="22"><use href="#icon-close"/></svg>'
        : '<svg class="icon" width="22" height="22"><use href="#icon-menu"/></svg>';
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<svg class="icon" width="22" height="22"><use href="#icon-menu"/></svg>';
      });
    });
  }

  // ---------------------------------------------------------
  // Titres : les mots montent un à un derrière un masque (h1, h2).
  // Le texte reste du vrai texte ; sans JS ou avec « mouvement réduit »,
  // les titres restent tels quels.
  // ---------------------------------------------------------
  var headings = document.querySelectorAll('h1, main h2');
  if (!reduceMotion && 'IntersectionObserver' in window && headings.length) {
    var wordIndex;
    var splitWords = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            var inner = document.createElement('span');
            w.className = 'w';
            inner.textContent = part;
            inner.style.setProperty('--i', wordIndex++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          splitWords(child);
        }
      });
    };
    var headingObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          headingObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    headings.forEach(function (h) {
      wordIndex = 0;
      h.classList.remove('reveal');
      splitWords(h);
      h.classList.add('is-split');
      headingObserver.observe(h);
    });
  }

  // ---------------------------------------------------------
  // Scroll reveal — one-shot fade/rise for text, cards, lists
  // ---------------------------------------------------------
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---------------------------------------------------------
  // Continuous scroll motion — mockups tilt in, NOVA signature
  // and glows drift, all driven by a single rAF loop and derived
  // fresh from live geometry each frame (naturally reversible).
  // ---------------------------------------------------------
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var motionEls = Array.prototype.slice.call(document.querySelectorAll('[data-motion]'));
    var heroEl = document.querySelector('[data-motion-scope="hero"]');
    var active = new Set();
    var looping = false;
    var settling = new Set();
    var vh = window.innerHeight;

    var clamp01 = function (n) { return n < 0 ? 0 : n > 1 ? 1 : n; };

    var motionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            active.add(entry.target);
            startLoop();
          } else {
            active.delete(entry.target);
            settling.delete(entry.target);
          }
        });
      },
      { rootMargin: '15% 0px 15% 0px', threshold: 0 }
    );
    motionEls.forEach(function (el) {
      el.style.setProperty('--p', '0');
      motionObserver.observe(el);
    });

    // The hero keeps its own always-observed slot so its background
    // signature and glow can track scroll for as long as it's in play.
    if (heroEl) {
      var heroObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { active.add(heroEl); startLoop(); }
            else { active.delete(heroEl); settling.delete(heroEl); }
          });
        },
        { rootMargin: '100% 0px 100% 0px', threshold: 0 }
      );
      heroObserver.observe(heroEl);
    }

    function tick() {
      // Batch reads before writes to avoid layout thrashing.
      var reads = [];
      active.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var target = el === heroEl
          ? clamp01(-rect.top / Math.max(rect.height * 0.9, 1))
          : clamp01((vh * 0.92 - rect.top) / (vh * 0.58));
        reads.push({ el: el, target: target });
      });
      settling.forEach(function (el) {
        if (active.has(el)) return;
        var current = parseFloat(el.dataset.p || '0');
        reads.push({ el: el, target: current, settled: current });
      });

      reads.forEach(function (item) {
        var el = item.el;
        var varName = el === heroEl ? '--hero-p' : '--p';
        var current = parseFloat(el.dataset.p || '0');
        var next = current + (item.target - current) * 0.14;
        if (Math.abs(next - item.target) < 0.0008) {
          next = item.target;
        } else {
          settling.add(el);
        }
        if (next === item.target) settling.delete(el);
        el.dataset.p = next;
        el.style.setProperty(varName, next.toFixed(4));
      });

      if (active.size > 0 || settling.size > 0) {
        requestAnimationFrame(tick);
      } else {
        looping = false;
      }
    }

    function startLoop() {
      if (!looping) {
        looping = true;
        requestAnimationFrame(tick);
      }
    }

    window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });
  } else {
    // Reduced motion (or no IntersectionObserver support): settle every
    // motion element at its resting state immediately, no animation loop.
    document.querySelectorAll('[data-motion]').forEach(function (el) {
      el.style.setProperty('--p', '1');
    });
    var staticHero = document.querySelector('[data-motion-scope="hero"]');
    if (staticHero) { staticHero.style.setProperty('--hero-p', '0'); }
  }

  // ---------------------------------------------------------
  // Custom cursor — desktop with a fine pointer only
  // ---------------------------------------------------------
  if (!reduceMotion && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var dotX = mouseX;
    var dotY = mouseY;
    var cursorVisible = false;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursorVisible) {
        cursorVisible = true;
        dot.classList.add('is-visible');
      }
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      cursorVisible = false;
      dot.classList.remove('is-visible');
    });

    var interactiveSelector = 'a, button, summary, input, .pill, [role="button"]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(interactiveSelector)) {
        dot.classList.add('cursor-dot--active');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(interactiveSelector)) {
        dot.classList.remove('cursor-dot--active');
      }
    });

    (function cursorTick() {
      dotX += (mouseX - dotX) * 0.18;
      dotY += (mouseY - dotY) * 0.18;
      dot.style.transform = 'translate3d(' + dotX + 'px,' + dotY + 'px,0)';
      requestAnimationFrame(cursorTick);
    })();
  }

  // ---------------------------------------------------------
  // Cartes « Pourquoi » : une lumière douce suit le curseur
  // ---------------------------------------------------------
  var benefitGrid = document.querySelector('.benefit-grid');
  if (benefitGrid && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    benefitGrid.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.benefit-card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    }, { passive: true });
  }

  // ---------------------------------------------------------
  // Repères chiffrés : les nombres se comptent à l'apparition
  // ---------------------------------------------------------
  var counters = document.querySelectorAll('[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window && counters.length) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        var el = entry.target;
        var target = parseFloat(el.getAttribute('data-count'));
        var start = performance.now();
        var duration = 1400;
        (function step(now) {
          var t = Math.min(1, (now - start) / duration);
          var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  // ---------------------------------------------------------
  // Lead form — validation, anti-spam, real submission (Netlify Forms)
  // ---------------------------------------------------------
  var form = document.getElementById('lead-form');
  var note = document.getElementById('form-note');
  if (form && note) {
    var emailInput = form.querySelector('#email');
    var submitBtn = form.querySelector('#form-submit');
    var startedField = form.querySelector('#form-started');
    var openedAt = Date.now();
    if (startedField) startedField.value = String(openedAt);

    var say = function (msg, isError) {
      note.textContent = msg;
      note.classList.toggle('is-error', !!isError);
    };
    var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailInput.value.trim();

      if (!email) {
        emailInput.setAttribute('aria-invalid', 'true');
        say('Indiquez votre adresse e-mail pour recevoir la proposition.', true);
        emailInput.focus();
        return;
      }
      if (!emailOk(email)) {
        emailInput.setAttribute('aria-invalid', 'true');
        say('Cette adresse e-mail semble incomplète (exemple : prenom@commerce.fr).', true);
        emailInput.focus();
        return;
      }
      emailInput.removeAttribute('aria-invalid');

      // Anti-spam : champ piège rempli, ou envoi en moins de 2 s = robot.
      // On répond comme si tout allait bien, sans rien envoyer.
      var trap = form.querySelector('[name="bot-field"]');
      if ((trap && trap.value) || Date.now() - openedAt < 2000) {
        say('Merci, nous vous répondons sous 24 h.', false);
        form.reset();
        return;
      }

      var subj = form.querySelector('#mail-subject');
      if (subj) subj.value = ('Nouveau client · Question rapide · ' + email).replace(/[\r\n]+/g, ' ').slice(0, 180);
      submitBtn.disabled = true;
      say('Envoi en cours…', false);
      fetch(form.getAttribute('action') || '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        say('Merci — un e-mail de confirmation vous est envoyé à ' + email + ', et nous vous répondons sous 24\u00a0h.', false);
        form.reset();
        openedAt = Date.now();
      }).catch(function () {
        say("L'envoi n'a pas abouti. Écrivez-nous directement à NovaStudio.fra@gmail.com ou appelez le 06 84 83 01 08.", true);
      }).then(function () {
        submitBtn.disabled = false;
      });
    });

    emailInput.addEventListener('input', function () {
      if (emailInput.getAttribute('aria-invalid')) {
        emailInput.removeAttribute('aria-invalid');
        say('', false);
      }
    });
  }
})();
