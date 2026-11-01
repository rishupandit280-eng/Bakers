/* ============================================================
   Shared helpers: formatting, WhatsApp, toasts, motion init.
   ============================================================ */

/* ---- formatting & safety ---- */
function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function waLink(number, text) {
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(text);
}

/* ---- toast ---- */
function toast(msg, type) {
  let wrap = document.getElementById("toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const t = document.createElement("div");
  t.className = "toast " + (type || "");
  t.innerHTML = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 350);
  }, 2600);
}

/* ---- smooth scroll (Lenis, graceful fallback) ---- */
function initSmoothScroll() {
  if (typeof window.Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__lenis = lenis;
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    // keep GSAP ScrollTrigger in sync
    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", window.ScrollTrigger.update);
    }
  }
}

/* ---- scroll reveal (IntersectionObserver) ---- */
function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    els.forEach(e => e.classList.add("revealed"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add("revealed");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((e, i) => {
    e.style.transitionDelay = (parseInt(e.dataset.delay || "0", 10)) + "ms";
    io.observe(e);
  });
}

/* ---- ripple on buttons ---- */
function initRipple() {
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const r = document.createElement("span");
    r.className = "ripple";
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + "px";
    r.style.left = (e.clientX - rect.left - size / 2) + "px";
    r.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });
}

/* ---- fly-to-cart particle ---- */
function flyToCart(fromEl) {
  if (!fromEl) return;
  const target = document.getElementById("cart-fab") || document.querySelector(".cart-fab");
  if (!target) return;
  const r1 = fromEl.getBoundingClientRect();
  const r2 = target.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.className = "fly-dot";
  dot.style.left = r1.left + r1.width / 2 + "px";
  dot.style.top = r1.top + r1.height / 2 + "px";
  document.body.appendChild(dot);
  requestAnimationFrame(() => {
    dot.style.transform = "translate(" + (r2.left + r2.width / 2 - (r1.left + r1.width / 2)) + "px," +
      (r2.top + r2.height / 2 - (r1.top + r1.height / 2)) + "px) scale(0.3)";
  });
  setTimeout(() => {
    dot.remove();
    const badge = target.querySelector(".cart-count");
    if (badge) badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
  }, 550);
}

/* ---- boot shared motion (called by every page) ---- */
document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  initReveal();
  initRipple();
});
