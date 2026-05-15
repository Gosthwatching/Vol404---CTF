const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Stocke les réponses dans un fichier JSON (simple et sans base de données)
const RESPONSES_FILE = path.join(__dirname, '../../questionnaire-responses.json');

router.post('/', (req, res) => {
  const data = req.body;
  let all = [];
  try {
    if (fs.existsSync(RESPONSES_FILE)) {
      all = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf8'));
    }
  } catch (e) { all = []; }
  all.push({ ...data, date: new Date().toISOString() });
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(all, null, 2));
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
