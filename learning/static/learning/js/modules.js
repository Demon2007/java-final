document.addEventListener("DOMContentLoaded", () => {
  function readArrayFromLS(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const completedLessons = readArrayFromLS("completedLessons").map(String);

  // На странице module_detail у нас есть список lessons -> считаем прогресс модуля
  const moduleProgressEls = document.querySelectorAll(".chip-progress[data-module-id]");
  moduleProgressEls.forEach((el) => {
    const moduleId = el.getAttribute("data-module-id");

    // Найдем уроки, которые реально отображаются на странице (module_detail)
    const pageLessonCards = Array.from(document.querySelectorAll(".lesson-card[data-lesson-id]"));

    // Если мы на /modules/ (список модулей) — уроков на странице нет.
    // Тогда просто покажем "—" (можно улучшить позже через backend).
    if (pageLessonCards.length === 0) {
      el.textContent = "Прогресс: —";
      return;
    }

    const total = pageLessonCards.length;
    const done = pageLessonCards.filter((c) => completedLessons.includes(String(c.getAttribute("data-lesson-id")))).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    el.textContent = `Прогресс: ${done}/${total} (${percent}%)`;
  });
});
