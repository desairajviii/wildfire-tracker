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
  // TODO:
  // 1. Find #site-nav; return if the page doesn't have one.
  // 2. For each NAV_LINKS entry, create a real <a> element (rubric: standard HTML
  //    elements, no clickable divs) and set its text with textContent, not innerHTML.
  // 3. Add aria-current="page" to the link whose href matches the current page
  //    (location.pathname); style that in the base CSS so the user sees where they are.
}

renderNav();
