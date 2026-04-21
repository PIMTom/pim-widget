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
  function compute(price, instalments) {
    const monthly = instalments > 0 ? price / instalments : price;
    return { monthly, instalments };
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
        background: #f0ecfd;
        border: 1px solid #c4b2f7;
        border-radius: 12px;
        padding: 12px 12px 12px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        user-select: none;
        box-shadow: 0px 30px 50px -40px rgba(0,0,0,0.03), 0px 50px 90px -30px rgba(0,0,0,0.1);
        max-width: 632px;
      }
      .${uid}-banner-left-group {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .${uid}-banner-icon {
        width: 52px;
        height: 52px;
        flex-shrink: 0;
        position: relative;
        overflow: visible;
      }
      .${uid}-banner-icon img {
        display: block;
        position: absolute;
        top: -10%;
        left: -15%;
        right: -15%;
        bottom: -20%;
        width: 130%;
        height: 130%;
        object-fit: contain;
      }
      .${uid}-banner-left {
        display: flex;
        flex-direction: column;
        gap: 6px;
        letter-spacing: 0.2px;
      }
      .${uid}-banner-text-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .${uid}-banner-left .sub  { font-size: 14px; font-weight: 400; color: #506978; line-height: 20px; }
      .${uid}-banner-left .amt  { font-size: 16px; font-weight: 700; color: #101111; line-height: 22px; }
      .${uid}-banner-left .link { font-size: 12px; font-weight: 700; color: #875fc8; text-decoration: underline; line-height: normal; }
      .${uid}-logo-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .${uid}-logo-badge img {
        display: block;
        width: 180px;
        height: 70px;
        object-fit: contain;
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
        border-radius: 20px;
        overflow: hidden;
        width: 100%;
        max-width: 760px;
        display: flex;
        flex-direction: row;
        font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 4px 60px rgba(0,0,0,.13);
        position: relative;
        background: ${color};
      }

      /* ── Close button ── */
      .${uid}-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 26px;
        height: 26px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .${uid}-close:hover { opacity: 0.7; }
      .${uid}-close svg { display: block; }

      /* ── Left panel ── */
.${uid}-modal-left {
  width: 330px;
  min-width: 330px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: ${color} !important;
}
      .${uid}-left-body {
        background: ${color};
        flex: 1;
        padding: 24px 22px 0 28px;
        position: relative;
        overflow: hidden;
        min-height: 350px;
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
        margin-bottom: 18px;
        position: relative;
        z-index: 1;
        width: 164px;
        height: 31px;
        flex-shrink: 0;
      }
      .${uid}-left-logo img { width: 100%; height: 100%; display: block; object-fit: contain; object-position: left center; }
      .${uid}-left-badges {
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .${uid}-left-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-size: 18px;
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0.2px;
      }
      .${uid}-badge-icon {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: block;
        margin-left: -4px;
      }
      .${uid}-badge-icon svg { display: block; }
      .${uid}-left-plant {
        position: absolute;
        width: 150px; height: 225px;
        left: 14px; bottom: -45px;
        object-fit: contain; pointer-events: none;
        z-index: 1;
      }
      .${uid}-left-character {
        position: absolute;
        width: 230px; height: 230px;
        left: calc(50% + 22px);
        bottom: -6px;
        transform: translateX(-50%);
        object-fit: contain; pointer-events: none;
        z-index: 2;
      }
      /* ── Right panel ── */
      .${uid}-modal-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0;
        min-width: 0;
        background: #fff;
      }
      .${uid}-right-sliders {
        padding: 22px 22px 0;
      }
      .${uid}-right-sliders h3 {
        font-size: 16px; font-weight: 700; line-height: 22px;
        letter-spacing: 0.2px; color: #101111; margin: 0 0 14px;
      }
      .${uid}-slider-block { margin-bottom: 10px; }
      .${uid}-slider-block:last-child { margin-bottom: 0; }
      .${uid}-slider-block label {
        display: block;
        font-size: 16px; font-weight: 600; line-height: 22px;
        letter-spacing: 0.2px; color: #506978; margin-bottom: 2px;
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
      .${uid}-divider { display: none; }

      /* ── Stats section ── */
      .${uid}-right-stats {
        flex: 1;
        padding: 8px 22px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .${uid}-right-cards {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .${uid}-info-box {
        background: #f1ecfd;
        border: 1px solid #e3d7ff;
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        color: #875fc8;
        font-size: 16px;
        font-weight: 400;
        line-height: 22px;
      }
      .${uid}-info-box svg { flex-shrink: 0; margin-top: 1px; }
      .${uid}-legal {
        font-size: 12px;
        line-height: 20px;
        color: #617481;
        font-weight: 400;
        letter-spacing: 0.1px;
        margin: 0;
        opacity: 0.9;
      }
      .${uid}-trustpilot-bar {
        background: #604291;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .${uid}-trustpilot-bar img {
        height: 28px;
        width: auto;
        display: block;
      }
      .${uid}-stat-rows {
        display: flex;
        flex-direction: column;
        gap: 10px;
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
        font-size: 17px; font-weight: 700; line-height: 23px;
        letter-spacing: 0.2px; color: #101111;
      }
      .${uid}-instalment-box {
        background: #fff;
        border: 1px solid #e7ebfa;
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        box-shadow: 0px 6px 16px 0px rgba(0,0,0,0.03);
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
        .${uid}-modal {
          flex-direction: column;
          max-width: 420px;
          max-height: 90dvh;
          overflow-y: auto;
        }
        .${uid}-modal-left { width: 100%; min-width: unset; }
        .${uid}-left-body { min-height: 120px; padding-bottom: 16px; }
        .${uid}-left-character { display: none; }
        .${uid}-left-plant { display: none; }
        .${uid}-logo-badge { display: none; }
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
    const _initInst = Math.min(12, config.maxInstalments);
    const _initMonthly = compute(config.price, _initInst).monthly;
    banner.innerHTML = `
      <div class="${uid}-banner-left-group">
        <div class="${uid}-banner-icon">
          <img src="https://storage.googleapis.com/payitmonthly_public_assets/images/Group 2131328595.png" alt="" />
        </div>
        <div class="${uid}-banner-left">
          <div class="${uid}-banner-text-group">
            <div class="sub">Buy Now. Pay Monthly</div>
            <div class="amt" id="${uid}-b-amt">${_initInst} x ${fmt(_initMonthly)}</div>
          </div>
          <div class="link">Find out more</div>
        </div>
      </div>
      <div class="${uid}-logo-badge">
        <img src="https://storage.googleapis.com/payitmonthly_public_assets/images/Logo (1).png" alt="payitmonthly" />
      </div>
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
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4l8 8" stroke="#617481" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Left panel -->
        <div class="${uid}-modal-left">
          <div class="${uid}-left-body">
            <!-- Decorative background swirls -->
            <div class="${uid}-left-swirl-1"><img src="https://storage.googleapis.com/payitmonthly_public_assets/images/swirl-1.svg" alt="" /></div>
            <div class="${uid}-left-swirl-2"><img src="https://storage.googleapis.com/payitmonthly_public_assets/images/swirl-2.svg" alt="" /></div>
            <div class="${uid}-left-logo">
              <img src="https://storage.googleapis.com/payitmonthly_public_assets/images/logo.svg" alt="payitmonthly" />
            </div>
            <div class="${uid}-left-badges">
              <div class="${uid}-left-badge">
                <img class="${uid}-badge-icon" src="https://storage.googleapis.com/payitmonthly_public_assets/images/interest.png" alt="" />
                Interest-free
              </div>
              <div class="${uid}-left-badge">
                <img class="${uid}-badge-icon" src="https://storage.googleapis.com/payitmonthly_public_assets/images/rapid_decision_bolt.png" alt="" />
                Rapid decision
              </div>
            </div>
            <img class="${uid}-left-plant" src="https://storage.googleapis.com/payitmonthly_public_assets/images/plant.png" alt="" />
            <!-- Character sits at bottom of purple panel, clipped by overflow:hidden -->
            <img class="${uid}-left-character" src="https://storage.googleapis.com/payitmonthly_public_assets/images/character.png" alt="" />
          </div>
          <div class="${uid}-trustpilot-bar">
            <img src="https://storage.googleapis.com/payitmonthly_public_assets/images/trustpilot.png" alt="Trustpilot 5 stars" />
          </div>
        </div>

        <!-- Right panel -->
        <div class="${uid}-modal-right">
          <div class="${uid}-right-sliders">
            <h3>Payment Calculator</h3>

            <div class="${uid}-slider-block">
              <label for="${uid}-inst-slider">Number of monthly instalments</label>
              <input type="range" id="${uid}-inst-slider" min="2" max="${config.maxInstalments}" step="1" value="${Math.min(12, config.maxInstalments)}">
            </div>
          </div>

          <div class="${uid}-right-stats">
            <div class="${uid}-stat-rows">
              <div class="${uid}-stat-row">
                <span class="stat-label">Total instalments</span>
                <span class="stat-value" id="${uid}-m-inst"></span>
              </div>
              <div class="${uid}-stat-row">
                <span class="stat-label">Total repayable</span>
                <span class="stat-value" id="${uid}-m-total"></span>
              </div>
            </div>
            <div class="${uid}-right-cards">
            <div class="${uid}-instalment-box">
              <span class="box-label">Monthly payments</span>
              <span class="box-value" id="${uid}-m-monthly"></span>
            </div>
            <div class="${uid}-info-box">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" stroke="#875fc8" stroke-width="1.5"/><path d="M9 8.25V12.75M9 5.25V6.25" stroke="#875fc8" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>To select this plan go to Checkout, and select PayItMonthly in the Payment section.</span>
            </div>
            <p class="${uid}-legal">PayItMonthly is unregulated credit. 18+, UK only. Credit subject to status. Late or missed payments may impact your ability to get credit in future. T&amp;Cs apply see payitmonthly.uk/terms</p>
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
    if (!instSlider) return;
    const inst = parseInt(instSlider.value);
    const { monthly } = compute(config.price, inst);
    el.textContent = inst + " x " + fmt(monthly);
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
    if (!instSlider) return;

    const instalments = parseInt(instSlider.value);
    const { monthly } = compute(config.price, instalments);

    document.getElementById(`${uid}-m-total`).textContent = fmt(config.price);
    document.getElementById(`${uid}-m-inst`).textContent = instalments;
    document.getElementById(`${uid}-m-monthly`).textContent =
      instalments + " × " + fmt(monthly);

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
