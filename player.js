(async function () {
  const BARS = 56;

  // Content lives in content/*.json so the /admin editor can change it.
  const loadJSON = file => fetch(file, { cache: "no-cache" }).then(r => r.json());
  const [SITE, content, work] = await Promise.all([
    loadJSON("content/settings.json"),
    loadJSON("content/samples.json"),
    loadJSON("content/work.json").catch(() => ({ items: [] })),
  ]);
  const samples = content.samples || [];
  const featured = content.featured && content.featured.file ? content.featured : null;

  // Text typed in the editor is inserted as text, never as HTML.
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const audio = new Audio();
  audio.preload = "none";
  let current = null; // the player object currently loaded

  // ---------- Site settings ----------
  document.getElementById("year").textContent = new Date().getFullYear();
  document.querySelectorAll('[data-site="location"]').forEach(el => { if (SITE.location) el.textContent = SITE.location; });
  if (SITE.email) {
    document.querySelectorAll('[data-site="email"]').forEach(el => (el.textContent = SITE.email));
    document.querySelectorAll('[data-site="email-link"]').forEach(el => (el.href = "mailto:" + SITE.email));
  }

  // ---------- Socials ----------
  const socialIcons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.9-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 3c-2.4 0-2.7 0-3.7.1-3.3.1-5 1.9-5.1 5.1C3 9.3 3 9.6 3 12s0 2.7.1 3.7c.1 3.3 1.9 5 5.1 5.1 1 .1 1.3.1 3.7.1s2.7 0 3.7-.1c3.3-.1 5-1.9 5.1-5.1.1-1 .1-1.3.1-3.7s0-2.7-.1-3.7c-.1-3.3-1.9-5-5.1-5.1C14.7 3 14.4 3 12 3zm0 1.6c2.4 0 2.6 0 3.6.1 2.4.1 3.6 1.3 3.7 3.7.1 1 .1 1.2.1 3.6s0 2.6-.1 3.6c-.1 2.4-1.3 3.6-3.7 3.7-1 .1-1.2.1-3.6.1s-2.6 0-3.6-.1c-2.4-.1-3.6-1.3-3.7-3.7-.1-1-.1-1.2-.1-3.6s0-2.6.1-3.6c.1-2.4 1.3-3.6 3.7-3.7 1-.1 1.2-.1 3.6-.1z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0zM13 6.3l1.2-1.2a4.5 4.5 0 0 1 6.4 6.4l-1.9 1.9a1 1 0 1 1-1.4-1.4l1.9-1.9a2.5 2.5 0 0 0-3.6-3.6L14.4 7.7A1 1 0 1 1 13 6.3zM11 17.7l-1.2 1.2a4.5 4.5 0 0 1-6.4-6.4l1.9-1.9a1 1 0 1 1 1.4 1.4l-1.9 1.9a2.5 2.5 0 0 0 3.6 3.6l1.2-1.2a1 1 0 1 1 1.4 1.4z"/></svg>',
  };
  const socials = SITE.socials || [];
  [["social-links", true], ["footer-social-links", false]].forEach(([id, withHandle]) => {
    const list = document.getElementById(id);
    if (!list) return;
    if (!socials.length) { list.closest(".socials")?.remove(); list.remove(); return; }
    list.innerHTML = socials.map(s => {
      const icon = socialIcons[String(s.name || "").toLowerCase()] || socialIcons.link;
      const label = withHandle ? `<span>${esc(s.handle || s.name)}</span>` : "";
      return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}: ${esc(s.handle)}">${icon}${label}</a></li>`;
    }).join("");
  });

  // ---------- Helpers ----------
  const icons =
    '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>' +
    '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';

  const fmt = s => (isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "–:––");

  // A gentle stand-in waveform until the real one is measured from the audio.
  function seededPeaks(seed) {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return Array.from({ length: BARS }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const env = Math.sin((i / (BARS - 1)) * Math.PI) * 0.6 + 0.4;
      return 0.2 + ((h % 1000) / 1000) * 0.8 * env;
    });
  }

  let audioCtx;
  async function realPeaks(file) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const buf = await (await fetch(file)).arrayBuffer();
    const data = (await audioCtx.decodeAudioData(buf)).getChannelData(0);
    const step = Math.floor(data.length / BARS);
    const peaks = [];
    for (let i = 0; i < BARS; i++) {
      let max = 0;
      for (let j = i * step; j < (i + 1) * step; j += 16) max = Math.max(max, Math.abs(data[j]));
      peaks.push(max);
    }
    const top = Math.max(...peaks) || 1;
    return peaks.map(p => Math.max(0.12, p / top));
  }

  // ---------- Build one player ----------
  function makePlayer(el, sample, { big = false } = {}) {
    el.innerHTML = `
      <button class="play" type="button" aria-label="Play ${esc(sample.title)}">${icons}</button>
      <div class="card-top">
        <h3>${esc(sample.title)}</h3>
        ${big ? `<p>${esc(sample.description)}</p>` : `<span><span class="tag">${esc(sample.category)}</span></span>`}
      </div>
      <div class="player-row">
        <div class="wave" role="slider" tabindex="0" aria-label="Seek ${esc(sample.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
        <div class="meta"><span class="elapsed">0:00</span><span class="time">–:––</span></div>
      </div>`;

    const p = {
      el, sample,
      btn: el.querySelector(".play"),
      wave: el.querySelector(".wave"),
      elapsed: el.querySelector(".elapsed"),
      time: el.querySelector(".time"),
      bars: [],
      duration: NaN,
    };

    const drawBars = peaks => {
      p.wave.innerHTML = peaks.map(v => `<span style="height:${Math.round(v * 100)}%"></span>`).join("");
      p.bars = [...p.wave.children];
    };
    drawBars(seededPeaks(sample.title));

    // Read the length without downloading the whole file
    const probe = new Audio();
    probe.preload = "metadata";
    probe.src = sample.file;
    probe.addEventListener("loadedmetadata", () => {
      p.duration = probe.duration;
      p.time.textContent = fmt(probe.duration);
      realPeaks(sample.file).then(drawBars).catch(() => {});
    });
    probe.addEventListener("error", () => el.classList.add("missing"));

    p.btn.addEventListener("click", () => toggle(p));
    const seekTo = frac => {
      if (current !== p) load(p);
      const go = () => { audio.currentTime = frac * audio.duration; audio.play(); };
      isFinite(audio.duration) ? go() : audio.addEventListener("loadedmetadata", go, { once: true });
    };
    p.wave.addEventListener("click", e => {
      const r = p.wave.getBoundingClientRect();
      seekTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    });
    p.wave.addEventListener("keydown", e => {
      if (current !== p || !isFinite(audio.duration)) return;
      if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); e.preventDefault(); }
      if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
    });
    return p;
  }

  // ---------- Playback (one at a time) ----------
  function paint(p, frac) {
    const n = Math.round(frac * p.bars.length);
    p.bars.forEach((b, i) => b.classList.toggle("played", i < n));
    p.wave.setAttribute("aria-valuenow", Math.round(frac * 100));
  }

  function reset(p) {
    p.el.classList.remove("is-playing");
    p.btn.setAttribute("aria-label", "Play " + p.sample.title);
    p.elapsed.textContent = "0:00";
    paint(p, 0);
  }

  function load(p) {
    if (current) reset(current);
    current = p;
    audio.src = p.sample.file;
  }

  function toggle(p) {
    if (current !== p) load(p);
    audio.paused ? audio.play() : audio.pause();
  }

  audio.addEventListener("play", () => {
    current.el.classList.add("is-playing");
    current.btn.setAttribute("aria-label", "Pause " + current.sample.title);
    requestAnimationFrame(tick);
  });
  audio.addEventListener("pause", () => {
    if (!current) return;
    current.el.classList.remove("is-playing");
    current.btn.setAttribute("aria-label", "Play " + current.sample.title);
  });
  audio.addEventListener("ended", () => { reset(current); });
  audio.addEventListener("error", () => { if (current) current.el.classList.add("missing"); });

  function tick() {
    if (!current || !isFinite(audio.duration)) { if (!audio.paused) requestAnimationFrame(tick); return; }
    paint(current, audio.currentTime / audio.duration);
    current.elapsed.textContent = fmt(audio.currentTime);
    if (!audio.paused) requestAnimationFrame(tick);
  }

  // ---------- Render ----------
  const featuredEl = document.getElementById("featured");
  if (featured) makePlayer(featuredEl, featured, { big: true });
  else featuredEl.remove();

  const grid = document.getElementById("sample-grid");
  const cards = samples.map(s => {
    const li = document.createElement("li");
    li.className = "card glass";
    li.dataset.category = s.category;
    grid.appendChild(li);
    makePlayer(li, s);
    return li;
  });

  const filters = document.getElementById("filters");
  const cats = ["All", ...new Set(samples.map(s => s.category))];
  cats.forEach(cat => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = cat;
    b.setAttribute("aria-pressed", cat === "All");
    b.addEventListener("click", () => {
      filters.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c === b));
      cards.forEach(c => (c.hidden = cat !== "All" && c.dataset.category !== cat));
    });
    filters.appendChild(b);
  });

  // ---------- Past work ----------
  // YouTube link -> { id, start } from watch?v=, youtu.be/, /shorts/ or /embed/ links, with t=1m20s or t=80
  function parseYouTube(url) {
    try {
      const u = new URL(url);
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      const t = u.searchParams.get("t") || u.searchParams.get("start") || "";
      const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/) || [];
      const start = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
      return /^[\w-]{11}$/.test(id) ? { id, start } : null;
    } catch { return null; }
  }

  const workGrid = document.getElementById("work-grid");
  const workItems = (work.items || []).filter(w => (w.type === "youtube" ? parseYouTube(w.youtube) : w.video));
  if (!workItems.length) document.getElementById("work")?.remove();

  workItems.forEach(w => {
    const li = document.createElement("li");
    li.className = "work-item glass";
    const text = `<div class="work-text"><h3>${esc(w.title)}</h3>${w.subtitle ? `<p>${esc(w.subtitle)}</p>` : ""}</div>`;

    if (w.type === "youtube") {
      // Show a thumbnail first; the YouTube player only loads when someone presses play.
      const { id, start } = parseYouTube(w.youtube);
      li.classList.add("wide");
      li.innerHTML = `
        <button class="work-media yt" type="button" aria-label="Play video: ${esc(w.title)}">
          <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
          <span class="yt-play" aria-hidden="true">${icons}</span>
        </button>${text}`;
      li.querySelector(".yt").addEventListener("click", e => {
        audio.pause();
        const frame = document.createElement("iframe");
        frame.className = "work-media";
        frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ""}`;
        frame.title = w.title;
        frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        frame.allowFullscreen = true;
        e.currentTarget.replaceWith(frame);
      });
    } else {
      li.classList.add("tall");
      li.innerHTML = `
        <video class="work-media" controls playsinline preload="none"${w.poster ? ` poster="${esc(w.poster)}"` : ""}>
          <source src="${esc(w.video)}" type="video/mp4">
        </video>${text}`;
      const video = li.querySelector("video");
      video.addEventListener("play", () => audio.pause());
      // GitHub Pages sometimes answers a video request with an error. Retry once with a fresh URL.
      li.querySelector("source").addEventListener("error", e => {
        if (video.dataset.retried) return;
        video.dataset.retried = "1";
        e.target.src = w.video + "?retry=" + Date.now();
        video.load();
        video.play().catch(() => {});
      });
    }
    workGrid.appendChild(li);
  });

  // Starting a voice sample pauses any past-work video that's playing.
  audio.addEventListener("play", () => workGrid?.querySelectorAll("video").forEach(v => v.pause()));
})();
