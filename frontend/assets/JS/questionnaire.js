// JS pour questionnaire CTF
const questionsPool = [
  {
    id: 1,
    question: "Quel était le code final à soumettre pour obtenir le flag ?",
    name: "q1"
  },
  {
    id: 2,
    question: "Combien de pièges y avait-il dans le puzzle ?",
    name: "q2"
  },
  {
    id: 3,
    question: "Quel a été le rôle du QR code dans le jeu ?",
    name: "q3"
  },
  {
    id: 4,
    question: "Quelle était la première étape du CTF ?",
    name: "q4"
  },
  {
    id: 5,
    question: "Comment pouvait-on débloquer la zone flag ?",
    name: "q5"
  },
  {
    id: 6,
    question: "Quel endpoint fallait-il appeler pour valider le flag ?",
    name: "q6"
  },
  {
    id: 7,
    question: "Sur quelle page trouvait-on le puzzle ?",
    name: "q7"
  },
  {
    id: 8,
    question: "Qu'est-ce qui se passe si on clique sur un piège ?",
    name: "q8"
  },
  {
    id: 9,
    question: "Quel est le nom du fichier JS qui gère le puzzle ?",
    name: "q9"
  },
  {
    id: 10,
    question: "Comment s'appelle la variable qui contient le flag final dans le code JS ?",
    name: "q10"
  }
];

function getRandomQuestions(pool, n) {
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

document.addEventListener("DOMContentLoaded", () => {
  const questionsList = document.getElementById("questions-list");
  const selected = getRandomQuestions(questionsPool, 3);

  // Pour chaque question choisie, on crée un champ
  selected.forEach(q => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const input = document.createElement("input");
    label.textContent = q.question;
    input.type = "text";
    input.name = q.name;
    input.required = true;
    li.appendChild(label);
    li.appendChild(document.createElement("br"));
    li.appendChild(input);
    questionsList.appendChild(li);
  });

  // Quand on envoie le formulaire
  const form = document.getElementById("questionnaire-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    fetch("/ctf/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data)
    }).then(res => {
      const msg = document.getElementById("questionnaire-message");
      if (res.ok) {
        msg.textContent = "Réponses envoyées !";
        form.reset();
      } else {
        msg.textContent = "Erreur lors de l'envoi.";
      }
    });
  });
});
