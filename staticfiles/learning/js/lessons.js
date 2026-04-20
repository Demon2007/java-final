document.addEventListener("DOMContentLoaded", () => {
  const lessonCards = Array.from(document.querySelectorAll(".lesson-card"));
  const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));
  const searchInput = document.getElementById("lessonSearch");
  const clearBtn = document.getElementById("clearSearch");
  const sortSelect = document.getElementById("lessonSort");
  const resultsCount = document.getElementById("resultsCount");
  const lessonsList = document.getElementById("lessonsList");

  if (!lessonCards.length) return;

  let currentFilter = "all";
  let currentSearch = "";
  let currentSort = "order_asc";

  function normalize(text) {
    return (text || "").toString().trim().toLowerCase();
  }

  function getVisibleCards() {
    return lessonCards.filter((card) => !card.classList.contains("hidden"));
  }

  function updateResultsCount() {
    const visibleCount = getVisibleCards().length;
    if (resultsCount) {
      resultsCount.textContent = `Найдено: ${visibleCount} урок(ов)`;
    }
  }

  function applyFilterAndSearch() {
    lessonCards.forEach((card) => {
      const level = normalize(card.dataset.level);
      const title = normalize(card.dataset.title);
      const desc = normalize(card.dataset.desc);

      const matchesLevel =
        currentFilter === "all" || level === currentFilter;

      const matchesSearch =
        !currentSearch ||
        title.includes(currentSearch) ||
        desc.includes(currentSearch);

      if (matchesLevel && matchesSearch) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });

    updateResultsCount();
  }

  function sortCards() {
    const sortedCards = [...lessonCards].sort((a, b) => {
      const orderA = Number(a.dataset.order || 0);
      const orderB = Number(b.dataset.order || 0);

      const titleA = normalize(a.dataset.title);
      const titleB = normalize(b.dataset.title);

      const createdA = Number(a.dataset.created || 0);
      const createdB = Number(b.dataset.created || 0);

      switch (currentSort) {
        case "order_desc":
          return orderB - orderA;
        case "title_asc":
          return titleA.localeCompare(titleB, "ru");
        case "title_desc":
          return titleB.localeCompare(titleA, "ru");
        case "newest":
          return createdB - createdA;
        case "oldest":
          return createdA - createdB;
        case "order_asc":
        default:
          return orderA - orderB;
      }
    });

    sortedCards.forEach((card) => {
      lessonsList.appendChild(card);
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");

      currentFilter = normalize(btn.dataset.filterLevel || "all");
      applyFilterAndSearch();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentSearch = normalize(searchInput.value);
      applyFilterAndSearch();
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      currentSearch = "";
      applyFilterAndSearch();
      searchInput.focus();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      sortCards();
      applyFilterAndSearch();
    });
  }

  sortCards();
  applyFilterAndSearch();
});