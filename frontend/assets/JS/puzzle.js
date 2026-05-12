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

const container = document.getElementById("puzzle-container");
const counter = document.getElementById("puzzle-counter");
const message = document.getElementById("puzzle-message");

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
  message.textContent = "Trouve les 15 bonnes pieces sans cliquer sur un piege.";

  pieces.forEach((piece) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "puzzle-piece";
    button.textContent = `Piece ${piece.id}`;

    button.addEventListener("click", () => {
      if (state.gameOver || state.completed) {
        return;
      }

      if (piece.isTrap) {
        state.gameOver = true;
        button.textContent = "Piege";
        message.textContent = "Perdu. Tu as clique sur un piege.";
        return;
      }

      if (state.foundPieces.includes(piece.id)) {
        return;
      }

      state.foundPieces.push(piece.id);
      button.disabled = true;
      button.textContent = `Piece ${piece.id} trouvee`;
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

initGame();