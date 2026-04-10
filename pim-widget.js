(function () {
  "use strict";

  // 1. Try to find the script tag by its source name
  // 2. If that fails, just use the first script tag it finds as a backup
  const script =
    document.querySelector('script[src*="pim-widget"]') ||
    document.currentScript;

  const config = {
    price: parseFloat(script?.dataset?.pimPrice || 2985),
    maxInstalments: parseInt(script?.dataset?.pimMaxInstalments || 24),
    color: script?.dataset?.pimColor || "#875fc8",
    minPrice: parseFloat(script?.dataset?.pimMinPrice || 500),
    maxPrice: parseFloat(script?.dataset?.pimMaxPrice || 5000),
  };

  console.log("Widget Config Loaded:", config); // This will show in your Edge Console (F12)
  /* ── Helpers ── */
  const fmt = (n) =>
    "£" +
    Number(n).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  function shade(hex, pct) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + ((pct * 2.55) | 0)));
    const g = Math.min(
      255,
      Math.max(0, ((num >> 8) & 0xff) + ((pct * 2.55) | 0)),
    );
    const b = Math.min(255, Math.max(0, (num & 0xff) + ((pct * 2.55) | 0)));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  /* ── Unique ID so multiple instances don't clash ── */
  const uid = "pim_" + Math.random().toString(36).slice(2, 8);

  /* ── Compute payment plan ── */
  function compute(price, depositPct, instalments) {
    const deposit = price * (depositPct / 100);
    const remaining = price - deposit;
    const remInstalments = instalments - 1;
    const monthly = remInstalments > 0 ? remaining / remInstalments : remaining;
    return { deposit, monthly, remInstalments };
  }

  /* ── Inject CSS (once per page) ── */
  function injectStyles(color) {
    const id = "pim-styles-" + uid;
    if (document.getElementById(id)) return;

    const dark = shade(color, -20);

    // Load Nunito Sans (variable) + General Sans Variable (once per page)
    if (!document.getElementById("pim-nunito-font")) {
      const link = document.createElement("link");
      link.id = "pim-nunito-font";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap";
      document.head.appendChild(link);
    }
    if (!document.getElementById("pim-general-sans-font")) {
      const link = document.createElement("link");
      link.id = "pim-general-sans-font";
      link.rel = "stylesheet";
      link.href =
        "https://api.fontshare.com/v2/css?f[]=general-sans@1,2,3,4,5,6,7&display=swap";
      document.head.appendChild(link);
    }

    const css = `
      /* ── Banner ── */
      .${uid}-banner {
        background: ${color};
        border-radius: 10px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        user-select: none;
      }
      .${uid}-banner-left .sub  { font-size: 11px; color: rgba(255,255,255,.75); }
      .${uid}-banner-left .amt  { font-size: 17px; font-weight: 700; color: #fff; margin: 2px 0; }
      .${uid}-banner-left .link { font-size: 11px; color: rgba(255,255,255,.85); text-decoration: underline; }
      .${uid}-badge {
        background: rgba(255,255,255,.18);
        border-radius: 7px;
        padding: 5px 10px;
        font-size: 11px;
        color: #fff;
        white-space: nowrap;
        flex-shrink: 0;
      }

      /* ── Overlay ── */
      .${uid}-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        z-index: 99999;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .${uid}-overlay.open { display: flex; }

      /* ── Modal shell (two-panel) ── */
      .${uid}-modal {
        background: #fff;
        border-radius: 20px;
        overflow: hidden;
        width: 100%;
        max-width: 740px;
        display: flex;
        flex-direction: row;
        font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 4px 60px rgba(0,0,0,.13);
        position: relative;
      }

      /* ── Close button ── */
      .${uid}-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 28px;
        height: 28px;
        background: rgba(255,255,255,.18);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        padding: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .${uid}-close:hover { background: rgba(255,255,255,.32); }
      .${uid}-close svg { display: block; }

      /* ── Left panel ── */
.${uid}-modal-left {
  width: 370px;
  min-width: 370px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
      .${uid}-left-body {
        background: ${color};
        flex: 1;
        padding: 36px 28px 0;
        position: relative;
        overflow: hidden;
        min-height: 300px;
      }
      /* Decorative swirl backgrounds */
      .${uid}-left-swirl-1 {
        position: absolute;
        top: -91.63%; right: -20.06%; bottom: -5.27%; left: 76.98%;
        opacity: 0.18;
        pointer-events: none;
        transform: rotate(180deg);
      }
      .${uid}-left-swirl-2 {
        position: absolute;
        top: -30.48%; right: 87.91%; bottom: -66.42%; left: -30.87%;
        opacity: 0.18;
        pointer-events: none;
      }
      .${uid}-left-swirl-1 img,
      .${uid}-left-swirl-2 img {
        display: block; width: 100%; height: 100%; object-fit: fill;
      }
      .${uid}-left-logo {
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
        width: 164px;
        height: 31px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .${uid}-left-logo img { width: 100%; height: 100%; display: block; object-fit: contain; object-position: left center; }
      .${uid}-left-text {
        color: #fff;
        width: 100%;
        position: relative;
        z-index: 1;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .${uid}-left-text .tagline {
        font-size: 16px; font-weight: 600; line-height: 22px;
        letter-spacing: 0.2px; margin: 0 0 6px;
        font-variation-settings: 'YTLC' 500, 'wdth' 100;
      }
      .${uid}-left-text .heading {
        font-family: 'General Sans Variable', 'General Sans', sans-serif;
        font-size: 22px; font-weight: 560; line-height: 30px;
        letter-spacing: 0.2px; margin: 0 0 3px;
        font-variation-settings: 'wght' 560;
      }
      .${uid}-left-text .subtext {
        font-size: 14px; font-weight: 400; line-height: 20px;
        letter-spacing: 0.2px; opacity: 0.7; margin: 0;
        font-variation-settings: 'YTLC' 500, 'wdth' 100;
      }
      .${uid}-left-plant {
        position: absolute;
        width: 172px; height: 258px;
        left: 32px; bottom: -110px;
        object-fit: contain; pointer-events: none;
        z-index: 1;
      }
      .${uid}-left-character {
        position: absolute;
        width: 237px; height: 237px;
        left: calc(50% + 20px);
        bottom: -18px;
        transform: translateX(-50%);
        object-fit: contain; pointer-events: none;
        z-index: 2;
      }
      .${uid}-total-bar {
        background: var(--Purple-70, #604291);
        box-shadow: 0 2px 22px 0 rgba(0, 0, 0, 0.05);
        padding: 20px 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #fff;
        position: relative;
        z-index: 3;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .${uid}-total-bar .label {
        font-size: 16px; font-weight: 500; line-height: 22px;
        font-variation-settings: 'YTLC' 500, 'wdth' 100;
      }
      .${uid}-total-bar .amount {
        font-size: 18px; font-weight: 700; line-height: 24px; letter-spacing: 0.2px;
        font-variation-settings: 'YTLC' 500, 'wdth' 100;
      }

      /* ── Right panel ── */
      .${uid}-modal-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
        background: #fff;
      }
      .${uid}-right-sliders {
        padding: 36px 26px 0;
      }
      .${uid}-right-sliders h3 {
        font-size: 18px; font-weight: 700; line-height: 24px;
        letter-spacing: 0.2px; color: #101111; margin: 0 0 20px;
      }
      .${uid}-slider-block { margin-bottom: 14px; }
      .${uid}-slider-block:last-child { margin-bottom: 0; }
      .${uid}-slider-block label {
        display: block;
        font-size: 16px; font-weight: 600; line-height: 22px;
        letter-spacing: 0.2px; color: #506978; margin-bottom: 6px;
      }
      .${uid}-slider-block input[type=range] {
        -webkit-appearance: none; appearance: none;
        width: 100%; height: 6px;
        border-radius: 60px;
        outline: none; cursor: pointer;
        box-shadow: 0 0 0 1px #e7ebfa;
        /* background gradient set dynamically via JS */
      }
      .${uid}-slider-block input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 22px; height: 22px; border-radius: 50%; border: none;
        background: ${color};
        box-shadow: 0 1px 4px rgba(0,0,0,.25);
        cursor: pointer;
      }
      .${uid}-slider-block input[type=range]::-moz-range-thumb {
        width: 22px; height: 22px; border-radius: 50%; border: none;
        background: ${color};
        box-shadow: 0 1px 4px rgba(0,0,0,.25);
        cursor: pointer;
      }

      /* ── Divider ── */
      .${uid}-divider {
        height: 32px;
        width: 100%;
        flex-shrink: 0;
      }
      .${uid}-divider img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: fill;
      }

      /* ── Stats section ── */
      .${uid}-right-stats {
        padding: 0 26px 36px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .${uid}-stat-rows {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .${uid}-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .${uid}-stat-row .stat-label {
        font-size: 16px; font-weight: 400; line-height: 22px;
        letter-spacing: 0.2px; color: #617481;
      }
      .${uid}-stat-row .stat-value {
        font-size: 18px; font-weight: 700; line-height: 24px;
        letter-spacing: 0.2px; color: #101111;
      }
      .${uid}-instalment-box {
        background: #f0f3fc;
        border: 1px solid #e7ebfa;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .${uid}-instalment-box .box-label {
        font-size: 16px; font-weight: 400; line-height: 22px;
        letter-spacing: 0.2px; color: #506978;
      }
      .${uid}-instalment-box .box-value {
        font-size: 18px; font-weight: 700; line-height: 24px;
        letter-spacing: 0.2px; color: #101111;
      }

      /* ── Mobile: stack panels ── */
      @media (max-width: 600px) {
        .${uid}-modal { flex-direction: column; max-width: 400px; }
        .${uid}-modal-left { width: 100%; min-width: unset; }
        .${uid}-left-body { min-height: 240px; }
        .${uid}-left-character { width: 180px; height: 180px; }
      }
    `;

    // legacy — kept so nothing below references missing vars
    const darker = shade(color, -40);
    void darker;
    const light = shade(color, 88);
    void light;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Build DOM ── */
  function buildWidget() {
    injectStyles(config.color);

    /* ─ Banner ─ */
    const banner = document.createElement("div");
    banner.className = `${uid}-banner`;
    banner.setAttribute("role", "button");
    banner.setAttribute("tabindex", "0");
    banner.setAttribute("aria-haspopup", "dialog");
    banner.setAttribute("aria-label", "View interest free finance options");
    banner.innerHTML = `
      <div class="${uid}-banner-left">
        <div class="sub">Interest Free Finance from</div>
        <div class="amt" id="${uid}-b-amt">calculating…</div>
        <div class="link">Find out more</div>
      </div>
      <div class="${uid}-badge">payitmonthly</div>
    `;

    /* ─ Overlay + Modal ─ */
    const overlay = document.createElement("div");
    overlay.className = `${uid}-overlay`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Payment plan details");
    overlay.innerHTML = `
      <div class="${uid}-modal">

        <!-- Close button: top-right of whole modal -->
        <button class="${uid}-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4l8 8" stroke="#e3e3e3" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Left panel -->
        <div class="${uid}-modal-left">
          <div class="${uid}-left-body">
            <!-- Decorative background swirls -->
            <div class="${uid}-left-swirl-1"><img src="images/swirl-1.svg" alt="" /></div>
            <div class="${uid}-left-swirl-2"><img src="images/swirl-2.svg" alt="" /></div>
            <div class="${uid}-left-logo">
              <img src="images/logo.svg" alt="payitmonthly" />
            </div>
            <div class="${uid}-left-text">
              <p class="tagline">Spread the cost of your purchase</p>
              <p class="heading">0% Interest</p>
              <p class="subtext">Orders between £${Math.round(config.minPrice).toLocaleString("en-GB")} and £${Math.round(config.maxPrice).toLocaleString("en-GB")}</p>
            </div>
            <img class="${uid}-left-plant" src="images/plant.png" alt="" />
            <!-- Character sits at bottom of purple panel, clipped by overflow:hidden -->
            <img class="${uid}-left-character" src="images/character.png" alt="" />
          </div>
          <div class="${uid}-total-bar">
            <span class="label">Total Cost of Item:</span>
            <span class="amount" id="${uid}-m-total"></span>
          </div>
        </div>

        <!-- Right panel -->
        <div class="${uid}-modal-right">
          <div class="${uid}-right-sliders">
            <h3>Possible Payment Plan</h3>

            <div class="${uid}-slider-block">
              <label for="${uid}-dep-slider">Choose today's payment</label>
              <input type="range" id="${uid}-dep-slider" min="0" max="100" step="1" value="50">
            </div>

            <div class="${uid}-slider-block">
              <label for="${uid}-inst-slider">Choose instalments number</label>
              <input type="range" id="${uid}-inst-slider" min="2" max="${config.maxInstalments}" step="1" value="${Math.min(12, config.maxInstalments)}">
            </div>
          </div>

          <div class="${uid}-divider"><img src="images/divider.svg" alt="" /></div>

          <div class="${uid}-right-stats">
            <div class="${uid}-stat-rows">
              <div class="${uid}-stat-row">
                <span class="stat-label">Instalments</span>
                <span class="stat-value" id="${uid}-m-inst"></span>
              </div>
              <div class="${uid}-stat-row">
                <span class="stat-label">Today's payment</span>
                <span class="stat-value" id="${uid}-m-dep"></span>
              </div>
            </div>
            <div class="${uid}-instalment-box">
              <span class="box-label">Instalment Amount</span>
              <span class="box-value" id="${uid}-m-monthly"></span>
            </div>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    /* ─ Wire up events ─ */
    const open = () => {
      overlay.classList.add("open");
      updateModal();
    };
    const close = () => overlay.classList.remove("open");

    banner.addEventListener("click", open);
    banner.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open();
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector(`.${uid}-close`).addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    overlay
      .querySelector(`#${uid}-dep-slider`)
      .addEventListener("input", updateModal);
    overlay
      .querySelector(`#${uid}-inst-slider`)
      .addEventListener("input", updateModal);

    /* ─ Initial render ─ */
    updateBanner();
    updateModal();

    return banner;
  }

  /* ── Update banner text ── */
  function updateBanner() {
    const el = document.getElementById(`${uid}-b-amt`);
    if (!el) return;
    const instSlider = document.getElementById(`${uid}-inst-slider`);
    const depSlider = document.getElementById(`${uid}-dep-slider`);
    if (!instSlider || !depSlider) return;
    const { monthly } = compute(
      config.price,
      parseFloat(depSlider.value),
      parseInt(instSlider.value),
    );
    el.textContent = fmt(monthly) + " per month";
  }

  /* ── Slider two-tone fill ── */
  function updateSliderFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, ${config.color} ${pct}%, #f0f3fc ${pct}%)`;
  }

  /* ── Update modal stats ── */
  function updateModal() {
    const instSlider = document.getElementById(`${uid}-inst-slider`);
    const depSlider = document.getElementById(`${uid}-dep-slider`);
    if (!instSlider || !depSlider) return;

    const instalments = parseInt(instSlider.value);
    const depPct = parseFloat(depSlider.value);
    const { deposit, monthly, remInstalments } = compute(
      config.price,
      depPct,
      instalments,
    );

    document.getElementById(`${uid}-m-total`).textContent = fmt(config.price);
    document.getElementById(`${uid}-m-inst`).textContent = instalments;
    document.getElementById(`${uid}-m-dep`).textContent = fmt(deposit);
    document.getElementById(`${uid}-m-monthly`).textContent =
      fmt(monthly) + " × " + remInstalments;

    updateSliderFill(depSlider);
    updateSliderFill(instSlider);
    updateBanner();
  }

  /* ── Find placeholder(s) or auto-append ── */
  function mount() {
    const placeholders = document.querySelectorAll("[data-acpim-widget]");

    if (placeholders.length > 0) {
      placeholders.forEach((el) => {
        const widget = buildWidget();
        el.replaceWith(widget);
      });
    } else {
      /* No placeholder — insert banner just before the script tag itself */
      const widget = buildWidget();
      script.parentNode.insertBefore(widget, script);
    }
  }

  /* ── Init ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
