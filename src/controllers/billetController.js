const QRCode = require('qrcode');
const os = require('os');
const User = require('../models/User');
const Ticket = require('../models/Billet');
const { createScanSession, getScanSession } = require('../utils/scanSessions');

const getPreferredLanIp = () => {
    const interfaces = os.networkInterfaces();
    const all = Object.entries(interfaces).flatMap(([name, nets]) =>
        (nets || []).map((net) => ({ name, ...net }))
    );

    const isPrivateIpv4 = (ip) =>
        ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

    const usable = all.filter((net) =>
        net.family === 'IPv4' &&
        !net.internal &&
        typeof net.address === 'string' &&
        isPrivateIpv4(net.address)
    );

    const scoreInterface = (name = '') => {
        const n = name.toLowerCase();
        let score = 0;

        if (/wi-?fi|wlan/.test(n)) score += 50;
        if (/ethernet|eth/.test(n)) score += 30;

        // Exclure les interfaces virtuelles / VPN quand c'est possible.
        if (/vethernet|hyper-v|virtual|vmware|docker|wsl|nord|vpn|loopback|tunnel/.test(n)) score -= 80;

        return score;
    };

    const ranked = usable
        .map((net) => ({ ...net, score: scoreInterface(net.name) }))
        .sort((a, b) => b.score - a.score);

    return ranked[0]?.address || usable[0]?.address || null;
};

const buildPublicScanUrl = (req, scanId) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const requestProto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    const requestHost = forwardedHost ? forwardedHost.split(',')[0].trim() : req.get('host');
    const isDockerRuntime = process.env.DOCKER === 'true' || require('fs').existsSync('/.dockerenv');

    if (process.env.PUBLIC_BASE_URL) {
        return `${process.env.PUBLIC_BASE_URL}/gate/scan/${scanId}`;
    }

    let effectiveHost = requestHost;
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestHost || '')) {
        // En conteneur Docker, l'IP détectée depuis les interfaces est souvent celle du bridge
        // (ex: 172.x) et n'est pas joignable depuis le téléphone.
        if (isDockerRuntime) {
            return `${requestProto}://${requestHost}/gate/scan/${scanId}`;
        }

        const lanIp = getPreferredLanIp();
        if (lanIp) {
            const portMatch = requestHost.match(/:(\d+)$/);
            const port = portMatch ? `:${portMatch[1]}` : '';
            effectiveHost = `${lanIp}${port}`;
        }
    }

    const publicBaseUrl = `${requestProto}://${effectiveHost}`;
    return `${publicBaseUrl}/gate/scan/${scanId}`;
};

const buildScanUrls = (req, scanId) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const requestProto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const portMatch = host.match(/:(\d+)$/);
    const port = portMatch ? portMatch[1] : '3000';

    const scanUrlLocal = `http://localhost:${port}/gate/scan/${scanId}`;
    const publicCandidate = buildPublicScanUrl(req, scanId);
    const isLocalOnly = /:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(publicCandidate);

    return {
        scanUrlLocal,
        scanUrlPublic: isLocalOnly ? null : publicCandidate,
        scanUrl: isLocalOnly ? scanUrlLocal : publicCandidate
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

    const { scanUrl, scanUrlLocal, scanUrlPublic } = buildScanUrls(req, scanId);
    const qrDataURL = await QRCode.toDataURL(scanUrl);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        cabinClass: ticket.cabinClass || 'Economy',
        bookingRef: ticket.bookingRef || '',
        destination: ticket.destination || '',
        scanId,
        scanUrl,
        scanUrlLocal,
        scanUrlPublic,
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

    const { scanUrl, scanUrlLocal, scanUrlPublic } = buildScanUrls(req, scanId);
    const qrDataURL = await QRCode.toDataURL(scanUrl);

    return res.json({
        passengerName: ticket.passengerName,
        flightCode: ticket.flightCode,
        seat: ticket.seat,
        gate: ticket.gate,
        departureTime: ticket.departureTime,
        scanId,
        scanUrl,
        scanUrlLocal,
        scanUrlPublic,
        qr: qrDataURL
    });
};

// GET /billets/scan-status/:scanId — polling côté PC pour vérifier le scan QR
const getScanStatus = async (req, res) => {
    const { scanId } = req.params;
    const session = getScanSession(scanId);

    // On ne bloque pas sur un changement d'utilisateur en session
    // (ex: connexion etudiant puis login CTF), sinon le polling tombe en 404.
    if (!session) {
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