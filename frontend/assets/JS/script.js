// Script de la page accueil: anime l intro et redirige vers la connexion.
// Monologue d intro pour le CTF
const fakeBootData = {
  lines: [
    ">> Initialisation du systeme d'embarquement.................100%",
    ">> Systeme d'embarquement initialise............100%",
    ">> Analyse des passagers en cours.......................................100%",
    ">> Un billet mysterieux vous attend.",
    ">> Saurez-vous le trouver ?",
    ">> Attention : chaque detail compte.",
    ">> Les indices sont parfois caches la ou on ne les attend pas...",
    ">> Pret a relever le defi ?",
    ">> Cliquez pour commencer l'aventure !"
  ]
};

const codeContainer = document.getElementById("code-lines");
const loader = document.getElementById("loader");

let lineIndex = 0;
let isNavigatingToLogin = false;
let hasBootStarted = false;

function goToLoginWithTransition() {
  if (isNavigatingToLogin) {
    return;
  }

  isNavigatingToLogin = true;
  loader.classList.add("fade-out");

  setTimeout(() => {
    window.location.href = "/login.html";
  }, 420);
}

function typeLine(lineText, callback) {
  const lineElement = document.createElement("p");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.textContent = "|";
  lineElement.appendChild(cursor);
  codeContainer.appendChild(lineElement);

  let charIndex = 0;

  function typeChar() {
    if (charIndex < lineText.length) {
      cursor.before(lineText[charIndex]);
      charIndex++;
      setTimeout(typeChar, 45);
    } else {
      cursor.remove();
      callback();
    }
  }
  typeChar();
}

function displayNextLine() {
  if (lineIndex < fakeBootData.lines.length) {
    typeLine(fakeBootData.lines[lineIndex], () => {
      lineIndex++;
      setTimeout(displayNextLine, 350);
    });
  } else {
    // Curseur clignotant a la fin
    const lastLine = codeContainer.lastElementChild;
    const cursor = document.createElement("span");
    cursor.className = "blinking-cursor";
    lastLine.appendChild(cursor);

    // Clic active seulement maintenant que tout le texte est affiche
    loader.style.cursor = "pointer";
    loader.addEventListener("click", goToLoginWithTransition);
  }
}

window.addEventListener("load", () => {
  if (hasBootStarted) {
    return;
  }
  hasBootStarted = true;
  codeContainer.innerHTML = "";
  lineIndex = 0;
  displayNextLine();
});