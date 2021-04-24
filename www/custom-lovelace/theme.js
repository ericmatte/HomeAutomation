const setBackground = () => {
  const haAppLayout = document
    ?.querySelector("home-assistant")
    ?.shadowRoot.querySelector("home-assistant-main")
    ?.shadowRoot.querySelector("ha-panel-lovelace")
    ?.shadowRoot.querySelector("hui-root")
    ?.shadowRoot.querySelector("ha-app-layout");

  console.log("setBackground", { haAppLayout });

  if (haAppLayout) {
    haAppLayout.style.background = "var(--background-image)";
    haAppLayout.querySelector("hui-view").style.background = "none";
  }
};

setBackground();
