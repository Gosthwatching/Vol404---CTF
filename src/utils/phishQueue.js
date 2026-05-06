// Utilitaire phishing V1 (simple):
// - le joueur soumet un lien
// - un worker le verifie toutes les 30s
// - si ok, un token temporaire est cree
const crypto = require('crypto');

// Delai entre deux passages du worker.
const REPORT_REVIEW_INTERVAL_MS = 30 * 1000;
// Duree de vie d un token phishing.
const PHISH_TOKEN_TTL_MS = 5 * 60 * 1000;

// Tableau des reports soumis.
const reports = [];
// Map userId -> { token, expiresAt }
const issuedTokensByUser = new Map();

let workerStarted = false;

const now = () => Date.now();

// Nettoie les tokens qui ont depasse leur date d expiration.
const purgeExpiredTokens = () => {
    const current = now();

    for (const [userId, tokenState] of issuedTokensByUser.entries()) {
        if (current > tokenState.expiresAt) {
            issuedTokensByUser.delete(userId);
        }
    }
};

// Regle V1 tres simple:
// entree: url string
// sortie: true si url commence par /phish/page/
const isAllowedPhishUrl = (url) => {
    if (typeof url !== 'string') {
        return false;
    }
    return url.trim().startsWith('/phish/page/');
};

// Entree: userId + url
// Traitement: creer un objet report avec status pending
// Sortie: report cree
const submitReport = ({ userId, url }) => {
    const report = {
        id: crypto.randomBytes(12).toString('hex'),
        userId: String(userId),
        url: String(url || '').trim(),
        status: 'pending',
        createdAt: now(),
        reviewedAt: null,
        reason: null,
        token: null,
        expiresAt: null
    };

    reports.push(report);
    return report;
};

// Entree: userId + reportId
// Sortie: le report qui appartient au user, sinon null
const getReportForUser = ({ userId, reportId }) => {
    return reports.find((r) => r.id === reportId && r.userId === String(userId)) || null;
};

// Entree: userId + token
// Traitement: verifier le token actif pour ce user
// Sortie: { ok: true } si valide, sinon { ok: false, error }
const consumePhishToken = ({ userId, token }) => {
    purgeExpiredTokens();

    const state = issuedTokensByUser.get(String(userId));
    if (!state) {
        return { ok: false, error: 'Aucun token phishing actif.' };
    }

    if (String(token || '').trim() !== state.token) {
        return { ok: false, error: 'Token phishing invalide.' };
    }

    // Usage unique: on supprime le token apres validation.
    issuedTokensByUser.delete(String(userId));
    return { ok: true };
};

// Demarre le worker une seule fois.
// Le worker traite 1 report pending par cycle de 30s.
const startPhishReviewWorker = () => {
    if (workerStarted) {
        return;
    }
    workerStarted = true;

    setInterval(() => {
        purgeExpiredTokens();

        const pending = reports.find((r) => r.status === 'pending');
        if (!pending) {
            return;
        }

        pending.reviewedAt = now();

        // Si URL non conforme, report refuse.
        if (!isAllowedPhishUrl(pending.url)) {
            pending.status = 'failed';
            pending.reason = 'URL refusee: utilisez /phish/page/<id> pour la demo.';
            return;
        }

        // Sinon report accepte: generation token temporaire.
        const token = crypto.randomBytes(12).toString('hex');
        const expiresAt = now() + PHISH_TOKEN_TTL_MS;

        issuedTokensByUser.set(pending.userId, { token, expiresAt });

        pending.status = 'success';
        pending.reason = 'Review OK. Token genere.';
        pending.token = token;
        pending.expiresAt = expiresAt;
    }, REPORT_REVIEW_INTERVAL_MS);
};

module.exports = {
    submitReport,
    getReportForUser,
    consumePhishToken,
    startPhishReviewWorker
};
