  document.addEventListener("DOMContentLoaded", () => {
    createFloatingSymbols();
    createCodeRain();
  });

  function createFloatingSymbols() {
    const container = document.querySelector(".floating-symbols");
    if (!container) return;

    const symbols = [
      "class",
      "public",
      "static",
      "void",
      "int",
      "String",
      "boolean",
      "new",
      "return",
      "if",
      "else",
      "for",
      "while",
      "{}",
      "()",
      "[]",
      "System.out.println();",
      "Scanner",
      "import",
      "extends",
      "implements"
    ];

    const amount = 22;

    for (let i = 0; i < amount; i++) {
      const item = document.createElement("span");
      item.className = "floating-symbol";
      item.textContent = symbols[Math.floor(Math.random() * symbols.length)];

      const left = Math.random() * 100;
      const delay = Math.random() * 12;
      const duration = 12 + Math.random() * 18;
      const size = 12 + Math.random() * 14;
      const opacity = 0.08 + Math.random() * 0.16;

      item.style.left = `${left}%`;
      item.style.animationDelay = `${delay}s`;
      item.style.animationDuration = `${duration}s`;
      item.style.fontSize = `${size}px`;
      item.style.opacity = opacity.toFixed(2);

      container.appendChild(item);
    }
  }

  function createCodeRain() {
    const container = document.querySelector(".code-rain");
    if (!container) return;

    const lines = [
      "public class Main {",
      "public static void main(String[] args) {",
      'System.out.println("Hello, Java!");',
      "int number = 10;",
      "String text = \"Java Learning\";",
      "for (int i = 0; i < 5; i++) {",
      "if (userProgress > 80) {",
      "return result;",
      "}",
      "}"
    ];

    const columns = 10;

    for (let i = 0; i < columns; i++) {
      const col = document.createElement("div");
      col.className = "code-rain__col";

      const lineCount = 5 + Math.floor(Math.random() * 5);

      for (let j = 0; j < lineCount; j++) {
        const line = document.createElement("div");
        line.className = "code-rain__line";
        line.textContent = lines[Math.floor(Math.random() * lines.length)];
        col.appendChild(line);
      }

      col.style.left = `${i * 10}%`;
      col.style.animationDelay = `${Math.random() * 8}s`;
      col.style.animationDuration = `${20 + Math.random() * 14}s`;

      container.appendChild(col);
    }
  }