document.addEventListener("DOMContentLoaded", () => {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.querySelector(".progress-text");
  const lessonCards = Array.from(document.querySelectorAll(".lesson-card"));
  const totalLessons = lessonCards.length;

  const searchInput = document.getElementById("lessonSearch");
  const clearBtn = document.getElementById("clearSearch");
  const sortSelect = document.getElementById("lessonSort");
  const resultsCount = document.getElementById("resultsCount");
  const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));

  const isAuth = Boolean(window.IS_AUTH);
  const progressUrl = window.API_PROGRESS_URL || "/api/progress/";

  const norm = (s) => (s || "").toString().toLowerCase().trim();

  let serverCompletedLessons = [];

  function resetCardsUI() {
    lessonCards.forEach((card) => {
      card.classList.remove("completed");
      const lessonId = card.getAttribute("data-lesson-id");
      const statusEl = document.getElementById(`status-${lessonId}`);

      if (statusEl) {
        const icon = statusEl.querySelector(".status-icon");
        const text = statusEl.querySelector(".status-text");
        if (icon) icon.textContent = "○";
        if (text) text.textContent = "Не пройден";
      }

      const btn = card.querySelector(".lesson-btn");
      if (btn) btn.textContent = "Начать";
    });
  }

  function applyCompletedToUI(completedIds) {
    const ids = (completedIds || []).map(String);

    resetCardsUI();

    const completed = ids.length;
    const percentage = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${completed} из ${totalLessons} уроков (${percentage}%)`;
    }

    ids.forEach((lessonId) => {
      const card = document.querySelector(`[data-lesson-id="${lessonId}"]`);
      if (!card) return;

      card.classList.add("completed");

      const statusEl = document.getElementById(`status-${lessonId}`);
      if (statusEl) {
        const icon = statusEl.querySelector(".status-icon");
        const text = statusEl.querySelector(".status-text");
        if (icon) icon.textContent = "●";
        if (text) text.textContent = "Пройден";
      }

      const btn = card.querySelector(".lesson-btn");
      if (btn) btn.textContent = "Повторить";
    });
  }

  async function fetchProgressFromServer() {
    try {
      const response = await fetch(progressUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        return { lesson_done_ids: [] };
      }

      return await response.json();
    } catch (error) {
      console.error("Ошибка загрузки прогресса:", error);
      return { lesson_done_ids: [] };
    }
  }

  let activeLevel = "all";
  let q = "";
  let sortMode = "order_asc";

  try {
    const savedQ = localStorage.getItem("lessonSearch");
    if (savedQ) q = savedQ;

    const savedSort = localStorage.getItem("lessonSort");
    if (savedSort) sortMode = savedSort;

    const savedLevel = localStorage.getItem("lessonLevel");
    if (savedLevel) activeLevel = savedLevel;
  } catch (error) {
    console.warn("Не удалось прочитать настройки поиска:", error);
  }

  if (searchInput) searchInput.value = q;
  if (sortSelect) sortSelect.value = sortMode;

  function highlight(card, query) {
    const titleEl = card.querySelector(".js-title");
    const descEl = card.querySelector(".js-desc");
    const nodes = [titleEl, descEl].filter(Boolean);

    nodes.forEach((node) => {
      const raw = node.getAttribute("data-raw") ?? node.textContent;
      if (!node.getAttribute("data-raw")) {
        node.setAttribute("data-raw", raw);
      }

      if (!query) {
        node.innerHTML = raw;
        return;
      }

      const escaped = raw.replace(/[&<>"]/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      }[ch]));

      const re = new RegExp(
        `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "ig"
      );

      node.innerHTML = escaped.replace(re, `<mark class="hl">$1</mark>`);
    });
  }

  function applySearchFilterSort() {
    const query = norm(q);
    let visible = 0;

    lessonCards.forEach((card) => {
      const level = norm(card.getAttribute("data-level"));

      const title = norm(
        card.getAttribute("data-title") ||
        card.querySelector(".lesson-title")?.textContent
      );

      const desc = norm(
        card.getAttribute("data-desc") ||
        card.querySelector(".lesson-desc")?.textContent
      );

      const matchLevel = activeLevel === "all" ? true : level === activeLevel;
      const matchQuery = !query ? true : title.includes(query) || desc.includes(query);
      const show = matchLevel && matchQuery;

      card.classList.toggle("hidden", !show);

      if (show) {
        visible++;
        card.style.animation = "fadeIn 0.25s ease forwards";
      }

      highlight(card, query);
    });

    const parent = lessonCards[0]?.parentElement;

    if (parent) {
      const visibleCards = lessonCards.filter((c) => !c.classList.contains("hidden"));

      const byNum = (a, b, key) =>
        Number(a.getAttribute(key) || 0) - Number(b.getAttribute(key) || 0);

      const byStr = (a, b, key) =>
        String(a.getAttribute(key) || "").localeCompare(
          String(b.getAttribute(key) || ""),
          "ru"
        );

      visibleCards.sort((a, b) => {
        switch (sortMode) {
          case "order_desc":
            return -byNum(a, b, "data-order");
          case "title_asc":
            return byStr(a, b, "data-title");
          case "title_desc":
            return -byStr(a, b, "data-title");
          case "newest":
            return new Date(b.getAttribute("data-created") || 0) - new Date(a.getAttribute("data-created") || 0);
          case "oldest":
            return new Date(a.getAttribute("data-created") || 0) - new Date(b.getAttribute("data-created") || 0);
          case "order_asc":
          default:
            return byNum(a, b, "data-order");
        }
      });

      visibleCards.forEach((c) => parent.appendChild(c));
    }

    if (resultsCount) {
      resultsCount.textContent = `Найдено: ${visible} урок(ов)`;
    }

    try {
      localStorage.setItem("lessonSearch", q);
      localStorage.setItem("lessonSort", sortMode);
      localStorage.setItem("lessonLevel", activeLevel);
    } catch (error) {
      console.warn("Не удалось сохранить настройки:", error);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      q = e.target.value || "";
      applySearchFilterSort();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      q = "";
      if (searchInput) searchInput.value = "";
      applySearchFilterSort();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortMode = e.target.value;
      applySearchFilterSort();
    });
  }

  filterBtns.forEach((btn) => {
    const btnLevel = btn.getAttribute("data-filter-level") || "all";

    if (btnLevel === activeLevel) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }

    btn.addEventListener("click", function () {
      filterBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      activeLevel = this.getAttribute("data-filter-level") || "all";
      applySearchFilterSort();
    });
  });

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  async function initProgress() {
    if (!isAuth) {
      applySearchFilterSort();
      return;
    }

    const data = await fetchProgressFromServer();
    serverCompletedLessons = (data.lesson_done_ids || []).map(String);
    applyCompletedToUI(serverCompletedLessons);
    applySearchFilterSort();
  }

  initProgress();
});


