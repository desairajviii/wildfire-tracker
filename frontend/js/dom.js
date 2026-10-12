// Small DOM helpers shared by several pages

export function makeButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

export function showError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

// Link to a fire's detail page
export function makeFireLink(fire) {
  const link = document.createElement("a");
  link.href = `fire.html?id=${encodeURIComponent(fire._id)}`;
  link.textContent = fire.name;
  return link;
}
