// Shared setup for every page: the site nav, written once here instead of in each HTML file.
// Each page loads it alongside its own module:
//   <script type="module" src="js/main.js"></script>
// and has an empty <nav id="site-nav"></nav> where the links go.

// Pages in the nav. File names are placeholders until the HTML pages exist.
// Fire detail and the shared evacuation plan are reached by links, not the nav.
const NAV_LINKS = [
  { href: "index.html", label: "Fires" },
  { href: "watchlists.html", label: "Watchlists" },
  { href: "trip-plans.html", label: "Trips" },
  { href: "evacuation-plans.html", label: "Evacuation plans" },
  { href: "instructions.html", label: "How to use" },
];

/**
 * Fills <nav id="site-nav"> with links and marks the current page.
 * Does nothing on pages without the nav element.
 */
function renderNav() {
  // 1. Find the nav; skip pages that don't have one
  const nav = document.getElementById("site-nav");
  if (!nav) {
    return;
  }

  // "/" means the home page, so treat it as index.html
  const currentPage = location.pathname.split("/").pop() || "index.html";

  // 2. Build a real list of real <a> links
  const list = document.createElement("ul");
  for (const { href, label } of NAV_LINKS) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;

    // 3. Mark the page the user is on
    if (href === currentPage) {
      link.setAttribute("aria-current", "page");
    }

    item.append(link);
    list.append(item);
  }
  nav.append(list);
}

renderNav();
