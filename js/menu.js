/* ============================================================
   Menu page — render categories, search, cart steppers.
   ============================================================ */
(function () {
  const root = document.getElementById("menuRoot");
  const chipsRoot = document.getElementById("catChips");
  const searchInput = document.getElementById("searchInput");
  const noResults = document.getElementById("noResults");

  let activeCat = "all";

  /* ---- category chips ---- */
  function buildChips() {
    const all = document.createElement("button");
    all.className = "chip active";
    all.dataset.cat = "all";
    all.textContent = "🍽️ All";
    chipsRoot.appendChild(all);
    MENU.forEach(cat => {
      const b = document.createElement("button");
      b.className = "chip";
      b.dataset.cat = cat.id;
      b.innerHTML = cat.emoji + " " + esc(cat.name);
      chipsRoot.appendChild(b);
    });
  }

  /* ---- menu sections ---- */
  function buildMenu() {
    MENU.forEach(cat => {
      const sec = document.createElement("section");
      sec.className = "menu-section";
      sec.id = "cat-" + cat.id;
      sec.dataset.cat = cat.id;

      const head = document.createElement("div");
      head.className = "menu-section-head";
      head.innerHTML =
        '<div class="cat-emoji">' + cat.emoji + '</div>' +
        '<div><h2>' + esc(cat.name) + '</h2><p class="blurb">' + esc(cat.blurb) + '</p></div>';
      sec.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "items-grid";
      cat.items.forEach(it => {
        grid.appendChild(card(it));
      });
      sec.appendChild(grid);
      root.appendChild(sec);
    });
  }

  function card(it) {
    const el = document.createElement("div");
    el.className = "item-card";
    el.dataset.id = it.id;
    el.dataset.name = it.name.toLowerCase();
    el.innerHTML =
      '<div class="item-emoji">' + it.emoji + '</div>' +
      '<div class="item-info">' +
        '<div class="iname"><span class="veg-dot ' + (it.veg ? "veg" : "nonveg") + '"></span>' + esc(it.name) + '</div>' +
        '<div class="iprice">' + fmt(it.price) + '</div>' +
      '</div>' +
      '<div class="stepper">' +
        '<button class="dec" data-act="dec" aria-label="Remove">−</button>' +
        '<span class="qty">0</span>' +
        '<button class="inc" data-act="inc" aria-label="Add">+</button>' +
      '</div>';
    return el;
  }

  /* ---- update steppers from cart ---- */
  function refreshSteppers() {
    document.querySelectorAll(".stepper").forEach(st => {
      const id = st.closest(".item-card").dataset.id;
      const q = Cart.qtyOf(id);
      const qtyEl = st.querySelector(".qty");
      const dec = st.querySelector(".dec");
      qtyEl.textContent = q;
      qtyEl.style.visibility = q > 0 ? "visible" : "hidden";
      dec.disabled = q === 0;
    });
  }

  /* ---- filtering ---- */
  function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    let anyVisible = false;
    document.querySelectorAll(".menu-section").forEach(sec => {
      const catId = sec.dataset.cat;
      const matchesCat = activeCat === "all" || activeCat === catId;
      let visibleCards = 0;
      sec.querySelectorAll(".item-card").forEach(card => {
        const ok = matchesCat && (!term || card.dataset.name.indexOf(term) !== -1);
        card.style.display = ok ? "" : "none";
        if (ok) visibleCards++;
      });
      const show = visibleCards > 0;
      sec.style.display = show ? "" : "none";
      if (show) anyVisible = true;
    });
    noResults.style.display = anyVisible ? "none" : "block";
  }

  /* ---- scroll to category (respect Lenis) ---- */
  function scrollToSection(id) {
    if (id === "all") {
      const t = window.__lenis || window;
      if (window.__lenis) window.__lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById("cat-" + id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -120 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---- events ---- */
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest(".item-card");
    const id = card.dataset.id;
    if (btn.dataset.act === "inc") {
      const before = Cart.qtyOf(id);
      Cart.add(id, 1);
      if (before === 0) flyToCart(btn);
    } else {
      Cart.setQty(id, Cart.qtyOf(id) - 1);
    }
  });

  chipsRoot.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chipsRoot.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeCat = chip.dataset.cat;
    applyFilters();
    scrollToSection(activeCat);
  });

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 120);
  });

  document.addEventListener("cart:update", refreshSteppers);

  /* ---- boot ---- */
  buildChips();
  buildMenu();
  refreshSteppers();

  // cart badge in navbar
  function refreshBadge() {
    const el = document.getElementById("cartCount");
    const c = Cart.count();
    el.textContent = c;
    if (c > 0) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  document.addEventListener("cart:update", refreshBadge);
  refreshBadge();
})();
