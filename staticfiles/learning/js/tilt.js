document.addEventListener("DOMContentLoaded", () => {

  const cards = document.querySelectorAll(".tilt");

  cards.forEach((card) => {

    let glare = card.querySelector(".tilt-glare");

    if (!glare) {
      glare = document.createElement("div");
      glare.className = "tilt-glare";
      card.appendChild(glare);
    }

    card.addEventListener("mousemove", (e) => {

      const rect = card.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 7;
      const rotateY = ((x - centerX) / centerX) * 9;

      card.style.transform = `
        perspective(1200px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        translateY(-4px)
        scale(1.02)
      `;

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      glare.style.background = `
        radial-gradient(
          circle at ${glareX}% ${glareY}%,
          rgba(168,85,247,0.12),
          rgba(139,92,246,0.06),
          transparent 60%
        )
      `;

    });

    card.addEventListener("mouseleave", () => {

      card.style.transform = "";
      glare.style.background = "none";

    });

  });

});