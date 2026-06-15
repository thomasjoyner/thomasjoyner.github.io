/* =========================================================
   Tom's Desktop — Windows 95/98 portfolio
   Plain JS, no dependencies.
   ========================================================= */
(function () {
  "use strict";

  let zCounter = 100;                 // running z-index for window stacking
  const openWindows = new Set();      // window ids currently open
  const taskButtons = document.getElementById("task-buttons");

  /* ---------- Window lookup ---------- */
  function getWindow(name) {
    return document.getElementById("win-" + name);
  }

  /* ---------- Focus / bring to front ---------- */
  function focusWindow(win) {
    document.querySelectorAll(".window.active").forEach(function (w) {
      w.classList.remove("active");
    });
    win.classList.add("active");
    win.style.zIndex = ++zCounter;
    updateTaskButtons();
  }

  /* ---------- Open ---------- */
  function openWindow(name) {
    const win = getWindow(name);
    if (!win) return;

    if (win.hidden) {
      win.hidden = false;
      openWindows.add(name);
      // Cascade new windows slightly so they don't stack exactly
      if (!win.dataset.placed) {
        const offset = (openWindows.size - 1) * 24;
        win.style.top = 70 + offset + "px";
        win.style.left = 170 + offset + "px";
        win.dataset.placed = "1";
      }
    } else {
      // already open (maybe minimized) -> restore
      win.dataset.minimized = "";
      win.hidden = false;
    }
    // Lazy-load any iframe (e.g. SkiFree) only when first opened, so the
    // third-party game isn't fetched on page load for visitors who never open it.
    const lazyFrame = win.querySelector("iframe[data-src]");
    if (lazyFrame && !lazyFrame.src) {
      lazyFrame.src = lazyFrame.dataset.src;
    }

    focusWindow(win);
    rebuildTaskButtons();
  }

  /* ---------- Close ---------- */
  function closeWindow(name) {
    const win = getWindow(name);
    if (!win) return;
    win.hidden = true;
    win.classList.remove("active", "maximized");
    win.dataset.placed = "";
    openWindows.delete(name);
    rebuildTaskButtons();
  }

  /* ---------- Minimize ---------- */
  function minimizeWindow(name) {
    const win = getWindow(name);
    if (!win) return;
    win.hidden = true;            // stays in openWindows -> still in taskbar
    win.dataset.minimized = "1";
    win.classList.remove("active");
    updateTaskButtons();
  }

  /* ---------- Maximize / restore ---------- */
  function toggleMaximize(name) {
    const win = getWindow(name);
    if (!win) return;
    win.classList.toggle("maximized");
    focusWindow(win);
  }

  /* ---------- Taskbar buttons ---------- */
  function rebuildTaskButtons() {
    taskButtons.innerHTML = "";
    openWindows.forEach(function (name) {
      const win = getWindow(name);
      const label = win.querySelector(".title-bar-text").textContent.trim();
      const btn = document.createElement("button");
      btn.className = "task-button";
      btn.dataset.window = name;
      btn.innerHTML = '<span class="task-label">' + label + "</span>";
      btn.addEventListener("click", function () {
        const w = getWindow(name);
        const isActive = w.classList.contains("active") && !w.hidden;
        if (isActive) {
          minimizeWindow(name);
        } else {
          w.hidden = false;
          w.dataset.minimized = "";
          focusWindow(w);
        }
      });
      taskButtons.appendChild(btn);
    });
    updateTaskButtons();
  }

  function updateTaskButtons() {
    document.querySelectorAll(".task-button").forEach(function (btn) {
      const win = getWindow(btn.dataset.window);
      btn.classList.toggle("active", win.classList.contains("active") && !win.hidden);
    });
  }

  /* ---------- Dragging ---------- */
  function makeDraggable(win) {
    const bar = win.querySelector(".title-bar");
    let dragging = false, startX, startY, originLeft, originTop;

    function pointerDown(e) {
      if (e.target.closest(".tb-btn")) return;        // don't drag from buttons
      if (win.classList.contains("maximized")) return; // no drag while maximized
      dragging = true;
      const evt = e.touches ? e.touches[0] : e;
      startX = evt.clientX;
      startY = evt.clientY;
      const rect = win.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      win.style.transform = "none"; // cancel mobile centering transform while dragging
      focusWindow(win);
      document.addEventListener("mousemove", pointerMove);
      document.addEventListener("mouseup", pointerUp);
      document.addEventListener("touchmove", pointerMove, { passive: false });
      document.addEventListener("touchend", pointerUp);
    }

    function pointerMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      const evt = e.touches ? e.touches[0] : e;
      let newLeft = originLeft + (evt.clientX - startX);
      let newTop = originTop + (evt.clientY - startY);
      // keep title bar reachable on screen
      const maxLeft = window.innerWidth - 40;
      const maxTop = window.innerHeight - 60;
      newLeft = Math.min(Math.max(newLeft, -win.offsetWidth + 80), maxLeft);
      newTop = Math.min(Math.max(newTop, 0), maxTop);
      win.style.left = newLeft + "px";
      win.style.top = newTop + "px";
    }

    function pointerUp() {
      dragging = false;
      document.removeEventListener("mousemove", pointerMove);
      document.removeEventListener("mouseup", pointerUp);
      document.removeEventListener("touchmove", pointerMove);
      document.removeEventListener("touchend", pointerUp);
    }

    bar.addEventListener("mousedown", pointerDown);
    bar.addEventListener("touchstart", pointerDown, { passive: false });
  }

  /* ---------- Wire up window controls + focus-on-click ---------- */
  document.querySelectorAll(".window").forEach(function (win) {
    const name = win.dataset.window;
    makeDraggable(win);

    win.addEventListener("mousedown", function () { focusWindow(win); });

    win.querySelectorAll(".tb-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "close") closeWindow(name);
        else if (action === "minimize") minimizeWindow(name);
        else if (action === "maximize") toggleMaximize(name);
      });
    });
  });

  /* ---------- Desktop icons (single + double click) ---------- */
  document.querySelectorAll(".desktop-icon").forEach(function (icon) {
    const name = icon.dataset.window;

    icon.addEventListener("click", function () {
      document.querySelectorAll(".desktop-icon.selected")
        .forEach(function (i) { i.classList.remove("selected"); });
      icon.classList.add("selected");
    });

    // open on double-click (classic) ...
    icon.addEventListener("dblclick", function () { openWindow(name); });
    // ... and on Enter/Space for keyboard users
    icon.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openWindow(name);
      }
    });
  });

  // Clear icon selection when clicking empty desktop
  document.getElementById("desktop").addEventListener("mousedown", function (e) {
    if (e.target.id === "desktop" || e.target.id === "icons") {
      document.querySelectorAll(".desktop-icon.selected")
        .forEach(function (i) { i.classList.remove("selected"); });
    }
  });

  /* ---------- Start menu ---------- */
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");

  function toggleStart(force) {
    const show = typeof force === "boolean" ? force : startMenu.hidden;
    startMenu.hidden = !show;
    startButton.classList.toggle("active", show);
  }

  startButton.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleStart();
  });

  startMenu.querySelectorAll("li").forEach(function (li) {
    li.addEventListener("click", function () {
      if (li.id === "shutdown") {
        toggleStart(false);
        if (confirm("It is now safe to turn off your computer.\n\nReturn to GitHub?")) {
          window.location.href = "https://github.com/thomasjoyner";
        }
        return;
      }
      const name = li.dataset.window;
      if (name) openWindow(name);
      toggleStart(false);
    });
  });

  // Close start menu when clicking elsewhere
  document.addEventListener("click", function (e) {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startButton) {
      toggleStart(false);
    }
  });

  /* ---------- Clock ---------- */
  const clock = document.getElementById("clock");
  function tick() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    clock.textContent = h + ":" + m + " " + ampm;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Misc ---------- */
  const aboutYear = document.getElementById("about-year");
  if (aboutYear) aboutYear.textContent = new Date().getFullYear();

  // Open the Biography window on first load for a friendly landing
  openWindow("biography");
})();
