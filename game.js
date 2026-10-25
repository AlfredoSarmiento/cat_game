(() => {
  "use strict";

  const config = window.CATS_CONFIG || {};
  const goal = Number.isInteger(config.goal) && config.goal > 0 ? config.goal : 10;
  const names = Array.isArray(config.cats) ? config.cats : [];

  const MARGIN = 8;
  const CONFETTI_COLORS = ["#ff4f87", "#ffb703", "#2ec4b6", "#7b61ff", "#ffffff"];

  const $ = (id) => document.getElementById(id);
  const screens = { start: $("screen-start"), play: $("screen-play"), win: $("screen-win") };
  const field = $("field");
  const scoreEl = $("score");
  const barFill = $("bar-fill");
  const startError = $("start-error");
  const soundBtn = $("btn-sound");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let pool = [];
  let score = 0;
  let startedAt = 0;
  let lastSrc = null;
  let lastPos = null;
  let current = null;
  let soundOn = true;
  let audio = null;

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function showScreen(name) {
    for (const key of Object.keys(screens)) screens[key].hidden = key !== name;
  }

  // Load every sticker up front so a missing file is dropped before the game
  // starts and each cat appears instantly when it is its turn.
  function loadSticker(name) {
    const src = "cats/" + encodeURI(name);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        resolve({ src, ratio });
      };
      img.onerror = () => {
        console.warn("Could not load cat picture:", src);
        resolve(null);
      };
      img.src = src;
    });
  }

  const ready = Promise.all(names.map(loadSticker)).then((list) => list.filter(Boolean));

  function showMascot(img, stickers) {
    if (!stickers.length) return;
    img.src = pick(stickers).src;
    img.hidden = false;
  }

  /* ---------- sound ---------- */

  function ensureAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch (err) {
      audio = null;
    }
  }

  function tone(freq, delay = 0, length = 0.15) {
    if (!soundOn || !audio) return;
    try {
      const t = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + length * 0.6);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + length);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t);
      osc.stop(t + length + 0.02);
    } catch (err) {
      /* sound is optional */
    }
  }

  const boop = () => tone(rand(420, 640));
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25));

  /* ---------- cats ---------- */

  function place(cat) {
    const w = cat.offsetWidth;
    const h = cat.offsetHeight;
    const maxX = Math.max(0, field.clientWidth - w - MARGIN * 2);
    const maxY = Math.max(0, field.clientHeight - h - MARGIN * 2);
    let x = MARGIN;
    let y = MARGIN;
    // Try a few times to avoid popping up right where the last cat was.
    for (let i = 0; i < 8; i++) {
      x = MARGIN + Math.random() * maxX;
      y = MARGIN + Math.random() * maxY;
      if (!lastPos || Math.hypot(x - lastPos.x, y - lastPos.y) > 120) break;
    }
    cat.style.left = x + "px";
    cat.style.top = y + "px";
    lastPos = { x, y };
  }

  function spawnCat() {
    // Never show the same sticker twice in a row (unless there is only one).
    const choices = pool.length > 1 ? pool.filter((s) => s.src !== lastSrc) : pool;
    const sticker = pick(choices);
    lastSrc = sticker.src;

    const fw = field.clientWidth - MARGIN * 2;
    const fh = field.clientHeight - MARGIN * 2;
    const longest = Math.min(Math.max(Math.min(fw, fh) * rand(0.24, 0.4), 90), 200);
    let w = sticker.ratio >= 1 ? longest : longest * sticker.ratio;
    let h = sticker.ratio >= 1 ? longest / sticker.ratio : longest;
    const fit = Math.min(1, fw / w, fh / h);
    w *= fit;
    h *= fit;

    const cat = document.createElement("button");
    cat.type = "button";
    cat.className = "cat";
    cat.setAttribute("aria-label", "Cat! Click it");
    cat.style.width = w + "px";
    cat.style.height = h + "px";
    cat.style.setProperty("--rot", rand(-12, 12).toFixed(1) + "deg");

    const img = new Image();
    img.src = sticker.src;
    img.alt = "";
    img.draggable = false;
    cat.append(img);

    cat.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      catchCat(cat);
    });
    // detail === 0 means the click came from the keyboard (Enter or Space).
    cat.addEventListener("click", (e) => {
      if (e.detail === 0) catchCat(cat);
    });

    field.append(cat);
    place(cat);
    current = cat;
    cat.focus({ preventScroll: true });
  }

  function catchCat(cat) {
    if (cat.classList.contains("caught")) return;
    cat.classList.add("caught");
    setTimeout(() => cat.remove(), 220);
    current = null;

    score += 1;
    renderScore();
    boop();

    if (score >= goal) {
      setTimeout(win, 300);
    } else {
      spawnCat();
    }
  }

  function renderScore() {
    scoreEl.textContent = score;
    barFill.style.width = (score / goal) * 100 + "%";
  }

  /* ---------- game flow ---------- */

  async function startGame() {
    ensureAudio();
    pool = await ready;
    if (!pool.length) {
      startError.hidden = false;
      return;
    }
    startError.hidden = true;

    score = 0;
    lastSrc = null;
    lastPos = null;
    field.replaceChildren();
    $("confetti").replaceChildren();
    renderScore();
    showScreen("play");
    startedAt = performance.now();
    spawnCat();
  }

  function win() {
    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    $("win-message").textContent = `${goal} ${goal === 1 ? "cat" : "cats"} caught in ${seconds} seconds.`;
    showMascot($("mascot-win"), pool);
    showScreen("win");
    fanfare();
    confetti();
  }

  function confetti() {
    if (reducedMotion.matches) return;
    const layer = $("confetti");
    layer.replaceChildren();
    for (let i = 0; i < 60; i++) {
      const bit = document.createElement("i");
      bit.style.left = rand(0, 100) + "%";
      bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      bit.style.animationDelay = rand(0, 0.8).toFixed(2) + "s";
      bit.style.animationDuration = rand(2, 4).toFixed(2) + "s";
      bit.style.setProperty("--drift", rand(-60, 60).toFixed(0) + "px");
      layer.append(bit);
    }
  }

  /* ---------- wiring ---------- */

  $("goal").textContent = goal;
  $("goal-label").textContent = goal;

  $("btn-start").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
  });

  window.addEventListener("resize", () => {
    if (current) place(current);
  });

  ready.then((stickers) => showMascot($("mascot-start"), stickers));
})();
