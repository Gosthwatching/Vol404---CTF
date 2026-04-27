const crypto = require('crypto');

const SCAN_TTL_MS = 15 * 60 * 1000;
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

module.exports = {
    createScanSession,
    getScanSession,
    markScanAsCompleted
};
