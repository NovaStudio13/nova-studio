// Nova Studio — déclenchée automatiquement par Netlify à chaque envoi de formulaire (nom réservé « submission-created »).
// Pour un questionnaire « brief-… » ou pour le formulaire de contact rapide de l'accueil (« contact ») :
//   1. envoie à Nova Studio un e-mail « Nouveau client · Métier · Activité (Nom) » (ou « Nouveau client · Question rapide · e-mail ») avec toutes les réponses ;
//   2. envoie au client un accusé de réception personnalisé, avec le récapitulatif de ses réponses.
//
// Configuration (Netlify → Site configuration → Environment variables). Aucun secret n'est écrit dans le code :
//   SMTP_USER   adresse d'envoi, ex. NovaStudio.fra@gmail.com
//   SMTP_PASS   mot de passe d'application (Gmail : Compte Google → Sécurité → Validation en deux étapes → Mots de passe des applications)
//   MAIL_TO     (facultatif) adresse qui reçoit les nouveaux clients ; par défaut SMTP_USER
//   SMTP_HOST   (facultatif) par défaut smtp.gmail.com     SMTP_PORT (facultatif) par défaut 465
//   MAIL_DRY_RUN=1  pour tester sans rien envoyer (les e-mails s'affichent dans les journaux)
// Sans SMTP_USER / SMTP_PASS, la fonction ne fait rien : Netlify Forms continue d'enregistrer les envois
// (et sa notification standard reste utilisable).

'use strict';

var nodemailer = require('nodemailer');
var tpl = require('../lib/mail-templates.js');

exports.handler = async function (event) {
  var payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch (e) {
    return { statusCode: 400, body: 'payload illisible' };
  }

  var formName = String((payload && payload.form_name) || '');
  var quick = formName === 'contact';                       // formulaire rapide de l'accueil
  if (!quick && !/^brief-[a-z-]+$/.test(formName)) return { statusCode: 200, body: 'formulaire ignoré' };

  var env = process.env;
  var dry = env.MAIL_DRY_RUN === '1';
  if (!dry && (!env.SMTP_USER || !env.SMTP_PASS)) {
    console.log('SMTP_USER / SMTP_PASS absents : e-mails personnalisés désactivés.');
    return { statusCode: 200, body: 'non configuré' };
  }

  var data = payload.data || {};
  // Champ piège rempli = robot : rien n'est envoyé
  if (data['bot-field']) return { statusCode: 200, body: 'ignoré' };

  var transport = dry
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(env.SMTP_PORT || 465),
        secure: Number(env.SMTP_PORT || 465) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
      });

  var from = '"Nova Studio" <' + (env.SMTP_USER || 'contact@example.invalid') + '>';
  var owner = env.MAIL_TO || env.SMTP_USER || 'contact@example.invalid';
  var meta = {
    date: new Date(payload.created_at || Date.now()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' }),
    siteUrl: env.URL || ''
  };
  var email = String(data.email || '').trim();
  var results = [];

  // 1. Pour Nova Studio
  try {
    var o = quick ? tpl.quickOwnerMail(data, meta) : tpl.ownerMail(data, meta);
    var msg = { from: from, to: owner, subject: o.subject, text: o.text, html: o.html };
    if (tpl.isEmail(email)) msg.replyTo = email;   // « Répondre » écrit directement au client
    var sent = await transport.sendMail(msg);
    if (dry) console.log('[DRY RUN] propriétaire :', sent.message);
    results.push('propriétaire : ok');
  } catch (e) {
    console.error('Envoi propriétaire échoué :', e && e.message);
    results.push('propriétaire : échec');
  }

  // 2. Pour le client (adresse valide uniquement)
  if (tpl.isEmail(email)) {
    try {
      var c = quick ? tpl.quickClientMail(data, meta) : tpl.clientMail(data, meta);
      var sent2 = await transport.sendMail({ from: from, to: email, replyTo: owner, subject: c.subject, text: c.text, html: c.html });
      if (dry) console.log('[DRY RUN] client :', sent2.message);
      results.push('client : ok');
    } catch (e2) {
      console.error('Envoi client échoué :', e2 && e2.message);
      results.push('client : échec');
    }
  } else {
    results.push('client : adresse invalide, non envoyé');
  }

  return { statusCode: 200, body: results.join(' | ') };
};
