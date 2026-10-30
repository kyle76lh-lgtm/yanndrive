"use strict";

// Documented embed only: https://developers.google.com/waze/iframe
const LHdriveWaze = (() => {
  const view = document.getElementById("wazeView");
  const map = document.getElementById("wazeMap");
  const status = document.getElementById("wazeStatus");
  const locate = document.getElementById("wazeLocate");
  const expand = document.getElementById("wazeExpand");
  let center = { latitude: 49.4944, longitude: 0.1079 };
  let loaded = false;

  function load() {
    const params = new URLSearchParams({ zoom: "13", lat: String(center.latitude), lon: String(center.longitude) });
    map.src = `https://embed.waze.com/fr/iframe?${params}`;
    loaded = true;
  }

  function setExpanded(enabled) {
    view.classList.toggle("waze-expanded", enabled);
    document.body.classList.toggle("waze-expanded-page", enabled);
    expand.setAttribute("aria-pressed", String(enabled));
    expand.textContent = enabled ? "QUITTER LE PLEIN ÉCRAN" : "PLEIN ÉCRAN";
  }

  locate.addEventListener("click", () => {
    if (!navigator.geolocation) {
      status.textContent = "GPS indisponible dans ce navigateur. La carte reste consultable.";
      return;
    }
    locate.disabled = true;
    status.textContent = "Recherche de votre position…";
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      locate.disabled = false;
      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude) || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) {
        status.textContent = "Position GPS invalide. La carte conserve son centre.";
        return;
      }
      center = { latitude: coords.latitude, longitude: coords.longitude };
      load();
      status.textContent = "Carte recentrée sur votre position. Recentrage manuel avec MA POSITION.";
    }, (error) => {
      locate.disabled = false;
      status.textContent = error.code === 1
        ? "Accès GPS refusé. Autorisez la position dans le navigateur pour recentrer la carte."
        : "Position GPS indisponible. Réessayez ; la carte reste consultable.";
    }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 });
  });

  document.getElementById("wazeHome").addEventListener("click", () => {
    center = { latitude: 49.4944, longitude: 0.1079 };
    load();
    status.textContent = "Carte centrée sur Le Havre.";
  });
  document.getElementById("wazeReload").addEventListener("click", load);
  expand.addEventListener("click", () => setExpanded(!view.classList.contains("waze-expanded")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setExpanded(false);
  });

  return {
    setVisible(visible) {
      if (visible && !loaded) load();
      if (!visible) setExpanded(false);
    }
  };
})();
