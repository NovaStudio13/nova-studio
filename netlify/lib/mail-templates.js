// Nova Studio — contenu des e-mails envoyés quand un client termine un questionnaire « Votre projet ».
// Aucune dépendance : ce fichier ne fait que fabriquer l'objet, le texte et le HTML (l'envoi est dans
// netlify/functions/submission-created.js).

'use strict';

var BLUE = '#1b55c2';
var INK = '#161b26';
var GREY = '#5a6270';
var BEIGE = '#f0e9db';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Une seule ligne, sans retour chariot (objets d'e-mail : évite toute injection d'en-têtes)
function oneLine(s, max) {
  var t = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return max && t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function isEmail(s) {
  return typeof s === 'string' && s.length <= 120 && /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(s);
}

// Récapitulatif fabriqué par le navigateur : [{ title, items: [[question, réponse], …] }, …].
// Sans lui (envoi sans JavaScript), on retombe sur la liste brute des champs.
function parseRecap(data) {
  try {
    var r = JSON.parse(data.recapitulatif);
    if (Array.isArray(r)) {
      return r.filter(function (s) { return s && Array.isArray(s.items) && s.items.length; })
        .map(function (s) {
          return {
            title: oneLine(s.title, 80),
            items: s.items.map(function (it) { return [oneLine(it[0], 300), String(it[1] == null ? '' : it[1]).slice(0, 4000)]; })
          };
        });
    }
  } catch (e) { /* récapitulatif absent ou illisible */ }
  var skip = /^(form-name|form-started|bot-field|metier|subject|recapitulatif|consentement)$/;
  var items = Object.keys(data).filter(function (k) { return !skip.test(k) && data[k]; })
    .map(function (k) { return [k.replace(/_/g, ' '), String(data[k]).slice(0, 4000)]; });
  return items.length ? [{ title: 'Réponses', items: items }] : [];
}

function recapText(sections) {
  return sections.map(function (s) {
    return '== ' + s.title.toUpperCase() + ' ==\n' + s.items.map(function (it) {
      return it[0] + '\n  ' + it[1].replace(/\n/g, '\n  ');
    }).join('\n\n');
  }).join('\n\n');
}

function recapHtml(sections) {
  return sections.map(function (s) {
    var rows = s.items.map(function (it) {
      return '<tr><td style="padding:12px 0;border-top:1px solid #e6e0d2;">' +
        '<div style="font-size:12.5px;color:' + GREY + ';line-height:1.4;">' + esc(it[0]) + '</div>' +
        '<div style="font-size:15px;color:' + INK + ';line-height:1.55;white-space:pre-wrap;margin-top:3px;">' + esc(it[1]) + '</div>' +
        '</td></tr>';
    }).join('');
    return '<h3 style="margin:30px 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:' + BLUE + ';font-weight:600;">' + esc(s.title) + '</h3>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' + rows + '</table>';
  }).join('');
}

function shell(preheader, inner) {
  return '<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:' + BEIGE + ';">' +
    '<span style="display:none;max-height:0;overflow:hidden;opacity:0;">' + esc(preheader) + '</span>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + BEIGE + ';padding:28px 12px;"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">' +
    '<tr><td style="background:#0e1320;padding:22px 32px;color:#f1f2f6;font-size:19px;letter-spacing:-.01em;"><b>Nova</b>Studio<span style="color:#8f85d3;"><b>.</b></span></td></tr>' +
    '<tr><td style="padding:34px 32px 36px;color:' + INK + ';">' + inner + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function pick(data, key) { return oneLine(data[key], 200); }

// ---------------------------------------------------------------------------------------------------------
// Pour Nova Studio : « Nouveau client · Métier · Activité (Nom) »
// ---------------------------------------------------------------------------------------------------------
function ownerMail(data, meta) {
  var metier = pick(data, 'metier') || 'Projet';
  var activite = pick(data, 'nom_activite');
  var nom = pick(data, 'nom');
  var email = pick(data, 'email');
  var tel = pick(data, 'telephone');
  var sections = parseRecap(data);

  var subject = oneLine('Nouveau client · ' + metier + (activite ? ' · ' + activite : '') + (nom ? ' (' + nom + ')' : ''), 180);

  var facts = [
    ['Activité', [activite, pick(data, 'ville')].filter(Boolean).join(' — ')],
    ['Métier', metier],
    ['Formule envisagée', pick(data, 'formule')],
    ['Délai souhaité', pick(data, 'delai')],
    ['Recontact', pick(data, 'recontact')]
  ].filter(function (f) { return f[1]; });

  var text = [
    'NOUVEAU CLIENT — ' + metier,
    '',
    (nom || 'Un visiteur') + ' vient d’envoyer son projet de site' + (activite ? ' (« ' + activite + ' »)' : '') + '.',
    'À recontacter sous 24 h (c’est ce que promet le site).',
    '',
    'CONTACT',
    'Nom : ' + (nom || '—'),
    'E-mail : ' + (email || '—'),
    'Téléphone : ' + (tel || '—')
  ].concat(facts.length ? ['', 'EN BREF'].concat(facts.map(function (f) { return f[0] + ' : ' + f[1]; })) : [])
    .concat(['', 'TOUTES LES RÉPONSES', '', recapText(sections), '', '—', 'Répondre à cet e-mail écrit directement au client.'
      + (meta && meta.date ? '\nReçu le ' + meta.date + '.' : '')]).join('\n');

  var contactHtml = '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0;font-size:15px;line-height:1.7;">' +
    '<tr><td style="color:' + GREY + ';padding-right:16px;">Nom</td><td><b>' + esc(nom || '—') + '</b></td></tr>' +
    '<tr><td style="color:' + GREY + ';padding-right:16px;">E-mail</td><td>' + (email ? '<a href="mailto:' + esc(email) + '" style="color:' + BLUE + ';">' + esc(email) + '</a>' : '—') + '</td></tr>' +
    '<tr><td style="color:' + GREY + ';padding-right:16px;">Téléphone</td><td>' + (tel ? '<a href="tel:' + esc(tel.replace(/[^\d+]/g, '')) + '" style="color:' + BLUE + ';">' + esc(tel) + '</a>' : '—') + '</td></tr></table>';

  var factsHtml = facts.length ? '<div style="margin:24px 0 0;padding:18px 20px;background:' + BEIGE + ';border-radius:12px;font-size:14.5px;line-height:1.7;">' +
    facts.map(function (f) { return '<div><span style="color:' + GREY + ';">' + esc(f[0]) + ' :</span> <b>' + esc(f[1]) + '</b></div>'; }).join('') + '</div>' : '';

  var inner =
    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:' + BLUE + ';font-weight:600;">Nouveau client · ' + esc(metier) + '</p>' +
    '<h1 style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-.02em;">' + esc(nom || 'Un visiteur') + ' vient d’envoyer son projet.</h1>' +
    '<p style="margin:12px 0 0;font-size:15.5px;line-height:1.6;color:' + GREY + ';">' + (activite ? '« ' + esc(activite) + ' » — ' : '') + 'à recontacter sous 24&nbsp;h, comme promis sur le site.</p>' +
    contactHtml + factsHtml +
    '<h2 style="margin:38px 0 0;font-size:20px;letter-spacing:-.01em;">Toutes les réponses</h2>' +
    recapHtml(sections) +
    '<p style="margin:34px 0 0;padding-top:18px;border-top:1px solid #e6e0d2;font-size:13px;color:' + GREY + ';">Répondre à cet e-mail écrit directement au client.' + (meta && meta.date ? ' Reçu le ' + esc(meta.date) + '.' : '') + '</p>';

  return { subject: subject, text: text, html: shell('Nouveau projet : ' + (activite || metier), inner) };
}

// ---------------------------------------------------------------------------------------------------------
// Pour le client : accusé de réception personnalisé, avec le récapitulatif de ses réponses
// ---------------------------------------------------------------------------------------------------------
function clientMail(data, meta) {
  var nom = pick(data, 'nom');
  var activite = pick(data, 'nom_activite');
  var recontact = pick(data, 'recontact');
  var sections = parseRecap(data);
  var siteUrl = (meta && meta.siteUrl) ? String(meta.siteUrl).replace(/\/$/, '') : '';

  var subject = 'Nous avons bien reçu votre projet' + (activite ? ' — ' + oneLine(activite, 80) : '');
  var hello = nom ? 'Bonjour ' + nom + ',' : 'Bonjour,';
  var pref = recontact ? 'Vous nous avez indiqué préférer être recontacté(e) : ' + recontact.charAt(0).toLowerCase() + recontact.slice(1) + '.' : '';

  var lead = 'Merci d’avoir pris le temps de répondre : votre projet' + (activite ? ' « ' + activite + ' »' : '') + ' est bien arrivé.';
  var next = 'Nous lisons vos réponses avec attention et revenons vers vous sous 24 h avec une première proposition. Si un point mérite d’être précisé, nous vous écrirons ou vous appellerons.';

  var text = [
    hello, '', lead, '', next, pref, '',
    'VOTRE RÉCAPITULATIF', '', recapText(sections), '',
    'Une question, un oubli ? Répondez simplement à cet e-mail ou appelez-nous au 06 84 83 01 08.', '',
    'À très vite,', 'L’équipe Nova Studio', 'Aix-en-Provence · NovaStudio.fra@gmail.com', '',
    'Vous recevez ce message car votre adresse a été saisie dans un questionnaire sur le site Nova Studio. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne sera fait.' +
      (siteUrl ? ' Confidentialité : ' + siteUrl + '/politique-de-confidentialite.html' : '')
  ].filter(function (l, i, a) { return !(l === '' && a[i - 1] === ''); }).join('\n');

  var inner =
    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:' + BLUE + ';font-weight:600;">Projet bien reçu</p>' +
    '<h1 style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-.02em;">' + esc(hello) + '</h1>' +
    '<p style="margin:16px 0 0;font-size:16px;line-height:1.65;">' + esc(lead) + '</p>' +
    '<p style="margin:12px 0 0;font-size:16px;line-height:1.65;">' + esc(next) + '</p>' +
    (pref ? '<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:' + GREY + ';">' + esc(pref) + '</p>' : '') +
    '<h2 style="margin:38px 0 0;font-size:20px;letter-spacing:-.01em;">Votre récapitulatif</h2>' +
    recapHtml(sections) +
    '<p style="margin:34px 0 0;font-size:15px;line-height:1.6;">Une question, un oubli&nbsp;? Répondez simplement à cet e-mail ou appelez-nous au <a href="tel:+33684830108" style="color:' + BLUE + ';">06 84 83 01 08</a>.</p>' +
    '<p style="margin:22px 0 0;font-size:15px;line-height:1.6;">À très vite,<br><b>L’équipe Nova Studio</b><br><span style="color:' + GREY + ';">Aix-en-Provence · NovaStudio.fra@gmail.com</span></p>' +
    '<p style="margin:30px 0 0;padding-top:16px;border-top:1px solid #e6e0d2;font-size:12px;line-height:1.55;color:' + GREY + ';">Vous recevez ce message car votre adresse a été saisie dans un questionnaire sur le site Nova Studio. Si vous n’êtes pas à l’origine de cette demande, ignorez-le : rien ne sera fait.' +
    (siteUrl ? ' <a href="' + esc(siteUrl) + '/politique-de-confidentialite.html" style="color:' + GREY + ';">Politique de confidentialité</a>.' : '') + '</p>';

  return { subject: subject, text: text, html: shell('Nous revenons vers vous sous 24 h.', inner) };
}


// ---------------------------------------------------------------------------------------------------------
// Formulaire de contact rapide (accueil) : un e-mail et, facultatif, une question
// ---------------------------------------------------------------------------------------------------------
function quoteHtml(msg) {
  return '<div style="margin:18px 0 0;padding:16px 20px;background:' + BEIGE + ';border-radius:12px;font-size:15.5px;line-height:1.65;white-space:pre-wrap;">' + esc(msg) + '</div>';
}

function quickOwnerMail(data, meta) {
  var email = pick(data, 'email');
  var message = String(data.message || '').trim().slice(0, 1500);
  var subject = oneLine('Nouveau client · Question rapide · ' + (email || 'sans adresse'), 180);

  var text = [
    'NOUVELLE QUESTION RAPIDE',
    '',
    (email || 'Un visiteur') + ' vient d’écrire depuis le formulaire de contact du site.',
    'À recontacter sous 24 h (c’est ce que promet le site).',
    '',
    'E-mail : ' + (email || '—'),
    '',
    'SA QUESTION',
    message || '(aucune question précisée : il a seulement laissé son e-mail)',
    '',
    '—',
    'Répondre à cet e-mail écrit directement au visiteur.' + (meta && meta.date ? '\nReçu le ' + meta.date + '.' : '')
  ].join('\n');

  var inner =
    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:' + BLUE + ';font-weight:600;">Question rapide</p>' +
    '<h1 style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-.02em;">Un visiteur a une question.</h1>' +
    '<p style="margin:12px 0 0;font-size:15.5px;line-height:1.6;color:' + GREY + ';">À recontacter sous 24&nbsp;h, comme promis sur le site.</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0;font-size:15px;line-height:1.7;"><tr><td style="color:' + GREY + ';padding-right:16px;">E-mail</td><td>' +
    (email ? '<a href="mailto:' + esc(email) + '" style="color:' + BLUE + ';"><b>' + esc(email) + '</b></a>' : '—') + '</td></tr></table>' +
    '<h2 style="margin:32px 0 0;font-size:20px;letter-spacing:-.01em;">Sa question</h2>' +
    (message ? quoteHtml(message) : '<p style="margin:14px 0 0;font-size:15px;color:' + GREY + ';">Aucune question précisée : il a seulement laissé son e-mail.</p>') +
    '<p style="margin:34px 0 0;padding-top:18px;border-top:1px solid #e6e0d2;font-size:13px;color:' + GREY + ';">Répondre à cet e-mail écrit directement au visiteur.' + (meta && meta.date ? ' Reçu le ' + esc(meta.date) + '.' : '') + '</p>';

  return { subject: subject, text: text, html: shell('Question rapide : ' + (email || 'nouveau contact'), inner) };
}

function quickClientMail(data, meta) {
  var message = String(data.message || '').trim().slice(0, 1500);
  var siteUrl = (meta && meta.siteUrl) ? String(meta.siteUrl).replace(/\/$/, '') : '';
  var subject = 'Nous avons bien reçu votre message — Nova Studio';
  var lead = 'Merci de nous avoir écrit : votre message est bien arrivé. Nous vous répondons sous 24 h, par e-mail, en toute simplicité.';
  var more = 'Si vous avez déjà un projet en tête, vous pouvez le décrire en quelques minutes : les questions sont adaptées à votre métier, et nous préparons une proposition sur mesure.';
  var link = siteUrl ? siteUrl + '/#pour-qui' : '';

  var text = [
    'Bonjour,', '', lead, '',
    message ? 'VOTRE MESSAGE\n  ' + message.replace(/\n/g, '\n  ') + '\n' : '',
    more + (link ? '\n' + link : ''), '',
    'Une précision à ajouter ? Répondez simplement à cet e-mail ou appelez-nous au 06 84 83 01 08.', '',
    'À très vite,', 'L’équipe Nova Studio', 'Aix-en-Provence · NovaStudio.fra@gmail.com', '',
    'Vous recevez ce message car votre adresse a été saisie dans le formulaire de contact du site Nova Studio. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne sera fait.' +
      (siteUrl ? ' Confidentialité : ' + siteUrl + '/politique-de-confidentialite.html' : '')
  ].filter(function (l, i, a) { return !(l === '' && a[i - 1] === ''); }).join('\n');

  var inner =
    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:' + BLUE + ';font-weight:600;">Message bien reçu</p>' +
    '<h1 style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-.02em;">Bonjour,</h1>' +
    '<p style="margin:16px 0 0;font-size:16px;line-height:1.65;">' + esc(lead) + '</p>' +
    (message ? '<h2 style="margin:30px 0 0;font-size:18px;letter-spacing:-.01em;">Votre message</h2>' + quoteHtml(message) : '') +
    '<p style="margin:28px 0 0;font-size:15.5px;line-height:1.65;">' + esc(more) + '</p>' +
    (link ? '<p style="margin:16px 0 0;"><a href="' + esc(link) + '" style="display:inline-block;padding:13px 26px;background:' + BLUE + ';color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Décrire mon projet</a></p>' : '') +
    '<p style="margin:30px 0 0;font-size:15px;line-height:1.6;">Une précision à ajouter&nbsp;? Répondez simplement à cet e-mail ou appelez-nous au <a href="tel:+33684830108" style="color:' + BLUE + ';">06 84 83 01 08</a>.</p>' +
    '<p style="margin:22px 0 0;font-size:15px;line-height:1.6;">À très vite,<br><b>L’équipe Nova Studio</b><br><span style="color:' + GREY + ';">Aix-en-Provence · NovaStudio.fra@gmail.com</span></p>' +
    '<p style="margin:30px 0 0;padding-top:16px;border-top:1px solid #e6e0d2;font-size:12px;line-height:1.55;color:' + GREY + ';">Vous recevez ce message car votre adresse a été saisie dans le formulaire de contact du site Nova Studio. Si vous n’êtes pas à l’origine de cette demande, ignorez-le : rien ne sera fait.' +
    (siteUrl ? ' <a href="' + esc(siteUrl) + '/politique-de-confidentialite.html" style="color:' + GREY + ';">Politique de confidentialité</a>.' : '') + '</p>';

  return { subject: subject, text: text, html: shell('Nous vous répondons sous 24 h.', inner) };
}

module.exports = { quickOwnerMail: quickOwnerMail, quickClientMail: quickClientMail, ownerMail: ownerMail, clientMail: clientMail, parseRecap: parseRecap, isEmail: isEmail, oneLine: oneLine };
