// Script page flag: verification phishing puis unlock via console.
const btnSubmitFlag = document.getElementById('btn-submit-flag');
const unlockMsg = document.getElementById('unlock-msg');
const flagSection = document.getElementById('flag-section');
const timerNode = document.getElementById('token-timer');
const flagCodeInput = document.getElementById('flag-code');
const flagResultNode = document.getElementById('flag-result');
const phishReportIdInput = document.getElementById('phish-report-id');
const btnPhishCheck = document.getElementById('btn-phish-check');
const phishMsg = document.getElementById('phish-msg');

let timerInterval = null;

const showUnlockMessage = (text, ok = false) => {
    unlockMsg.style.color = ok ? '#7bffbe' : '#ffd0d0';
    unlockMsg.textContent = text;
};

const showPhishMessage = (text, ok = false) => {
    phishMsg.style.color = ok ? '#7bffbe' : '#ffd0d0';
    phishMsg.textContent = text;
};

const setCountdown = (expiresAt) => {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const render = () => {
        const remain = Math.max(0, expiresAt - Date.now());
        const sec = Math.ceil(remain / 1000);
        timerNode.textContent = sec > 0 ? `Token actif: ${sec}s` : 'Token expire';
        if (sec <= 0 && timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    };

    render();
    timerInterval = setInterval(render, 1000);
};

const refreshStatus = async () => {
    const res = await fetch('/flag/status', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    flagSection.style.display = data.unlocked ? '' : 'none';
};

// Etape: le joueur recupere le resultat du review et le token.
btnPhishCheck.addEventListener('click', async () => {
    const reportId = String(phishReportIdInput.value || '').trim();
    if (!reportId) {
        showPhishMessage('Colle un Report ID avant verification.');
        return;
    }

    const res = await fetch(`/phish/result/${encodeURIComponent(reportId)}`, {
        credentials: 'include'
    });
    const data = await res.json();

    if (!res.ok) {
        showPhishMessage(data.error || 'Report introuvable.');
        return;
    }

    if (data.status === 'pending') {
        showPhishMessage('Review en cours. Reessaie dans quelques secondes.');
        return;
    }

    if (data.status === 'failed') {
        showPhishMessage(data.reason || 'Review refusee.');
        return;
    }

    if (!data.token) {
        showPhishMessage('Review terminee mais token absent.');
        return;
    }

    window._phishToken = data.token;
    if (data.expiresAt) {
        setCountdown(data.expiresAt);
    }
    showPhishMessage('Token recupere. Utilise window._phishToken dans la console pour /flag/unlock.', true);
    showUnlockMessage('Deblocage manuel requis en console avant la validation finale.');
});

btnSubmitFlag.addEventListener('click', async () => {
    const raw = flagCodeInput.value.trim();
    if (!raw) {
        flagResultNode.textContent = 'Entrez un code avant validation.';
        return;
    }

    const res = await fetch('/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: Number(raw) })
    });
    const data = await res.json();

    if (!res.ok) {
        flagResultNode.textContent = data.error || data.message || 'Validation echouee.';
        return;
    }

    flagResultNode.textContent = data.flag || JSON.stringify(data, null, 2);
});

refreshStatus();

