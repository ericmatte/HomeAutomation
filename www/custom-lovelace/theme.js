const setBackground = () => {
  // Not working right now
  const haAppLayout = document
    .querySelector("home-assistant")
    ?.shadowRoot.querySelector("home-assistant-main")
    ?.shadowRoot.querySelector("ha-panel-lovelace")
    ?.shadowRoot.querySelector("hui-root")
    ?.shadowRoot.querySelector("ha-app-layout");

  if (haAppLayout) {
    haAppLayout.style.background = "var(--background-image)";
    const huiView = haAppLayout.querySelector("hui-view");
    console.log(huiView);
    if (huiView) {
    }
  }
};

setBackground();
