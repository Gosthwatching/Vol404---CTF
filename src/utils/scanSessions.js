const crypto = require('crypto');

const configuredTtl = Number.parseInt(process.env.SCAN_TTL_MS || '', 10);
const SCAN_TTL_MS = Number.isFinite(configuredTtl) && configuredTtl > 0
    ? configuredTtl
    : 6 * 60 * 60 * 1000;
const scanSessions = new Map();

const purgeExpired = () => {
    const now = Date.now();

    for (const [scanId, session] of scanSessions.entries()) {
        if (now - session.createdAt > SCAN_TTL_MS) {
            scanSessions.delete(scanId);
        }
    }
};

const createScanSession = ({ ticketToken, userId }) => {
    purgeExpired();

    const scanId = crypto.randomBytes(16).toString('hex');
    scanSessions.set(scanId, {
        scanId,
        ticketToken,
        userId,
        scanned: false,
        createdAt: Date.now(),
        scannedAt: null
    });

    return scanId;
};

const getScanSession = (scanId) => {
    purgeExpired();
    return scanSessions.get(scanId) || null;
};

const markScanAsCompleted = (scanId) => {
    const session = getScanSession(scanId);

    if (!session) {
        return null;
    }

    session.scanned = true;
    session.scannedAt = Date.now();
    return session;
};

const markScanByToken = (scanId, ticketToken) => {
    if (!scanId || !ticketToken) {
        return null;
    }

    purgeExpired();

    const now = Date.now();
    const existing = scanSessions.get(scanId);

    if (existing) {
        existing.ticketToken = ticketToken;
        existing.scanned = true;
        existing.scannedAt = now;
        return existing;
    }

    const restored = {
        scanId,
        ticketToken,
        userId: null,
        scanned: true,
        createdAt: now,
        scannedAt: now
    };

    scanSessions.set(scanId, restored);
    return restored;
};

module.exports = {
    createScanSession,
    getScanSession,
    markScanAsCompleted,
    markScanByToken
};
