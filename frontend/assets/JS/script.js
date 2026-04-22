// Monologue d’intro pour le CTF
const fakeBootData = {
  lines: [
    ">> Initialisation du système d’embarquement.................100%",
    ">> Système d’embarquement initialisé............100%",
    ">> Analyse des passagers en cours.......................................100%",
    ">> Un billet mystérieux vous attend.",
    ">> Saurez-vous le trouver ?",
    ">> Attention : chaque détail compte.",
    ">> Les indices sont parfois cachés là où on ne les attend pas...",
    ">> Prêt à relever le défi ?",
    ">> Cliquez pour commencer l’aventure !"
  ]
};

const codeContainer = document.getElementById("code-lines");
const loader = document.getElementById("loader");

let lineIndex = 0;
let isNavigatingToLogin = false;

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
    // Curseur clignotant à la fin
    const lastLine = codeContainer.lastElementChild;
    const cursor = document.createElement("span");
    cursor.className = "blinking-cursor";
    lastLine.appendChild(cursor);

    // Clic activé seulement maintenant que tout le texte est affiché
    loader.style.cursor = "pointer";
    loader.addEventListener("click", goToLoginWithTransition);
  }
}

window.addEventListener("load", () => {
  displayNextLine();
});