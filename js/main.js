const themeButtons = document.querySelectorAll("[data-theme-set]");

const applyTheme = (theme) => {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  localStorage.setItem("cv-theme", next);
  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeSet === next));
  });
  window.syncAmbientDots?.();
};

applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");

themeButtons.forEach((button) => {
  button.addEventListener("click", () => applyTheme(button.dataset.themeSet));
});

const navLinks = document.querySelectorAll(".nav-link");
const sections = [...navLinks].map((link) => document.querySelector(link.getAttribute("href")));
const topbar = document.querySelector(".topbar");
const menuToggle = document.querySelector(".menu-toggle");

const setActive = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  },
  { rootMargin: "-35% 0px -50% 0px", threshold: 0.1 }
);

sections.filter(Boolean).forEach((section) => observer.observe(section));

menuToggle?.addEventListener("click", () => {
  const open = topbar.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => topbar.classList.remove("is-open"));
});

document.querySelector("[data-print]")?.addEventListener("click", () => window.print());

const meters = document.querySelectorAll(".meter");
const meterObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const bar = entry.target.querySelector("span");
      bar.style.width = `${entry.target.dataset.level}%`;
      obs.unobserve(entry.target);
    });
  },
  { threshold: 0.4 }
);

meters.forEach((meter) => meterObserver.observe(meter));

const PALETTES = {
  dark: [
    [201, 169, 98],
    [232, 213, 163],
    [120, 138, 168],
    [236, 231, 220],
  ],
  light: [
    [141, 107, 45],
    [184, 148, 78],
    [120, 108, 88],
    [201, 169, 98],
  ],
};

(() => {
  const canvas = document.querySelector(".bg-dots");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const dots = [];
  let width = 0;
  let height = 0;
  let palette = PALETTES.dark;
  let running = true;

  const rand = (min, max) => min + Math.random() * (max - min);

  const syncPalette = () => {
    palette = PALETTES[document.documentElement.dataset.theme === "light" ? "light" : "dark"];
    dots.forEach((dot) => {
      dot.color = palette[Math.floor(Math.random() * palette.length)];
    });
  };

  const MAX_BRIGHT = 0.8;
  const SHAPES = ["circle", "circle", "circle", "diamond", "ellipse", "plus", "ring", "triangle"];

  const pickShape = (isOrb) => (isOrb ? "orb" : SHAPES[Math.floor(Math.random() * SHAPES.length)]);

  const makeDot = (kind, index) => {
    const isOrb = kind === "orb";
    const isTiny = kind === "tiny";
    return {
      x: Math.random(),
      y: Math.random(),
      r: isOrb ? rand(28, 90) : isTiny ? rand(0.9, 2.2) : rand(2.4, 6.2),
      interval: rand(1.5, 3.5),
      phase: rand(0, Math.PI * 2) + (index % 2) * Math.PI,
      peak: isOrb ? rand(0.08, 0.16) : Math.min(rand(0.22, 0.8), MAX_BRIGHT),
      floor: isOrb ? rand(0.015, 0.04) : rand(0.03, 0.1),
      rotation: rand(0, Math.PI),
      shape: pickShape(isOrb),
      color: palette[Math.floor(Math.random() * palette.length)],
      orb: isOrb,
    };
  };

  const drawShape = (dot, x, y, alpha, rgb) => {
    const [r, g, b] = rgb;
    const size = dot.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dot.rotation);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

    if (dot.shape === "diamond") {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
    } else if (dot.shape === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (dot.shape === "plus") {
      const arm = size * 0.32;
      ctx.fillRect(-arm, -size, arm * 2, size * 2);
      ctx.fillRect(-size, -arm, size * 2, arm * 2);
    } else if (dot.shape === "ring") {
      ctx.lineWidth = Math.max(0.7, size * 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (dot.shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.9, size * 0.7);
      ctx.lineTo(-size * 0.9, size * 0.7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  for (let i = 0; i < 46; i += 1) dots.push(makeDot("tiny", i));
  for (let i = 0; i < 22; i += 1) dots.push(makeDot("mid", i));
  for (let i = 0; i < 9; i += 1) dots.push(makeDot("orb", i));

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const tick = (time) => {
    if (!running) return;
    const t = time * 0.001;
    ctx.clearRect(0, 0, width, height);

    dots.forEach((dot) => {
      const wave = 0.5 - 0.5 * Math.cos((Math.PI * t) / dot.interval + dot.phase);
      const alpha = Math.min(dot.floor + (dot.peak - dot.floor) * wave, MAX_BRIGHT);
      const rgb = dot.color;
      const x = dot.x * width;
      const y = dot.y * height;

      if (dot.orb) {
        const [r, g, b] = rgb;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, dot.r);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gradient.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, dot.r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      drawShape(dot, x, y, alpha, rgb);
    });

    requestAnimationFrame(tick);
  };

  syncPalette();
  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
    if (running) requestAnimationFrame(tick);
  });
  requestAnimationFrame(tick);
  window.syncAmbientDots = syncPalette;
})();

