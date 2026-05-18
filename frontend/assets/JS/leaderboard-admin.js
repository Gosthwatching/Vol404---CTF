// Script JS pour la page leaderboard admin
let savedKey = '';

function fmt(isoDate) {
	if (!isoDate) return '-';
	const d = new Date(isoDate);
	return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function cell(val) {
	return val
		? '<td class="check">✓</td>'
		: '<td class="cross">✗</td>';
}

function renderHead(stepLabels) {
	const headRow = document.getElementById('table-head-row');
	const stepHeaders = stepLabels.map((label) => `<th>${label}</th>`).join('');
	headRow.innerHTML = `
		<th class="rank">#</th>
		<th>Élève</th>
		<th class="score">Score</th>
		${stepHeaders}
		<th>Heure questionnaire</th>
		<th>Réponses</th>
		<th>Action</th>
	`;
}

async function load(key) {
	const res = await fetch(`/admin/leaderboard?key=${encodeURIComponent(key)}`);
	if (res.status === 403 || res.status === 401) throw new Error('Clé incorrecte.');
	if (!res.ok) throw new Error('Erreur serveur.');
	return res.json();
}

async function deleteStudent(key, userId) {
	const res = await fetch(`/admin/student/${encodeURIComponent(userId)}?key=${encodeURIComponent(key)}`, {
		method: 'DELETE'
	});
	const data = await res.json();
	if (res.status === 403 || res.status === 401) throw new Error('Clé incorrecte.');
	if (!res.ok) throw new Error(data.error || 'Suppression impossible.');
	return data;
}

async function deleteAllStudents(key) {
	const res = await fetch(`/admin/students?key=${encodeURIComponent(key)}`, {
		method: 'DELETE'
	});
	const data = await res.json();
	if (res.status === 403 || res.status === 401) throw new Error('Clé incorrecte.');
	if (!res.ok) throw new Error(data.error || 'Suppression globale impossible.');
	return data;
}

async function getQuestionnaireResponses(key) {
	const res = await fetch(`/admin/questionnaire-responses?key=${encodeURIComponent(key)}`);
	if (!res.ok) return [];
	return res.json();
}

async function render(key) {
	const data = await load(key);
	const stepLabels = Array.isArray(data.steps) ? data.steps : [];
	renderHead(stepLabels);
	const scoreMax = stepLabels.length || 1;
	const validatedCount = data.leaderboard.filter((u) => u.steps && u.steps['Questionnaire validé']).length;
	document.getElementById('stats').textContent =
		`${data.total} élève(s) inscrit(s) - ${validatedCount} questionnaire(s) validé(s)`;

	const rows = data.leaderboard.map(u => `
		<tr>
			<td class="rank">${u.rank}</td>
			<td class="username">${u.username}</td>
			<td class="score">${u.score} / ${scoreMax}</td>
			${stepLabels.map((label) => cell(u.steps && u.steps[label])).join('')}
			<td class="flag-time">${fmt(u.questionnaireValidatedAt)}</td>
			<td><button type="button" class="btn-info view-responses" data-username="${u.username}" data-user-id="${u.userId}">Voir</button></td>
			<td><button type="button" class="btn-danger delete-student" data-user-id="${u.userId}">Supprimer</button></td>
		</tr>
	`).join('');
	const emptyColspan = 6 + stepLabels.length;
	document.getElementById('rows').innerHTML = rows || `<tr><td colspan="${emptyColspan}" style="color:#8b949e;text-align:center">Aucun élève inscrit</td></tr>`;
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('key-form').addEventListener('submit', async (e) => {
		e.preventDefault();
		const key = document.getElementById('prof-key').value;
		const err = document.getElementById('error');
		err.textContent = '';
		try {
			await render(key);
			savedKey = key;
			document.getElementById('key-form-wrapper').style.display = 'none';
			document.getElementById('board').style.display = 'block';
		} catch (ex) {
			err.textContent = ex.message;
		}
	});

	document.getElementById('refresh').addEventListener('click', () => render(savedKey));

	document.getElementById('rows').addEventListener('click', async (event) => {
		if (event.target.classList.contains('view-responses')) {
			const username = event.target.getAttribute('data-username');
			const userId = event.target.getAttribute('data-user-id');
			try {
				const allResponses = await getQuestionnaireResponses(savedKey);
				const userResponses = allResponses.filter((r) => {
					const byUserId = String(r.userId || '') === String(userId || '');
					const byUsername = String(r.username || '').toLowerCase() === String(username || '').toLowerCase();
					const byLegacyUserName = String(r.user_name || '').toLowerCase() === String(username || '').toLowerCase();
					return byUserId || byUsername || byLegacyUserName;
				});
				if (userResponses.length === 0) {
					alert(`Aucune réponse pour ${username}`);
					return;
				}
				const responseText = userResponses.map(r => {
					const entries = Object.entries(r).filter(([k]) => k.startsWith('q')).map(([k, v]) => `${k}: ${v}`).join('\n');
					return entries;
				}).join('\n---\n');
				alert(`Réponses de ${username}:\n\n${responseText}`);
			} catch (ex) {
				alert('Erreur lors du chargement des réponses.');
			}
			return;
		}

		if (event.target.classList.contains('delete-student')) {
			const userId = event.target.getAttribute('data-user-id');
		const row = event.target.closest('tr');
		const username = row ? row.querySelector('.username')?.textContent : 'cet élève';
		const err = document.getElementById('error');
		err.textContent = '';

		if (!window.confirm(`Supprimer le compte de ${username} ?`)) {
			return;
		}

		try {
			const result = await deleteStudent(savedKey, userId);
			await render(savedKey);
			err.style.color = '#3fb950';
			err.textContent = `Compte supprimé: ${result.deletedUser}.`;
		} catch (ex) {
			err.style.color = '#f85149';
			err.textContent = ex.message;
		}
	}
	});

	document.getElementById('delete-all-students').addEventListener('click', async () => {
		if (!savedKey) {
			return;
		}

		const err = document.getElementById('error');
		err.textContent = '';

		if (!window.confirm('Supprimer tous les comptes élèves ? Cette action est irréversible.')) {
			return;
		}

		try {
			const result = await deleteAllStudents(savedKey);
			await render(savedKey);
			err.style.color = '#3fb950';
			err.textContent = `Suppression globale terminée: ${result.usersDeleted} compte(s), ${result.ticketsDeleted} billet(s).`;
		} catch (ex) {
			err.style.color = '#f85149';
			err.textContent = ex.message;
		}
	});
});
