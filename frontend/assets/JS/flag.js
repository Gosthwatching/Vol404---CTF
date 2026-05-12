// Script page flag: soumission du code final.
const btnSubmitFlag = document.getElementById('btn-submit-flag');
const flagCodeInput = document.getElementById('flag-code');
const flagResultNode = document.getElementById('flag-result');

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

    if (data.redirect) {
        flagResultNode.textContent = data.message || 'Code valide. Redirection...';
        window.location.href = data.redirect;
        return;
    }

    flagResultNode.textContent = data.flag || data.message || JSON.stringify(data, null, 2);
});

