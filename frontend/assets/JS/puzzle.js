const pieces = [
  { id: 1, isTrap: false },
  { id: 2, isTrap: false },
  { id: 3, isTrap: false },
  { id: 4, isTrap: false },
  { id: 5, isTrap: false },
  { id: 6, isTrap: false },
  { id: 7, isTrap: false },
  { id: 8, isTrap: false },
  { id: 9, isTrap: false },
  { id: 10, isTrap: false },
  { id: 11, isTrap: false },
  { id: 12, isTrap: false },
  { id: 13, isTrap: false },
  { id: 14, isTrap: false },
  { id: 15, isTrap: false },
  { id: 16, isTrap: true },
  { id: 17, isTrap: true },
  { id: 18, isTrap: true },
  { id: 19, isTrap: true },
  { id: 20, isTrap: true }
];

const state = {
  foundPieces: [],
  gameOver: false,
  completed: false
};

const pieceImageUrls = Array.from({ length: 20 }, (_, index) => {
  const number = index + 1;
  return number === 1 ? "assets/img/avion.png" : `assets/img/avion${number}.png`;
});

const container = document.getElementById("puzzle-container");
const counter = document.getElementById("puzzle-counter");
const message = document.getElementById("puzzle-message");
const restartButton = document.getElementById("puzzle-restart");

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function initGame() {
  state.foundPieces = [];
  state.gameOver = false;
  state.completed = false;
  shuffle(pieces);
  container.innerHTML = "";
  counter.textContent = "Pieces correctes : 0/15";
  message.textContent = "Trouve les 15 bonnes pieces sans cliquer sur un piege. Memorise les positions.";

  pieces.forEach((piece) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "puzzle-piece puzzle-piece-image w-100";
    button.setAttribute("aria-label", `Piece ${piece.id}`);
    button.style.backgroundImage = `url('${pieceImageUrls[piece.id - 1]}')`;
    button.style.backgroundSize = "cover";
    button.style.backgroundPosition = "center";

    button.addEventListener("click", () => {
      if (state.gameOver || state.completed) {
        return;
      }

      if (piece.isTrap) {
        state.gameOver = true;
        button.textContent = "Piege";
        button.classList.add("is-trap");
        message.textContent = "Perdu. Tu as clique sur un piege.";
        return;
      }

      if (state.foundPieces.includes(piece.id)) {
        return;
      }

      state.foundPieces.push(piece.id);
      button.disabled = true;
      button.classList.add("is-found");
      counter.textContent = `Pieces correctes : ${state.foundPieces.length}/15`;

      if (state.foundPieces.length === 15) {
        state.completed = true;
        message.textContent = "Bravo. Puzzle termine.";
      } else {
        message.textContent = "Bonne piece. Continue.";
      }
    });

    container.appendChild(button);
  });
}

restartButton.addEventListener("click", () => {
  initGame();
});

initGame();