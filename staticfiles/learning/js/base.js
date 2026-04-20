document.addEventListener("DOMContentLoaded", () => {
  // подсветка активной ссылки
  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPath) {
      link.classList.add("active");
    }
  });
});

// Utility Functions
window.Utils = {
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  },
};


document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-link");
  const path = window.location.pathname.replace(/\/$/, "");

  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").replace(/\/$/, "");
    if (href && href === path) a.classList.add("active");
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const glow = document.querySelector(".cursor-glow");
  if (!glow) return;

  document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
  });
});


document.addEventListener("DOMContentLoaded", () => {

  /* ===== Glow Follow ===== */
  const glow = document.querySelector(".cursor-glow");
  document.addEventListener("mousemove", (e) => {
    if(glow){
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    }
  });

  /* ===== Click Pulse ===== */
  document.addEventListener("click", (e) => {
    const pulse = document.createElement("div");
    pulse.className = "cursor-click";
    pulse.style.left = e.clientX + "px";
    pulse.style.top = e.clientY + "px";
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 400);
  });

  /* ===== Magnetic Buttons ===== */
  document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("mousemove", e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0,0)";
    });
  });
})

/* ===== Particle System ===== */
const canvas = document.getElementById("cursorParticles");
if (!canvas) return;

const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

document.addEventListener("mousemove", (e) => {
  const x = e.clientX;
  const y = e.clientY;

  for (let i = 0; i < 2; i++) {
    particles.push({
      x: x,
      y: y,
      size: Math.random() * 4 + 1,
      life: 60,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    });
  }
});

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter((p) => p.life > 0);

  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(168,85,247,${p.life / 60})`;
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

animate();
