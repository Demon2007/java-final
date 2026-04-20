document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("completeLessonBtn");
  const lessonId = String(window.CURRENT_LESSON_ID || "");
  const completeUrl = window.COMPLETE_LESSON_URL || "";
  const container = document.getElementById("lessonContent");

  console.log("lesson_detail.js loaded");
  console.log("lessonId =", lessonId);
  console.log("completeUrl =", completeUrl);

  function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + "=")) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }
    return "";
  }

  async function completeLesson() {
    console.log("CLICKED COMPLETE LESSON");

    if (!btn || !lessonId || !completeUrl) {
      console.log("Missing data:", { hasBtn: !!btn, lessonId, completeUrl });
      return;
    }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Сохранение...";

    try {
      const response = await fetch(completeUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const data = await response.json();
      console.log("SERVER RESPONSE:", data);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить прогресс");
      }

      btn.textContent = "✅ Уже пройден";
      btn.disabled = true;
    } catch (error) {
      console.error("Ошибка сохранения прогресса:", error);
      btn.textContent = originalText || "Отметить как пройден";
      btn.disabled = false;
      alert("Не удалось сохранить прогресс. Попробуй ещё раз.");
    }
  }

  if (btn) {
    btn.addEventListener("click", completeLesson);
  }

  function esc(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function render(text) {
    if (!text || !text.trim()) {
      return "<p class='muted'>Контент пустой.</p>";
    }

    const lines = text.replace(/\r\n/g, "\n").split("\n");

    let html = "";
    let inCode = false;
    let codeBuf = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    };

    const flushCode = () => {
      html += `<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`;
      codeBuf = [];
    };

    for (let raw of lines) {
      const line = raw.trimEnd();

      if (line.trim().startsWith("```")) {
        if (!inCode) {
          closeList();
          inCode = true;
        } else {
          inCode = false;
          flushCode();
        }
        continue;
      }

      if (inCode) {
        codeBuf.push(raw);
        continue;
      }

      if (!line.trim()) {
        closeList();
        continue;
      }

      if (line.trim().endsWith(":") && line.trim().length < 80) {
        closeList();
        html += `<h2>${esc(line.replace(/:$/, "").trim())}</h2>`;
        continue;
      }

      const t = line.trim();

      if (t.startsWith("- ") || t.startsWith("• ")) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${esc(t.slice(2))}</li>`;
        continue;
      } else {
        closeList();
      }

      html += `<p>${esc(line)}</p>`;
    }

    closeList();

    if (inCode) {
      flushCode();
    }

    return html;
  }

  if (container) {
    const raw = container.dataset.raw || "";
    container.innerHTML = render(raw);
  }
});


