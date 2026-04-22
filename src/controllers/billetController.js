const QRCode = require('qrcode');
const User = require('../models/User');
const Ticket = require('../models/Billet');

const buildPublicGateUrl = (req, token) => {
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return `${publicBaseUrl}/gate/${token}`;
};

// GET /tickets/my — billet de l'utilisateur connecté
const getMyTicket = async (req, res) => {
    const ticket = await Ticket.findOne({ userId: req.session.user.id });

    if (!ticket) {
        return res.status(404).json({ error: 'Aucun billet trouvé.' });
    }

    const gateUrl = buildPublicGateUrl(req, ticket.qrToken);
    const qrDataURL = await QRCode.toDataURL(gateUrl);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        gateUrl,
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

    const gateUrl = buildPublicGateUrl(req, ticket.qrToken);
    const qrDataURL = await QRCode.toDataURL(gateUrl);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        gateUrl,
        qr: qrDataURL
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
        username: t.userId ? t.userId.username : '—'
    }));

    return res.json(list);
};

module.exports = { getMyTicket, searchTicket, getAllPassengers };