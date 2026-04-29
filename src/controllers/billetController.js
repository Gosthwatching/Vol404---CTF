const QRCode = require('qrcode');
const User = require('../models/User');
const Ticket = require('../models/Billet');
const { createScanSession, getScanSession } = require('../utils/scanSessions');

const buildPublicScanUrl = (req, scanId) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const requestProto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    const requestHost = forwardedHost ? forwardedHost.split(',')[0].trim() : req.get('host');
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || `${requestProto}://${requestHost}`;
    return `${publicBaseUrl}/gate/scan/${scanId}`;
};

// GET /tickets/my — billet de l'utilisateur connecté
const getMyTicket = async (req, res) => {
    const ticket = await Ticket.findOne({ userId: req.session.user.id });

    if (!ticket) {
        return res.status(404).json({ error: 'Aucun billet trouvé.' });
    }

    const scanId = createScanSession({
        ticketToken: ticket.qrToken,
        userId: String(req.session.user.id)
    });

    const scanUrl = buildPublicScanUrl(req, scanId);
    const qrDataURL = await QRCode.toDataURL(scanUrl);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        scanId,
        qr: qrDataURL
    });
};

// POST /tickets/search — ⚠️ FAILLE INTENTIONNELLE NoSQL Injection

const searchTicket = async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username requis.' });
    }

    const user = await User.findOne({ username: username });

    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const ticket = await Ticket.findOne({ userId: user._id });

    if (!ticket) {
        return res.status(404).json({ error: 'Aucun billet pour cet utilisateur.' });
    }

    const scanId = createScanSession({
        ticketToken: ticket.qrToken,
        userId: String(req.session.user.id)
    });

    const scanUrl = buildPublicScanUrl(req, scanId);
    const qrDataURL = await QRCode.toDataURL(scanUrl);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        scanId,
        qr: qrDataURL
    });
};

// GET /billets/scan-status/:scanId — polling côté PC pour vérifier le scan QR
const getScanStatus = async (req, res) => {
    const { scanId } = req.params;
    const session = getScanSession(scanId);

    if (!session || session.userId !== String(req.session.user.id)) {
        return res.status(404).json({ error: 'Session de scan introuvable.' });
    }

    if (!session.scanned) {
        return res.json({ scanned: false });
    }

    return res.json({
        scanned: true,
        redirect: `/gate/scan-result/${scanId}`
    });
};

// GET /billets/passengers — liste de tous les passagers (accès libre, c'est voulu pour le CTF)
const getAllPassengers = async (req, res) => {
    const tickets = await Ticket.find({}).populate('userId', 'username');

    const list = tickets.map(t => ({
        passengerName: t.passengerName,
        flightCode: t.flightCode,
        seat: t.seat,
        gate: t.gate,
        departureTime: t.departureTime,
        aircraftType: t.aircraftType,
        aircraftRegistration: t.aircraftRegistration,
        username: t.userId ? t.userId.username : '—',
        cabinClass: t.cabinClass,
        bookingRef: t.bookingRef,
        baggage: t.baggage,
        specialTags: t.specialTags,
        manifestNotes: t.manifestNotes
    }));

    return res.json(list);
};

module.exports = { getMyTicket, searchTicket, getScanStatus, getAllPassengers };