function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
}

function setChip(text, kind) {
  const chip = document.getElementById("statusChip");
  if (!chip) return;
  chip.textContent = text;
  chip.classList.remove("ok", "err", "run");
  if (kind) chip.classList.add(kind);
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

require.config({
  paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" },
});

require(["vs/editor/editor.main"], function () {
  const runBtn = document.getElementById("runBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const clearOutBtn = document.getElementById("clearOutBtn");
  const sampleBtn = document.getElementById("sampleBtn");
  const stdinEl = document.getElementById("stdin");

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

  let activeTab = localStorage.getItem(STORAGE.tab) || "main";

  const files = {
    main: localStorage.getItem(STORAGE.main) || defaultMain,
    helper: localStorage.getItem(STORAGE.helper) || defaultHelper,
  };

  if (stdinEl) stdinEl.value = localStorage.getItem(STORAGE.stdin) || "";

  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: files[activeTab],
    language: "java",
    theme: "vs-dark",
    fontSize: 14,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  });

  function setActiveTab(tab) {
    activeTab = tab;
    localStorage.setItem(STORAGE.tab, tab);

    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add("active");

    editor.setValue(files[tab]);
    setChip("Готов", "");
  }

  editor.onDidChangeModelContent(() => {
    files[activeTab] = editor.getValue();
    localStorage.setItem(
      activeTab === "main" ? STORAGE.main : STORAGE.helper,
      files[activeTab]
    );
  });

  stdinEl?.addEventListener("input", () => {
    localStorage.setItem(STORAGE.stdin, stdinEl.value || "");
  });

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  setActiveTab(activeTab);

  clearOutBtn?.addEventListener("click", () => setOutput(""));

  sampleBtn?.addEventListener("click", () => {
    if (stdinEl) stdinEl.value = "5\n10 20 30 40 50\n";
    localStorage.setItem(STORAGE.stdin, stdinEl?.value || "");

    const sample = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;
        for (int i = 0; i < n; i++) {
            sum += sc.nextInt();
        }
        System.out.println("Sum=" + sum);
    }
}`;

    files.main = sample;
    localStorage.setItem(STORAGE.main, sample);
    setActiveTab("main");
    setOutput("Вставил пример. Нажми ▶ Запустить.");
  });

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.getValue());
      copyBtn.textContent = "✅ Скопировано";
      setTimeout(() => (copyBtn.textContent = "Скопировать"), 1100);
    } catch {
      alert("Не получилось скопировать. Попробуй Ctrl+C.");
    }
  });

  clearBtn?.addEventListener("click", () => {
    if (!confirm("Очистить весь код (Main.java и Helper.java) и stdin?")) return;

    files.main = "";
    files.helper = "";
    localStorage.setItem(STORAGE.main, "");
    localStorage.setItem(STORAGE.helper, "");
    if (stdinEl) stdinEl.value = "";
    localStorage.setItem(STORAGE.stdin, "");

    setActiveTab("main");
    setOutput("");
    setChip("Очищено", "");
  });

  async function run() {
    const mainCode = localStorage.getItem(STORAGE.main) || editor.getValue();
    const stdin = stdinEl?.value || "";

    runBtn.disabled = true;
    runBtn.classList.add("is-loading");
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
        body: JSON.stringify({ code: mainCode, stdin }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const rawText = await res.text();
        setChip("Ошибка", "err");
        setOutput("❌ Сервер вернул не JSON.\n\n" + rawText.slice(0, 700));
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
      } else {
        setChip("Готово", "ok");
        const text =
          (out ? `STDOUT:\n${out}\n\n` : `STDOUT: (пусто)\n\n`) +
          (err ? `STDERR:\n${err}\n` : `STDERR: (пусто)\n`);
        setOutput(text);
      }
    } catch (e) {
      setChip("Ошибка", "err");
      setOutput("❌ Ошибка запроса: " + e);
    } finally {
      runBtn.disabled = false;
      runBtn.classList.remove("is-loading");
    }
  }

  runBtn?.addEventListener("click", run);

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });
});


if (window.lucide) {
  lucide.createIcons();
}