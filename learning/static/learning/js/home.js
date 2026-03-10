document.addEventListener("DOMContentLoaded", () => {
  const fill = document.getElementById("homeProgressFill");
  const text = document.getElementById("homeProgressText");

  if (!fill || !text) return;

  const percent = parseFloat(fill.style.width) || 0;
  fill.style.width = percent + "%";

  const codeElement = document.getElementById("typingCode");
  const outputElement = document.getElementById("typingOutput");

  if (!codeElement) return;

  const codeText = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;

  let i = 0;

  function typeCode() {
    if (i < codeText.length) {
      codeElement.textContent += codeText.charAt(i);
      i++;
      setTimeout(typeCode, 80);
    } else {
      setTimeout(() => {
        outputElement.textContent = "Hello, World!";
      }, 500);
    }
  }

  typeCode();
});