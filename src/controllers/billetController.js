const QRCode = require('qrcode');
const os = require('os');
const User = require('../models/User');
const Ticket = require('../models/Billet');
const { createScanSession, getScanSession } = require('../utils/scanSessions');

const isPrivateIpv4 = (ip) => {
    return ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
};

const firstForwardedValue = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    return value.split(',')[0].trim();
};

const normalizeBaseUrl = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().replace(/\/$/, '');
};

const getPortFromHost = (host) => {
    const match = String(host || '').match(/:(\d+)$/);
    return match ? match[1] : '3000';
};

const isNonPublicHost = (host) => {
    const h = String(host || '');
    // localhost / loopback
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(h)) return true;
    // Docker bridge IPs (172.16-31.x) — not reachable from outside the host
    if (/^172\.(1[6-9]|2\d|3[0-1])\./i.test(h)) return true;
    return false;
};

const getPreferredLanIp = () => {
    const interfaces = os.networkInterfaces();

    for (const nets of Object.values(interfaces)) {
        for (const net of nets || []) {
            if (net.family !== 'IPv4') continue;
            if (net.internal) continue;
            if (!net.address || !isPrivateIpv4(net.address)) continue;
            return net.address;
        }
    }

    return null;
};

const buildScanPath = (scanId, ticketToken) => {
    const token = encodeURIComponent(ticketToken);
    return `/gate/scan/${scanId}?token=${token}`;
};

const getRequestProtoAndHost = (req) => {
    const proto = firstForwardedValue(req.get('x-forwarded-proto')) || req.protocol;
    const host = firstForwardedValue(req.get('x-forwarded-host')) || req.get('host') || 'localhost:3000';
    return { proto, host };
};

const buildPublicScanUrl = (req, scanId, ticketToken) => {
    const { proto, host } = getRequestProtoAndHost(req);
    const scanPath = buildScanPath(scanId, ticketToken);

    // Si la requete est deja sur une URL publique (tunnel/domaine), on la prefere.
    if (!isNonPublicHost(host)) {
        return `${proto}://${host}${scanPath}`;
    }

    // Sinon, on tente PUBLIC_BASE_URL, puis l'IP LAN.
    const envBaseUrl = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
    if (envBaseUrl) {
        return `${envBaseUrl}${scanPath}`;
    }

    const lanIp = getPreferredLanIp();
    if (lanIp) {
        return `${proto}://${lanIp}:${getPortFromHost(host)}${scanPath}`;
    }

    return `${proto}://${host}${scanPath}`;
};

const buildScanUrls = (req, scanId, ticketToken) => {
    const { host } = getRequestProtoAndHost(req);
    const scanPath = buildScanPath(scanId, ticketToken);
    const port = getPortFromHost(host);

    const scanUrlLocal = `http://localhost:${port}${scanPath}`;
    const scanUrlPublic = buildPublicScanUrl(req, scanId, ticketToken);
    const useLocalUrl = isNonPublicHost(new URL(scanUrlPublic).host);

    return {
        scanUrlLocal,
        scanUrlPublic: useLocalUrl ? null : scanUrlPublic,
        scanUrl: useLocalUrl ? scanUrlLocal : scanUrlPublic
    };
};

const buildTicketResponse = async (ticket, scanUrls, scanId) => {
    const qrDataURL = await QRCode.toDataURL(scanUrls.scanUrl);

    return {
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        cabinClass: ticket.cabinClass || 'Economy',
        bookingRef: ticket.bookingRef || '',
        destination: ticket.destination || '',
        scanId,
        scanUrl: scanUrls.scanUrl,
        scanUrlLocal: scanUrls.scanUrlLocal,
        scanUrlPublic: scanUrls.scanUrlPublic,
        qr: qrDataURL
    };
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

    const scanUrls = buildScanUrls(req, scanId, ticket.qrToken);
    const response = await buildTicketResponse(ticket, scanUrls, scanId);
    return res.json(response);
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

    const scanUrls = buildScanUrls(req, scanId, ticket.qrToken);
    const response = await buildTicketResponse(ticket, scanUrls, scanId);
    return res.json(response);
};

// GET /billets/scan-status/:scanId — polling côté PC pour vérifier le scan QR
const getScanStatus = async (req, res) => {
    const { scanId } = req.params;
    const session = getScanSession(scanId);

    // On ne bloque pas sur un changement d'utilisateur en session
    // (ex: connexion etudiant puis login CTF), sinon le polling tombe en 404.
    if (!session) {
        return res.json({ scanned: false, stale: true });
    }

    if (!session.scanned) {
        return res.json({ scanned: false });
    }

    return res.json({
        scanned: true,
        redirect: `/gate/scan-result/${scanId}`
    });
};

// GET /billets/manifests — liste des manifests disponibles
const getManifests = async (req, res) => {
    const manifests = await Ticket.aggregate([
        {
            $group: {
                _id: '$flightCode',
                flightCode: { $first: '$flightCode' },
                gate: { $first: '$gate' },
                departureTime: { $first: '$departureTime' },
                aircraftType: { $first: '$aircraftType' },
                aircraftRegistration: { $first: '$aircraftRegistration' },
                destination: { $first: '$destination' },
                passengerCount: { $sum: 1 }
            }
        },
        { $sort: { flightCode: 1 } }
    ]);

    return res.json(manifests);
};

// GET /billets/passengers — liste de tous les passagers (accès libre, c'est voulu pour le CTF)
const getAllPassengers = async (req, res) => {
    const { flightCode } = req.query;
    const filters = {};

    if (typeof flightCode === 'string' && flightCode.trim()) {
        filters.flightCode = flightCode.trim();
    }

    const tickets = await Ticket.find(filters)
        .sort({ flightCode: 1, bookingRef: 1, passengerName: 1 })
        .populate('userId', 'username');

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

module.exports = { getMyTicket, searchTicket, getScanStatus, getManifests, getAllPassengers };