/* =====================================================================
   BugBuster Pro — js/main.js   (customer interactions)
   Page is selected by <body data-page="...">. Shared helpers on top,
   per-page routers below. Cart persists via Storage so it survives
   navigation across services -> book -> checkout.
   ===================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));
const money = Storage.money;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const statusClass = (st) => "st-" + String(st).toLowerCase().replace(/\s+/g, "-");

/* ---------- toast ---------- */
function toast(msg, type) {
  let wrap = $(".toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
  const t = document.createElement("div");
  t.className = "toast " + (type === "err" ? "err" : "ok");
  t.innerHTML = '<span>' + (type === "err" ? "⚠️" : "✓") + '</span><span>' + esc(msg) + '</span>';
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 250); }, 3200);
}

/* ---------- cart ---------- */
const Cart = {
  get() { return Storage._get("bb_cart", []); },
  set(v) { return Storage._set("bb_cart", v); },
  add(id, qty) {
    const c = this.get(); const found = c.find((x) => x.id === id);
    if (found) found.qty += (qty || 1); else c.push({ id: id, qty: qty || 1 });
    this.set(c); this.paint();
  },
  remove(id) { this.set(this.get().filter((x) => x.id !== id)); this.paint(); },
  setQty(id, qty) { const c = this.get(); const f = c.find((x) => x.id === id); if (f) f.qty = Math.max(1, qty); this.set(c); this.paint(); },
  count() { return this.get().reduce((s, x) => s + x.qty, 0); },
  clear() { this.set([]); this.paint(); },
  paint() { $$("[data-cart-count]").forEach((el) => { const n = Cart.count(); el.textContent = n; el.style.display = n ? "inline-flex" : "none"; }); }
};

/* ---------- nav ---------- */
function initNav() {
  const tgl = $(".menu-toggle"); if (tgl) tgl.addEventListener("click", () => $(".nav nav").classList.toggle("open"));
  const path = location.pathname.replace(/\/$/, "");
  $$(".nav nav a").forEach((a) => {
    const href = a.getAttribute("href").replace(/\.html$/, "").replace(/\/$/, "");
    if (href && (path.endsWith(href) || (href === "/index" && (path === "" || path.endsWith("/index"))))) a.style.color = "var(--ink)";
  });
  Cart.paint();
}

/* =====================================================================
   PAGE: home
   ===================================================================== */
function pageHome() {
  const grid = $("#featured"); if (!grid) return;
  grid.innerHTML = Storage.getServices().slice(0, 6).map(svcCard).join("");
  bindSvcButtons(grid);
}

/* =====================================================================
   PAGE: services (filter + sort)
   ===================================================================== */
function pageServices() {
  const grid = $("#catalog"); if (!grid) return;
  const sortSel = $("#sortBy");
  function render() {
    let list = Storage.getServices();
    const s = sortSel ? sortSel.value : "default";
    if (s === "price-asc") list.sort((a, b) => a.basePrice - b.basePrice);
    if (s === "price-desc") list.sort((a, b) => b.basePrice - a.basePrice);
    if (s === "duration") list.sort((a, b) => a.durationMin - b.durationMin);
    grid.innerHTML = list.map(svcCard).join("");
    bindSvcButtons(grid);
  }
  if (sortSel) sortSel.addEventListener("change", render);
  render();
}

function svcCard(s) {
  return '<article class="card svc-card">' +
    '<div class="svc-icon">' + s.icon + '</div>' +
    '<div class="sub">' + s.id + ' · ' + esc(s.nameId) + '</div>' +
    '<h3>' + esc(s.name) + '</h3>' +
    '<p class="desc">' + esc(s.description) + '</p>' +
    '<div class="svc-meta"><span class="price">' + money(s.basePrice) + '</span><span class="dur">~' + s.durationMin + ' min</span></div>' +
    '<button class="btn btn-amber btn-sm btn-block mt8" data-add="' + s.id + '">Add to booking</button>' +
    '</article>';
}
function bindSvcButtons(scope) {
  $$("[data-add]", scope).forEach((b) => b.addEventListener("click", () => {
    Cart.add(b.getAttribute("data-add"));
    toast(Storage.serviceName(b.getAttribute("data-add")) + " added");
  }));
}

