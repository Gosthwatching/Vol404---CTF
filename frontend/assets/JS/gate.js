const summaryNode = document.getElementById('gate-summary');
const payloadNode = document.getElementById('gate-payload');
const opsNoteNode = document.getElementById('gate-ops-note');
const nextStepNode = document.getElementById('gate-next-step');
const validationLinkNode = document.getElementById('gate-validation-link');

const params = new URLSearchParams(window.location.search);
const scanId = String(params.get('scanId') || '').trim();
const directToken = String(params.get('token') || '').trim();
let isValidationUnlocked = false;

const setValidationLinkState = (unlocked) => {
    isValidationUnlocked = Boolean(unlocked);

    if (!validationLinkNode) {
        return;
    }

    validationLinkNode.classList.toggle('gate-link-disabled', !isValidationUnlocked);
    validationLinkNode.setAttribute('aria-disabled', String(!isValidationUnlocked));
    validationLinkNode.tabIndex = isValidationUnlocked ? 0 : -1;
};

const refreshFlagStatus = () => {
    fetch('/flag/status', { credentials: 'include' })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Statut de validation indisponible.');
            }
            setValidationLinkState(Boolean(data.unlocked));
        })
        .catch(() => setValidationLinkState(false));
};

const setErrorState = (message) => {
    summaryNode.textContent = message;
    payloadNode.textContent = 'Aucune donnee gate disponible.';
    opsNoteNode.textContent = 'La supervision ne peut pas confirmer le passage gate.';
    nextStepNode.textContent = 'Rechargez le billet puis rescanner le QR.';
    setValidationLinkState(false);
};

const renderGate = (data) => {
    summaryNode.textContent = `Gate ${data.gate} confirme pour le vol ${data.flightCode}.`;
    payloadNode.textContent = JSON.stringify(data, null, 2);
    opsNoteNode.textContent = data.opsNote || 'Zone finale verrouillee.';
    nextStepNode.textContent = data.nextStep || 'Poursuivez vers le portail de validation.';
    refreshFlagStatus();
};

if (validationLinkNode) {
    validationLinkNode.addEventListener('click', (event) => {
        if (!isValidationUnlocked) {
            event.preventDefault();
            nextStepNode.textContent = 'Portail verrouille. Lancez POST /flag/unlock puis reessayez.';
        }
    });
}

setValidationLinkState(false);
refreshFlagStatus();
window.setInterval(refreshFlagStatus, 2500);

// Fallback: utiliser le token directement si le scan-result echoue (session expiree ou scan non enregistre).
const fetchByToken = () => {
    if (!directToken) {
        setErrorState('Scan non confirme et aucun token disponible. Rechargez le billet.');
        return;
    }
    fetch(`/gate/${encodeURIComponent(directToken)}`, { credentials: 'include' })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Token gate invalide.');
            return data;
        })
        .then(renderGate)
        .catch((err) => setErrorState(err.message || 'Impossible de charger le gate.'));
};

if (!scanId && !directToken) {
    setErrorState('Scan ID manquant. Ouvrez cette page depuis le billet QR.');
} else if (scanId) {
    fetch(`/gate/scan-result/${encodeURIComponent(scanId)}`, { credentials: 'include' })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
                // Le scan n'est pas encore marque: on tente le fallback par token.
                fetchByToken();
                return null;
            }
            return data;
        })
        .then((data) => { if (data) renderGate(data); })
        .catch(() => fetchByToken());
} else {
    fetchByToken();
}