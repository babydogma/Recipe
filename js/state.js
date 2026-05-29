/* Portionly state/localStorage ownership map.
   Runtime is bundled in js/app.js for static GitHub Pages loading. */
window.PortionlyModuleMap = window.PortionlyModuleMap || {};
window.PortionlyModuleMap.state = {
  storageKeys: [
    "portionly:selected:v14",
    "portionly:notes:v14",
    "portionly:recipe-settings:v14",
    "portionly:favorites:v16",
    "portionly:dish-pantry:v48",
    "portionly:cooked-history:v1"
  ],
  responsibilities: ["state", "localStorage", "history", "favorites", "ratings"]
};