/* =====================================================================
   PAGE: book  (input — K&K Ch.12/15)
   ===================================================================== */
function pageBook() {
  const form = $("#bookForm"); if (!form) return;
  const opts = Storage.getOptions();
  // service picker reflects the cart (or lets user add)
  const picker = $("#svcPicker");
  const addSel = $("#addSvc");
  addSel.innerHTML = '<option value="">+ Add a service…</option>' +
    Storage.getServices().map((s) => '<option value="' + s.id + '">' + esc(s.name) + ' — ' + money(s.basePrice) + '</option>').join("");
  addSel.addEventListener("change", () => { if (addSel.value) { Cart.add(addSel.value); addSel.value = ""; renderPicker(); } });

  function renderPicker() {
    const c = Cart.get();
    if (!c.length) { picker.innerHTML = '<p class="hint">No service selected yet. Add one above.</p>'; updateTotal(); return; }
    picker.innerHTML = c.map((row) => {
      const s = Storage.getService(row.id); if (!s) return "";
      return '<div class="pick active"><div><strong>' + esc(s.name) + '</strong><br><span class="dur">' + money(s.basePrice) + ' each</span></div>' +
        '<div class="qty"><button type="button" data-dec="' + s.id + '">−</button>' +
        '<span class="mono" style="min-width:20px;text-align:center">' + row.qty + '</span>' +
        '<button type="button" data-inc="' + s.id + '">+</button>' +
        '<button type="button" class="btn-ghost btn-sm" data-rm="' + s.id + '" style="margin-left:8px">Remove</button></div></div>';
    }).join("");
    $$("[data-inc]", picker).forEach((b) => b.onclick = () => { const id = b.dataset.inc; Cart.setQty(id, (Cart.get().find((x) => x.id === id).qty) + 1); renderPicker(); });
    $$("[data-dec]", picker).forEach((b) => b.onclick = () => { const id = b.dataset.dec; Cart.setQty(id, (Cart.get().find((x) => x.id === id).qty) - 1); renderPicker(); });
    $$("[data-rm]", picker).forEach((b) => b.onclick = () => { Cart.remove(b.dataset.rm); renderPicker(); });
    updateTotal();
  }

  function readForm() {
    const fd = new FormData(form);
    return {
      cust_name: fd.get("cust_name"), cust_email: fd.get("cust_email"), cust_phone: fd.get("cust_phone"),
      address: fd.get("address"), region: fd.get("region"),
      propertyType: fd.get("propertyType"), areaSize: fd.get("areaSize"), severity: fd.get("severity"),
      preferredDate: fd.get("preferredDate"), timeSlot: fd.get("timeSlot"),
      frequency: fd.get("frequency"), ecoFriendly: !!fd.get("ecoFriendly"),
      services: Cart.get()
    };
  }
  function updateTotal() {
    const p = readForm();
    const subtotal = Cart.get().reduce((s, r) => { const svc = Storage.getService(r.id); return s + (svc ? svc.basePrice : 0) * r.qty; }, 0);
    const eco = $("[name=ecoFriendly]").checked ? Math.round(subtotal * 0.10) : 0;
    $("#sumSub").textContent = money(subtotal);
    $("#sumEco").textContent = eco ? "+ " + money(eco) : "—";
    $("#sumTotal").textContent = money(subtotal + eco);
  }

  form.addEventListener("input", updateTotal);
  $("[name=ecoFriendly]").addEventListener("change", updateTotal);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = readForm();
    const res = Validate.booking(p);
    Validate.clearErrors(form);
    if (!res.valid) { Validate.showErrors(form, res.errors); toast("Please fix the highlighted fields.", "err"); return; }
    Storage._set("bb_pending", p);     // hand off to checkout
    location.href = "checkout.html";
  });

  // default the date to tomorrow, min today
  const dt = $("[name=preferredDate]");
  const tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  dt.min = new Date().toISOString().slice(0, 10); if (!dt.value) dt.value = tmr;

  renderPicker();
  updateTotal();
}

