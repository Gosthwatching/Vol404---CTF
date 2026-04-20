const QRCode = require('qrcode');
const User = require('../models/User');
const Ticket = require('../models/Billet');

// GET /tickets/my — billet de l'utilisateur connecté
const getMyTicket = async (req, res) => {
    const ticket = await Ticket.findOne({ userId: req.session.user.id });

    if (!ticket) {
        return res.status(404).json({ error: 'Aucun billet trouvé.' });
    }

    const qrDataURL = await QRCode.toDataURL(`http://localhost:3000/gate/${ticket.qrToken}`);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
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

    const qrDataURL = await QRCode.toDataURL(`http://localhost:3000/gate/${ticket.qrToken}`);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        qr: qrDataURL
    });
};

module.exports = { getMyTicket, searchTicket };
