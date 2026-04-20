document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quizForm");
  if (!form) return;

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function markTestCompleted(lessonId) {
    const tests = readArray("completedTests");
    const id = String(lessonId);
    if (!tests.map(String).includes(id)) {
      tests.push(id);
      localStorage.setItem("completedTests", JSON.stringify(tests));
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const cards = form.querySelectorAll(".quiz-card");
    let correctCount = 0;

    cards.forEach((card) => {
      const qid = card.getAttribute("data-qid");
      const correct = card.getAttribute("data-correct");
      const chosen = form.querySelector(`input[name="q${qid}"]:checked`);
      const explain = card.querySelector(".explain");

      card.classList.remove("ok", "bad");

      if (chosen && chosen.value === correct) {
        correctCount++;
        card.classList.add("ok");
      } else {
        card.classList.add("bad");
        if (explain) explain.classList.remove("hidden");
      }
    });

    const total = cards.length;
    alert(`Результат: ${correctCount} / ${total}`);

    // считаем тест пройденным если 70%+
    const percent = total > 0 ? (correctCount / total) * 100 : 0;
    if (percent >= 70) {
      markTestCompleted(window.CURRENT_LESSON_ID || "");
    }
  });
});