/* =====================================================================
   PAGE: checkout (simulated payment with Luhn check on the card number)
   ===================================================================== */
function pageCheckout() {
  const root = $("#checkout"); if (!root) return;
  const p = Storage._get("bb_pending", null);
  if (!p || !p.services || !p.services.length) { location.href = "book.html"; return; }

  const subtotal = p.services.reduce((s, r) => { const svc = Storage.getService(r.id); return s + (svc ? svc.basePrice : 0) * r.qty; }, 0);
  const eco = p.ecoFriendly ? Math.round(subtotal * 0.10) : 0;
  const total = subtotal + eco;

  $("#coSummary").innerHTML =
    p.services.map((r) => { const s = Storage.getService(r.id); return '<div class="line"><span>' + esc(s.name) + ' × ' + r.qty + '</span><span>' + money(s.basePrice * r.qty) + '</span></div>'; }).join("") +
    (eco ? '<div class="line"><span>Eco-friendly chemicals (+10%)</span><span>' + money(eco) + '</span></div>' : "") +
    '<div class="total-line"><strong>Total due</strong><span class="price">' + money(total) + '</span></div>';
  $("#coMeta").innerHTML =
    '<div class="line"><span>Service date</span><span class="mono">' + esc(p.preferredDate) + ' · ' + esc(p.timeSlot) + '</span></div>' +
    '<div class="line"><span>Property</span><span>' + esc(p.propertyType) + ' · ' + esc(p.areaSize) + ' m²</span></div>' +
    '<div class="line"><span>Location</span><span>' + esc(p.region) + '</span></div>';

  $("#payForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const scope = $("#payForm");
    Validate.clearErrors(scope);
    const errors = {};
    const name = $("[name=cardName]").value.trim();
    const num = $("[name=cardNumber]").value.replace(/[\s-]/g, "");
    if (!name) errors.cardName = "Enter the cardholder name.";
    if (!/^[0-9]+$/.test(num)) errors.cardNumber = "Card number may contain digits only.";
    else if (num.length < 13 || num.length > 19) errors.cardNumber = "Card number must be 13–19 digits.";
    else if (!Storage.luhnValid(num)) errors.cardNumber = "Card number fails the Luhn check — please re-check.";
    if (Object.keys(errors).length) { Validate.showErrors(scope, errors); toast("Payment details look off.", "err"); return; }

    // create the booking (status Requested) and mark it paid (simulated)
    const booking = Storage.createBooking(p);
    Storage.markPaid(booking.id);
    Storage._set("bb_last", booking.id);
    Cart.clear(); localStorage.removeItem("bb_pending");

    root.innerHTML =
      '<div class="card center" style="max-width:560px;margin:0 auto;padding:40px">' +
      '<div style="font-size:46px">✅</div>' +
      '<h2 class="mt8">Booking confirmed</h2>' +
      '<p class="muted mt8">We\'ve received your request. A coordinator will confirm and assign a technician shortly.</p>' +
      '<div class="tag" style="margin:18px auto;display:inline-flex;font-size:14px">' + booking.id + '</div>' +
      '<p class="hint">Save this booking ID — you\'ll use it to track your service.</p>' +
      '<div class="flex" style="justify-content:center;margin-top:20px">' +
      '<a class="btn" href="track.html?id=' + booking.id + '">Track this service</a>' +
      '<a class="btn-ghost btn" href="services.html">Book another</a></div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Booking " + booking.id + " created");
  });
}

/* =====================================================================
   PAGE: track (output — K&K Ch.11; live timeline + feedback)
   ===================================================================== */
