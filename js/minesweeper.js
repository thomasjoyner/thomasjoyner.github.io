/* =========================================================
   Minesweeper — classic Beginner board (9x9, 10 mines)
   Plain JS, no dependencies. Self-contained; safe to load
   even if the Minesweeper window markup is absent.
   ========================================================= */
(function minesweeper() {
  "use strict";

  const COLS = 9, ROWS = 9, MINES = 10;
  const gridEl = document.getElementById("ms-grid");
  const faceEl = document.getElementById("ms-face");
  const mineCountEl = document.getElementById("ms-mine-count");
  const timerEl = document.getElementById("ms-timer");
  if (!gridEl) return;

  let cells = [];          // {mine, revealed, flagged, adj, el}
  let started = false;     // first click places mines
  let over = false;
  let flagsPlaced = 0;
  let revealedCount = 0;
  let timer = 0;
  let timerInterval = null;

  function pad3(n) {
    n = Math.max(-99, Math.min(999, n));
    const neg = n < 0;
    const s = String(Math.abs(n)).padStart(neg ? 2 : 3, "0");
    return neg ? "-" + s : s;
  }

  function updateMineCounter() {
    mineCountEl.textContent = pad3(MINES - flagsPlaced);
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(function () {
      timer++;
      timerEl.textContent = pad3(timer);
    }, 1000);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function idx(r, c) { return r * COLS + c; }

  function forEachNeighbor(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) fn(nr, nc);
      }
    }
  }

  // Place mines after first click so the first cell is always safe
  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      const cell = cells[idx(r, c)];
      if (cell.mine) continue;
      if (r === safeR && c === safeC) continue; // keep first click clear
      cell.mine = true;
      placed++;
    }
    // compute adjacency counts
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (cells[idx(r, c)].mine) continue;
        let n = 0;
        forEachNeighbor(r, c, function (nr, nc) {
          if (cells[idx(nr, nc)].mine) n++;
        });
        cells[idx(r, c)].adj = n;
      }
    }
  }

  function reveal(r, c) {
    const cell = cells[idx(r, c)];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    revealedCount++;
    cell.el.classList.add("revealed");

    if (cell.mine) {
      cell.el.classList.add("mine");
      cell.el.textContent = "💣";
      return loseGame(cell);
    }
    if (cell.adj > 0) {
      cell.el.textContent = cell.adj;
      cell.el.classList.add("n" + cell.adj);
    } else {
      // flood-fill empty region
      forEachNeighbor(r, c, function (nr, nc) { reveal(nr, nc); });
    }
  }

  function loseGame(clicked) {
    over = true;
    stopTimer();
    faceEl.textContent = "😵";
    // reveal all mines
    cells.forEach(function (cell) {
      if (cell.mine && !cell.revealed) {
        cell.el.classList.add("revealed");
        cell.el.textContent = "💣";
      }
      if (!cell.mine && cell.flagged) {
        cell.el.textContent = "❌"; // wrongly flagged
      }
    });
    if (clicked) clicked.el.classList.add("mine");
  }

  function checkWin() {
    if (revealedCount === ROWS * COLS - MINES) {
      over = true;
      stopTimer();
      faceEl.textContent = "😎";
      // auto-flag remaining mines
      cells.forEach(function (cell) {
        if (cell.mine && !cell.flagged) {
          cell.flagged = true;
          cell.el.textContent = "🚩";
        }
      });
      flagsPlaced = MINES;
      updateMineCounter();
    }
  }

  function onLeftClick(r, c) {
    if (over) return;
    const cell = cells[idx(r, c)];
    if (cell.flagged) return;
    if (!started) {
      placeMines(r, c);
      started = true;
      startTimer();
    }
    reveal(r, c);
    if (!over) checkWin();
  }

  function onRightClick(r, c) {
    if (over || !started) return;
    const cell = cells[idx(r, c)];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    cell.el.textContent = cell.flagged ? "🚩" : "";
    flagsPlaced += cell.flagged ? 1 : -1;
    updateMineCounter();
  }

  function newGame() {
    stopTimer();
    cells = [];
    started = false;
    over = false;
    flagsPlaced = 0;
    revealedCount = 0;
    timer = 0;
    timerEl.textContent = "000";
    faceEl.textContent = "🙂";
    gridEl.style.setProperty("--ms-cols", COLS);
    gridEl.innerHTML = "";
    updateMineCounter();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const el = document.createElement("button");
        el.className = "ms-cell";
        el.type = "button";
        (function (rr, cc) {
          el.addEventListener("click", function () { onLeftClick(rr, cc); });
          el.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            onRightClick(rr, cc);
          });
        })(r, c);
        gridEl.appendChild(el);
        cells.push({ mine: false, revealed: false, flagged: false, adj: 0, el: el });
      }
    }
  }

  faceEl.addEventListener("click", newGame);
  newGame();
})();
