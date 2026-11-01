/* ============================================================
   Checkout — multi-step flow: details → OTP → payment → success.
   ============================================================ */
(function () {
  const C = window.CAFE;

  const $ = (id) => document.getElementById(id);
  const steps = ["details", "otp", "payment", "success"].map(s => $("step-" + s));
  const dots = document.querySelectorAll(".steps-indicator .step-dot");

  let order = null;         // { id, items, subtotal, total, payment, utr, name, phone, address, note }
  let otpState = { code: null, sentAt: 0, attempts: 0, demo: false, cooldown: 0 };
  let resendTimer = null;

  /* ---------- API helper (graceful when backend is offline) ---------- */
  async function api(path, body) {
    try {
      const res = await fetch((C.apiBase || "") + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {})
      });
      if (!res.ok) throw new Error("http " + res.status);
      return await res.json();
    } catch (e) {
      return null; // backend unreachable -> fallback to demo
    }
  }

  /* ---------- navigation ---------- */
  function goToStep(i) {
    steps.forEach((s, idx) => s.classList.toggle("active", idx === i));
    dots.forEach((d, idx) => d.classList.toggle("active", idx <= i));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- order summary ---------- */
  function renderSummary() {
    const items = Cart.items();
    const wrap = $("summaryItems");
    const count = Cart.count();
    const sub = Cart.subtotal();
    $("summaryCount").textContent = count + (count === 1 ? " item" : " items");
    $("summarySubtotal").textContent = fmt(sub);
    $("summaryTotal").textContent = fmt(sub);
    if (items.length === 0) {
      wrap.innerHTML = '<div class="empty-note">Your cart is empty.<br/>Add some dishes first 👇</div>';
      return;
    }
    wrap.innerHTML = items.map(x =>
      '<div class="summary-item">' +
        '<div class="si-emoji">' + x.item.emoji + '</div>' +
        '<div class="si-name">' + esc(x.item.name) + '<div class="si-qty">×' + x.qty + '</div></div>' +
        '<div class="si-price">' + fmt(x.qty * x.item.price) + '</div>' +
      '</div>'
    ).join("");
  }

  function guardEmpty() {
    if (Cart.count() === 0) {
      goToStep(0);
      toast("Your cart is empty — add some dishes first 🙂", "");
      setTimeout(() => { location.href = "menu.html"; }, 1200);
      return true;
    }
    return false;
  }

  /* ---------- step 1: details ---------- */
  function validateField(id, ok, msg) {
    const field = $(id).closest(".field");
    field.classList.toggle("invalid", !ok);
    if (!ok) field.querySelector(".err").textContent = msg;
    return ok;
  }

  function onDetailsContinue() {
    const name = $("cName").value.trim();
    const phone = $("cPhone").value.trim().replace(/\D/g, "");
    const address = $("cAddress").value.trim();
    const note = $("cNote").value.trim();

    const okName = validateField("cName", name.length >= 2, "Please enter your full name.");
    const okPhone = validateField("cPhone", /^[6-9]\d{9}$/.test(phone), "Enter a valid 10-digit mobile number.");
    const okAddr = validateField("cAddress", address.length >= 8, "Enter your full delivery address.");
    if (!okName || !okPhone || !okAddr) return;

    sendOtp(phone);
  }

  /* ---------- step 2: OTP ---------- */
  async function sendOtp(phone) {
    goToStep(1);
    $("otpHint").innerHTML = "Sending OTP to <b>+91 " + phone + "</b>…";
    $("otpError").style.display = "none";
    clearOtpInputs();

    const res = await api("/api/otp/send", { phone: phone });
    otpState.attempts = 0;
    otpState.sentAt = Date.now();

    if (res && res.ok) {
      otpState.demo = !!res.demo;
      otpState.code = res.demo ? String(res.otp) : null;
      if (res.demo) {
        $("otpHint").innerHTML = 'We\'re in <b>demo mode</b> (SMS not configured). Your OTP is <span class="demo">' + res.otp + '</span>';
      } else {
        otpState.code = null;
        $("otpHint").innerHTML = "Enter the 6-digit OTP sent to <b>+91 " + phone + "</b>";
      }
    } else {
      // backend offline -> local demo OTP
      const code = String(Math.floor(100000 + Math.random() * 900000));
      otpState.demo = true;
      otpState.code = code;
      $("otpHint").innerHTML = 'Backend offline — <b>demo mode</b>. Your OTP is <span class="demo">' + code + '</span>';
    }
    startResendCooldown();
    focusFirstOtp();
  }

  function clearOtpInputs() {
    document.querySelectorAll(".otp-row input").forEach(i => i.value = "");
  }
  function focusFirstOtp() {
    const first = document.querySelector(".otp-row input");
    if (first) setTimeout(() => first.focus(), 60);
  }

  function startResendCooldown() {
    otpState.cooldown = 30;
    const btn = $("resendBtn");
    const lbl = $("resendLabel");
    btn.disabled = true;
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      otpState.cooldown--;
      if (otpState.cooldown <= 0) {
        clearInterval(resendTimer);
        btn.disabled = false;
        lbl.textContent = "Resend OTP";
      } else {
        lbl.textContent = "Resend OTP in " + otpState.cooldown + "s";
      }
    }, 1000);
  }

  async function onVerifyOtp() {
    const code = [...document.querySelectorAll(".otp-row input")].map(i => i.value).join("");
    const errEl = $("otpError");
    errEl.style.display = "none";

    if (code.length !== 6) {
      showOtpError("Enter the full 6-digit OTP.");
      return;
    }

    // demo/local mode verify client-side
    if (otpState.demo && otpState.code) {
      if (code === otpState.code) { otpSuccess(); } else { otpFail(); }
      return;
    }

    const res = await api("/api/otp/verify", { phone: $("cPhone").value.trim().replace(/\D/g, ""), otp: code });
    if (res && res.ok) { otpSuccess(); }
    else { otpFail(); }
  }

  function otpFail() {
    otpState.attempts++;
    showOtpError("Incorrect OTP. " + (5 - otpState.attempts) + " attempt(s) left.");
    document.querySelectorAll(".otp-row input").forEach(i => {
      i.classList.remove("shake"); void i.offsetWidth; i.classList.add("shake");
    });
    if (otpState.attempts >= 5) {
      $("verifyBtn").disabled = true;
      showOtpError("Too many attempts. Please resend a new OTP.");
    }
  }

  function otpSuccess() {
    $("verifyBtn").disabled = false;
    goToStep(2);
  }

  function showOtpError(msg) {
    const el = $("otpError");
    el.textContent = msg;
    el.style.display = "block";
  }

  /* ---------- step 3: payment ---------- */
  function onPayChange() {
    const online = $("payOnline").checked;
    $("upiPanel").style.display = online ? "block" : "none";
    $("upiAmount").textContent = fmt(Cart.subtotal());
    $("opt-online").classList.toggle("selected", online);
    $("opt-cash").classList.toggle("selected", !online);
  }

  function payUpi() {
    const amt = Cart.subtotal();
    const txn = "BC" + Date.now().toString().slice(-6);
    const upi = "upi://pay?pa=" + encodeURIComponent(C.upiId) + "&pn=" + encodeURIComponent(C.upiName) +
      "&am=" + amt + "&cu=INR&tn=" + encodeURIComponent("Bakers Gallery Order " + txn);
    // attempt to open UPI app
    const win = window.location;
    win.href = upi;
    toast("Opening your UPI app… Complete payment, then confirm below.");
  }

  function copyUpiId() {
    (navigator.clipboard ? navigator.clipboard.writeText(C.upiId) : Promise.reject())
      .then(() => toast("UPI ID copied: " + C.upiId, "success"))
      .catch(() => { window.prompt("Copy your UPI ID:", C.upiId); });
  }

  async function placeOrder() {
    const online = $("payOnline").checked;
    const utr = $("utr").value.trim();
    if (online && !utr) {
      $("payError").style.display = "block";
      $("payError").textContent = "Please enter your UPI transaction ID after paying, or switch to Cash on Delivery.";
      return;
    }
    $("payError").style.display = "none";

    const items = Cart.items();
    const now = new Date();
    order = {
      id: "BC-" + now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, "0") +
          String(now.getDate()).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      items,
      subtotal: Cart.subtotal(),
      total: Cart.subtotal(),
      payment: online ? "Online (UPI)" : "Cash on Delivery",
      utr: online ? utr : null,
      name: $("cName").value.trim(),
      phone: $("cPhone").value.trim().replace(/\D/g, ""),
      address: $("cAddress").value.trim(),
      note: $("cNote").value.trim(),
      at: now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    };

    const res = await api("/api/orders", order);
    showSuccess(res);
  }

  /* ---------- step 4: success ---------- */
  function buildMessage(o) {
    const lines = [];
    lines.push("🛒 *NEW ORDER — Bakers Gallery*");
    lines.push("🧾 Order ID: " + o.id);
    lines.push("🕒 " + o.at);
    lines.push("");
    lines.push("👤 Name: " + o.name);
    lines.push("📞 Phone: " + o.phone);
    lines.push("📍 Address: " + o.address);
    if (o.note) lines.push("📝 Note: " + o.note);
    lines.push("");
    lines.push("————— ITEMS —————");
    o.items.forEach((x, i) => {
      lines.push((i + 1) + ". " + x.item.name + " ×" + x.qty + " = ₹" + (x.qty * x.item.price));
    });
    lines.push("————— TOTAL —————");
    lines.push("Subtotal: ₹" + o.subtotal);
    lines.push("Delivery: FREE");
    lines.push("💰 Total: ₹" + o.total);
    lines.push("");
    lines.push("💳 Payment: " + o.payment + (o.utr ? " (UTR: " + o.utr + ")" : ""));
    lines.push("");
    lines.push("Please confirm and start preparing 🙏");
    return lines.join("\n");
  }

  function showSuccess(apiRes) {
    goToStep(3);
    $("orderId").textContent = order.id;
    $("successSub").innerHTML = "Thank you, " + esc(order.name.split(" ")[0]) + "! Your order is confirmed.";

    const box = $("orderDetails");
    box.innerHTML =
      '<div><b>👤 ' + esc(order.name) + '</b> · 📞 +91 ' + esc(order.phone) + '</div>' +
      '<div>📍 ' + esc(order.address) + '</div>' +
      (order.note ? '<div>📝 ' + esc(order.note) + '</div>' : '') +
      '<div>' + order.items.map(x => esc(x.item.name) + ' ×' + x.qty).join(', ') + '</div>' +
      '<div><b>💰 Total: ' + fmt(order.total) + '</b> · 💳 ' + esc(order.payment) + (order.utr ? ' · UTR ' + esc(order.utr) : '') + '</div>';

    // The order is auto-sent to the café's WhatsApp by the backend.
    const wa = apiRes && apiRes.whatsapp;
    const status = $("notifyStatus");
    if (wa && wa.sent) {
      status.className = "notify-status ok";
      status.textContent = "✅ Your order was sent to the café automatically on WhatsApp.";
    } else if (wa && !wa.sent) {
      status.className = "notify-status warn";
      status.textContent = "⚠️ Couldn't auto-notify the café (" + (wa.error || wa.reason || "unknown") + "). Please call us to confirm.";
    } else {
      status.className = "notify-status warn";
      status.textContent = "✅ Order placed. Backend offline — please call the café to confirm.";
    }
    $("copyOrderBtn").dataset.text = buildMessage(order);
    confetti();
    Cart.clear();
    renderSummary();
  }

  /* ---------- confetti ---------- */
  function confetti() {
    const colors = ["#c8803f", "#e09b52", "#d98a2b", "#1f8a4c", "#f0a500", "#e8c99b", "#c0392b"];
    const holder = document.createElement("div");
    holder.className = "confetti";
    document.body.appendChild(holder);
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("span");
      const size = 6 + Math.random() * 8;
      p.style.cssText = "position:absolute;left:" + (Math.random() * 100) + "vw;top:-20px;width:" + size +
        "px;height:" + (size * (Math.random() > .5 ? 1 : 1.6)) + "px;background:" +
        colors[i % colors.length] + ";border-radius:2px;transform:rotate(" + (Math.random() * 360) + "deg);" +
        "animation:confetti-fall " + (2.4 + Math.random() * 2) + "s linear " + (Math.random() * 0.6) + "s forwards;";
      holder.appendChild(p);
    }
    // inject keyframe if missing
    if (!document.getElementById("confetti-style")) {
      const st = document.createElement("style");
      st.id = "confetti-style";
      st.textContent = "@keyframes confetti-fall { to { transform: translateY(105vh) rotate(720deg); opacity: .2; } }";
      document.head.appendChild(st);
    }
    setTimeout(() => holder.remove(), 5000);
  }

  /* ---------- wiring ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderSummary();

    $("detailsContinue").addEventListener("click", () => { if (!guardEmpty()) onDetailsContinue(); });
    $("verifyBtn").addEventListener("click", onVerifyOtp);
    $("resendBtn").addEventListener("click", () => {
      const phone = $("cPhone").value.trim().replace(/\D/g, "");
      sendOtp(phone);
    });
    $("backToDetails").addEventListener("click", () => goToStep(0));

    // payment radios
    document.querySelectorAll("input[name='paymethod']").forEach(r => r.addEventListener("change", onPayChange));
    $("payUpiBtn").addEventListener("click", payUpi);
    $("copyUpi").addEventListener("click", copyUpiId);
    $("placeOrderBtn").addEventListener("click", placeOrder);
    $("backToPayment").addEventListener("click", () => goToStep(2));
    $("copyOrderBtn").addEventListener("click", function () {
      const text = this.dataset.text || "";
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => toast("Order details copied", "success"))
        .catch(() => window.prompt("Copy order details:", text));
    });

    // OTP input auto-advance
    const otpInputs = [...document.querySelectorAll(".otp-row input")];
    otpInputs.forEach((inp, idx) => {
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
        if (inp.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !inp.value && idx > 0) otpInputs[idx - 1].focus();
      });
      inp.addEventListener("paste", (e) => {
        e.preventDefault();
        const txt = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
        txt.split("").forEach((ch, i) => { if (otpInputs[i]) otpInputs[i].value = ch; });
        if (txt.length === 6) otpInputs[5].focus();
      });
    });

    // summary edit -> menu
    $("editCartBtn").addEventListener("click", () => { location.href = "menu.html"; });

    // navbar badge
    function refreshBadge() {
      const el = $("cartCount");
      const c = Cart.count();
      el.textContent = c;
    }
    document.addEventListener("cart:update", () => { refreshBadge(); renderSummary(); });
    refreshBadge();

    // preloader
    window.addEventListener("load", () => setTimeout(() => document.getElementById("preloader").classList.add("done"), 300));
    setTimeout(() => document.getElementById("preloader").classList.add("done"), 3000);
  });
})();
