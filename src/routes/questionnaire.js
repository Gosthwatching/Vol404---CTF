const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Stocke les réponses dans un fichier JSON (simple et sans base de données)
const RESPONSES_FILE = path.join(__dirname, '../../questionnaire-responses.json');

const REQUIRED_FINAL_FLAG = 'CTF{ORY_boarding_complete}';

const User = require('../models/User');

const resolveProgressUserId = (req) => req.session?.trackedPlayerId || req.session?.user?.id || null;

const resolveUsername = (req) => req.session?.user?.username || null;

router.post('/', async (req, res) => {
  const userId = resolveProgressUserId(req);
  const username = resolveUsername(req);

  if (!userId || !username) {
    return res.status(401).json({ error: 'Connexion requise pour valider le questionnaire.' });
  }

  const data = req.body || {};
  const submittedFlag = String(data.flag || '').trim();

  if (!submittedFlag) {
    return res.status(400).json({ error: 'Le flag final est obligatoire pour valider le questionnaire.' });
  }

  if (submittedFlag !== REQUIRED_FINAL_FLAG) {
    return res.status(400).json({ error: 'Flag invalide. Questionnaire non valide.' });
  }

  const sanitizedData = { ...data };
  delete sanitizedData.flag;

  let all = [];
  try {
    if (fs.existsSync(RESPONSES_FILE)) {
      all = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf8'));
    }
  } catch (e) { all = []; }
  all.push({
    ...sanitizedData,
    userId: String(userId),
    username,
    user_name: username,
    flagValidated: true,
    date: new Date().toISOString()
  });
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(all, null, 2));

  // Marquer la progression dans le profil utilisateur connecté
  try {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'progress.questionnaireValidated': true,
          'progress.questionnaireValidatedAt': new Date()
        }
      }
    );
  } catch (e) { /* ignore erreur progression */ }

  res.json({ success: true });
});

 router.get('/responses', (req, res) => {
   try {
     if (!fs.existsSync(RESPONSES_FILE)) {
       return res.json([]);
     }
     const all = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf8'));
     return res.json(all);
   } catch (e) {
     return res.json([]);
   }
 });

module.exports = router;
