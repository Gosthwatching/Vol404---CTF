const Ticket = require('../models/Billet');
const { vigenereEncode } = require('../utils/vigenere');
const { getScanSession, markScanAsCompleted } = require('../utils/scanSessions');

const buildGatePayload = (ticket) => {
    const secret = 'DEPARTEMENT94';
    const encoded = vigenereEncode(secret, 'ORY');

    return {
        gate: ticket.gate,
        flightCode: ticket.flightCode,
        message: encoded,
        hint: 'QTH Locator : JN03EL',
        indice: 'La cle survole la banlieue parisienne...'
    };
};

// GET /gate/:token
const getGate = async (req, res) => {
    const { token } = req.params;
    const ticket = await Ticket.findOne({ qrToken: token });

    if (!ticket) {
        return res.status(404).json({ error: 'Gate introuvable ou token invalide.' });
    }

    return res.json(buildGatePayload(ticket));
};

// GET /gate/scan/:scanId — appelé par le téléphone via QR
const scanGate = async (req, res) => {
    const { scanId } = req.params;
    const session = markScanAsCompleted(scanId);

    if (!session) {
        return res.status(404).json({ error: 'QR invalide ou expire.' });
    }

    const ticket = await Ticket.findOne({ qrToken: session.ticketToken });

    if (!ticket) {
        return res.status(404).json({ error: 'Gate introuvable ou token invalide.' });
    }

    return res.json(buildGatePayload(ticket));
};

// GET /gate/scan-result/:scanId — ouvert automatiquement sur PC après scan valide
const getGateFromScan = async (req, res) => {
    const { scanId } = req.params;
    const session = getScanSession(scanId);

    if (!session || !session.scanned) {
        return res.status(403).json({ error: 'Scan QR requis avant acces au gate.' });
    }

    const ticket = await Ticket.findOne({ qrToken: session.ticketToken });

    if (!ticket) {
        return res.status(404).json({ error: 'Gate introuvable ou token invalide.' });
    }

    return res.json(buildGatePayload(ticket));
};

module.exports = { getGate, scanGate, getGateFromScan };