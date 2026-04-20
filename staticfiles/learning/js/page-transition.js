document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.remove("page-leaving");
  document.body.classList.remove("page-enter");

  const links = document.querySelectorAll('a[href]');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        link.hasAttribute("target") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const url = new URL(link.href, window.location.origin);

      if (url.origin !== window.location.origin) return;

      e.preventDefault();

      document.body.classList.add("page-leaving");

      setTimeout(() => {
        window.location.href = url.href;
      }, 260);
    });
  });
});