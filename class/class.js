(function () {
  "use strict";

  const config = window.KMT_CLASS_CONFIG || {};
  const appName = document.querySelector("[data-app-name]");
  const version = document.querySelector("[data-version]");
  const stage = document.querySelector("[data-stage]");
  const homeLink = document.querySelector("[data-home-link]");

  if (appName) appName.textContent = config.appName || "계명태권도 CLASS SYSTEM";
  if (version) version.textContent = `CLASS v${config.version || "0.4.0"}`;
  if (stage) stage.textContent = config.stage || "WORK 8차 · 문자 발송대기 시스템";
  if (homeLink) homeLink.href = config.homeUrl || "../";

  document.documentElement.dataset.classReady = "true";
})();