function pageTrack() {
  const root = $("#trackResult"); if (!root) return;
  const form = $("#trackForm");
  const input = $("[name=lookup]");

  const qid = new URLSearchParams(location.search).get("id") || Storage._get("bb_last", "");
  if (qid) { input.value = qid; render(qid); }

  form.addEventListener("submit", (e) => { e.preventDefault(); render(input.value.trim().toUpperCase()); });
  window.addEventListener("bb:sync", () => { if (input.value) render(input.value.trim().toUpperCase()); });

  function render(id) {
    const res = Validate.bookingIdLookup(id);
    Validate.clearErrors(form);
    if (!res.valid) { Validate.showErrors(form, res.errors); root.innerHTML = ""; return; }
    const b = Storage.getBooking(id);
    const appt = Storage.getAppointmentByBooking(b.id);
    const tech = appt ? Storage.getTechnician(appt.technicianId) : null;
    const report = Storage.getReportByBooking(b.id);
    const flow = Storage.STATUSES;
    const cancelled = b.status === "Cancelled";
    const reached = cancelled ? -1 : flow.indexOf(b.status);

    const timeline = cancelled
      ? '<div class="card"><span class="badge st-cancelled">CANCELLED</span><p class="mt8 muted">This booking was cancelled. Contact us to rebook.</p></div>'
      : '<div class="card"><h3 style="margin-bottom:14px">Activity</h3><div class="timeline">' +
        flow.map((st, i) => {
          const hist = b.statusHistory.find((h) => h.status === st);
          const cls = i < reached ? "done" : (i === reached ? "current" : "");
          const when = hist ? new Date(hist.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
          return '<div class="tl-item ' + cls + '"><span class="tl-dot">' + (i < reached ? "✓" : "") + '</span>' +
            '<div class="tl-title">' + st + '</div><div class="tl-time">' + (hist ? when : "pending") + '</div></div>';
        }).join("") + '</div></div>';

    root.innerHTML =
      '<div class="card spread" style="margin-bottom:18px"><div><div class="tag">' + b.id + '</div>' +
        '<div class="mt8"><strong>' + b.services.map((s) => esc(s.name)).join(", ") + '</strong></div>' +
        '<div class="hint">' + esc(b.preferredDate) + ' · ' + esc(b.timeSlot) + ' · ' + esc(b.region) + '</div></div>' +
        '<span class="badge ' + statusClass(b.status) + '">' + b.status.toUpperCase() + '</span></div>' +
      '<div class="two-col">' + timeline +
        '<div class="stack-sm">' +
          '<div class="card"><h3 style="margin-bottom:10px">Technician</h3>' +
            (tech ? '<p><strong>' + esc(tech.name) + '</strong></p><p class="hint mono">' + esc(tech.id) + ' · ' + esc(tech.phone) + '</p>'
                  : '<p class="muted">Not assigned yet.</p>') + '</div>' +
          (report ? reportCard(report) : "") +
          feedbackBlock(b) +
        '</div></div>';
    bindFeedback(b);
  }

  function reportCard(r) {
    const chem = (r.chemicals || []).map((c) => { const it = Storage.getInventoryItem(c.item); return (it ? it.name : c.item) + " (" + c.qtyUsed + (it ? " " + it.unit : "") + ")"; }).join(", ");
    return '<div class="card"><h3 style="margin-bottom:10px">Service report</h3>' +
      '<p class="hint mono">' + r.id + '</p>' +
      '<div class="line"><span>Pests treated</span><span>' + esc((r.pestsTreated || []).join(", ")) + '</span></div>' +
      '<div class="line"><span>Area treated</span><span>' + esc(r.areaTreated) + ' m²</span></div>' +
      '<div class="line"><span>Outcome</span><span>' + esc(r.outcome) + '</span></div>' +
      (chem ? '<div class="line"><span>Chemicals</span><span style="text-align:right">' + esc(chem) + '</span></div>' : "") +
      (r.notes ? '<p class="hint mt8">“' + esc(r.notes) + '”</p>' : "") + '</div>';
  }

  function feedbackBlock(b) {
    if (b.status !== "Completed") return "";
    const appt = Storage.getAppointmentByBooking(b.id);
    const existing = Storage.getFeedback().find((f) => appt && f.appointmentId === appt.id);
    if (existing) return '<div class="card"><h3 style="margin-bottom:8px">Your feedback</h3>' + starRow(existing.rating) + '<p class="quote mt8">“' + esc(existing.comments) + '”</p></div>';
    return '<div class="card" id="fbForm"><h3 style="margin-bottom:8px">Leave feedback</h3>' +
      '<p class="hint">How was the service?</p>' +
      '<div class="stars" id="starPick" data-field="rating">' + [1,2,3,4,5].map((n) => '<span data-v="' + n + '">★</span>').join("") + '</div>' +
      '<input type="hidden" name="rating">' +
      '<div data-error="rating"></div>' +
      '<textarea name="comments" placeholder="Tell us what went well or what we can improve…" class="mt8" data-field="comments"></textarea>' +
      '<div data-error="comments"></div>' +
      '<button class="btn btn-block mt16" id="fbSubmit">Submit feedback</button></div>';
  }

  function bindFeedback(b) {
    const box = $("#fbForm"); if (!box) return;
    const stars = $$("#starPick span"); const hidden = $("[name=rating]", box);
    stars.forEach((st) => {
      st.addEventListener("click", () => { const v = +st.dataset.v; hidden.value = v; stars.forEach((s) => s.classList.toggle("on", +s.dataset.v <= v)); });
      st.addEventListener("mouseenter", () => stars.forEach((s) => s.classList.toggle("on", +s.dataset.v <= +st.dataset.v)));
    });
    $("#starPick").addEventListener("mouseleave", () => stars.forEach((s) => s.classList.toggle("on", +s.dataset.v <= (+hidden.value || 0))));
    $("#fbSubmit").addEventListener("click", () => {
      const data = { rating: hidden.value, comments: $("[name=comments]", box).value };
      const v = Validate.feedback(data); Validate.clearErrors(box);
      if (!v.valid) { Validate.showErrors(box, v.errors); return; }
      const res = Storage.submitFeedback({ bookingId: b.id, rating: data.rating, comments: data.comments });
      if (!res.ok) { toast(res.error, "err"); return; }
      toast("Thanks for your feedback!"); render(b.id);
    });
  }
}

/* =====================================================================
   PAGE: feedback (list + summary)
   ===================================================================== */
function pageFeedback() {
  const root = $("#fbList"); if (!root) return;
  function render() {
    const list = Storage.getFeedback().slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const sum = Storage.feedbackSummary();
    $("#fbAvg").textContent = sum.avg.toFixed(1);
    $("#fbCount").textContent = sum.count;
    $("#fbStars").innerHTML = starRow(Math.round(sum.avg)).replace('class="stars readonly"', 'class="stars readonly" style="font-size:20px"');
    const bars = $("#fbDist");
    if (bars) bars.innerHTML = [5,4,3,2,1].map((n) => {
      const pct = sum.count ? Math.round((sum.dist[n] / sum.count) * 100) : 0;
      return '<div class="flex" style="gap:10px"><span class="mono" style="width:14px">' + n + '</span>' +
        '<div style="flex:1;height:8px;background:var(--mist);border-radius:6px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:var(--amber)"></div></div>' +
        '<span class="mono" style="width:34px;text-align:right;color:var(--muted)">' + sum.dist[n] + '</span></div>';
    }).join("");
    root.innerHTML = list.length ? list.map((f) => {
      const s = f.service ? Storage.getService(f.service) : null;
      return '<article class="card fb-card"><div class="fb-top">' + starRow(f.rating) +
        '<span class="hint mono">' + new Date(f.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + '</span></div>' +
        '<p class="quote">“' + esc(f.comments) + '”</p>' +
        (s ? '<span class="hint">' + esc(s.name) + '</span>' : "") + '</article>';
    }).join("") : '<div class="empty"><div class="em">💬</div>No feedback yet.</div>';
  }
  window.addEventListener("bb:sync", render);
  render();
}

function starRow(n) { return '<span class="stars readonly">' + [1,2,3,4,5].map((i) => '<span class="' + (i <= n ? "on" : "") + '">★</span>').join("") + '</span>'; }

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  const page = document.body.getAttribute("data-page");
  ({ home: pageHome, services: pageServices, book: pageBook, checkout: pageCheckout, track: pageTrack, feedback: pageFeedback }[page] || function(){})();
});
