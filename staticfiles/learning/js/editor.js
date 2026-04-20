function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
}

function setChip(text, kind = "") {
  const chip = document.getElementById("statusChip");
  if (!chip) return;

  chip.textContent = text;
  chip.classList.remove("ok", "err", "run", "idle");
  chip.classList.add(kind || "idle");
}

function setOutput(text) {
  const out = document.getElementById("output");
  const wrap = document.getElementById("outputWrap");
  if (!out || !wrap) return;

  out.textContent = text || "";
  wrap.classList.remove("output-pop");
  void wrap.offsetWidth;
  wrap.classList.add("output-pop");
}

function setRunLoading(isLoading) {
  const runBtn = document.getElementById("runBtn");
  if (!runBtn) return;

  runBtn.disabled = isLoading;
  runBtn.classList.toggle("is-loading", isLoading);
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

function safeGetLocalStorage(key, fallback = "") {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (_) {
    return fallback;
  }
}

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  const runBtn = document.getElementById("runBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const clearOutBtn = document.getElementById("clearOutBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const stdinEl = document.getElementById("stdin");
  const editorRoot = document.getElementById("editor");

  if (!editorRoot) return;

  const STORAGE = {
    tab: "monaco_tab",
    main: "monaco_main_code",
    helper: "monaco_helper_code",
    stdin: "monaco_stdin",
  };

  const defaultMain = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}`;

  const defaultHelper = `// Helper.java
class Helper {
    static int add(int a, int b) {
        return a + b;
    }
}`;

  let activeTab = safeGetLocalStorage(STORAGE.tab, "main");

  const files = {
    main: safeGetLocalStorage(STORAGE.main, defaultMain),
    helper: safeGetLocalStorage(STORAGE.helper, defaultHelper),
  };

  if (stdinEl) {
    stdinEl.value = safeGetLocalStorage(STORAGE.stdin, "");
    stdinEl.addEventListener("input", () => {
      safeSetLocalStorage(STORAGE.stdin, stdinEl.value || "");
    });
  }

  const editor = monaco.editor.create(editorRoot, {
    value: files[activeTab] || defaultMain,
    language: "java",
    theme: "vs-dark",
    fontSize: 15,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth",
    roundedSelection: true,
    padding: {
      top: 16,
      bottom: 16,
    },
  });

  function setActiveTab(tab) {
    activeTab = tab;
    safeSetLocalStorage(STORAGE.tab, tab);

    document.querySelectorAll(".tab").forEach((b) => {
      b.classList.remove("active");
    });

    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add("active");
    editor.setValue(files[tab] ?? "");
    setChip("Готов", "idle");
  }

  editor.onDidChangeModelContent(() => {
    files[activeTab] = editor.getValue();

    if (activeTab === "main") {
      safeSetLocalStorage(STORAGE.main, files.main);
    } else {
      safeSetLocalStorage(STORAGE.helper, files.helper);
    }
  });

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.tab);
    });
  });

  setActiveTab(activeTab);

  clearOutBtn?.addEventListener("click", () => {
    setOutput("");
    setChip("Вывод очищен", "idle");
  });

  sampleBtn?.addEventListener("click", () => {
    if (stdinEl) {
      stdinEl.value = "5\n10 20 30 40 50\n";
      safeSetLocalStorage(STORAGE.stdin, stdinEl.value || "");
    }

    const sample = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;

        for (int i = 0; i < n; i++) {
            sum += sc.nextInt();
        }

        System.out.println("Sum = " + sum);
    }
}`;

    files.main = sample;
    safeSetLocalStorage(STORAGE.main, sample);
    setActiveTab("main");
    setOutput("✅ Вставил пример с вводом.\nНажми «Запустить».");
    setChip("Пример загружен", "idle");
  });

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.getValue());
      const oldText = copyBtn.textContent;
      copyBtn.textContent = "✅ Скопировано";
      setChip("Код скопирован", "ok");

      setTimeout(() => {
        copyBtn.textContent = oldText || "Скопировать";
      }, 1100);
    } catch (_) {
      setChip("Ошибка копирования", "err");
      alert("Не получилось скопировать. Попробуй Ctrl+C.");
    }
  });

  clearBtn?.addEventListener("click", () => {
    const confirmed = confirm("Очистить Main.java, Helper.java, stdin и вывод?");
    if (!confirmed) return;

    files.main = "";
    files.helper = "";

    safeSetLocalStorage(STORAGE.main, "");
    safeSetLocalStorage(STORAGE.helper, "");

    if (stdinEl) {
      stdinEl.value = "";
      safeSetLocalStorage(STORAGE.stdin, "");
    }

    setActiveTab("main");
    setOutput("");
    setChip("Очищено", "idle");
  });

  async function run() {
    const mainCode =
      activeTab === "main"
        ? editor.getValue()
        : safeGetLocalStorage(STORAGE.main, defaultMain);

    const stdin = stdinEl?.value || "";

    setRunLoading(true);
    setChip("Выполнение…", "run");
    setOutput("⏳ Выполнение...");

    try {
      const res = await fetch(window.RUN_JAVA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          code: mainCode,
          stdin,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const rawText = await res.text();
        setChip("Ошибка", "err");
        setOutput("❌ Сервер вернул не JSON.\n\n" + rawText.slice(0, 1000));
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setChip("Ошибка", "err");
        setOutput(`❌ Ошибка: ${data.error || "unknown"}\n${data.detail || ""}`);
        return;
      }

      const out = (data.stdout || "").trimEnd();
      const err = (data.stderr || "").trimEnd();

      if (data.phase === "compile" && err) {
        setChip("Ошибка компиляции", "err");
        setOutput(`❌ Ошибка компиляции:\n\n${err}`);
        return;
      }

      if (err) {
        setChip("Выполнено с stderr", "err");
      } else {
        setChip("Готово", "ok");
      }

      const resultText =
        `${out ? `STDOUT:\n${out}` : "STDOUT: (пусто)"}\n\n` +
        `${err ? `STDERR:\n${err}` : "STDERR: (пусто)"}`;

      setOutput(resultText);
    } catch (e) {
      setChip("Ошибка запроса", "err");
      setOutput("❌ Ошибка запроса:\n\n" + String(e));
    } finally {
      setRunLoading(false);
    }
  }

  runBtn?.addEventListener("click", run);

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });

  setChip("Готов", "idle");
});

if (window.lucide) {
  lucide.createIcons();
}