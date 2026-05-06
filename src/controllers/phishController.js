// Controleur phishing V1: soumission lien et recuperation resultat du review.
const {
    submitReport,
    getReportForUser
} = require('../utils/phishQueue');

// POST /phish/report
const createReport = (req, res) => {
    const url = String(req.body.url || '').trim();

    if (!url) {
        return res.status(400).json({ error: 'url requise.' });
    }

    const report = submitReport({
        userId: req.session.user.id,
        url
    });

    return res.json({
        ok: true,
        reportId: report.id,
        status: report.status,
        message: 'Report enregistre. Review dans ~30s.'
    });
};

// GET /phish/result/:reportId
const getReportResult = (req, res) => {
    const report = getReportForUser({
        userId: req.session.user.id,
        reportId: req.params.reportId
    });

    if (!report) {
        return res.status(404).json({ error: 'Report introuvable.' });
    }

    return res.json({
        reportId: report.id,
        status: report.status,
        reason: report.reason,
        reviewedAt: report.reviewedAt,
        token: report.token,
        expiresAt: report.expiresAt
    });
};

module.exports = {
    createReport,
    getReportResult
};
