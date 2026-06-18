/* =====================================================================
   BugBuster Pro — js/admin.js   (coordinator / manager dashboard)
   Auth gate + 7 views. Every read/write goes through Storage; changes
   sync live to customer devices via firebase-sync.
   ===================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));
const money = Storage.money;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const statusClass = (st) => "st-" + String(st).toLowerCase().replace(/\s+/g, "-");
const fmtDate = (iso, withTime) => iso ? new Date(iso).toLocaleString("en-GB", Object.assign({ day:"2-digit", month:"short", year:"numeric" }, withTime ? { hour:"2-digit", minute:"2-digit" } : {})) : "—";

function toast(msg, type) {
  let wrap = $(".toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
  const t = document.createElement("div");
  t.className = "toast " + (type === "err" ? "err" : "ok");
  t.innerHTML = "<span>" + (type === "err" ? "⚠️" : "✓") + "</span><span>" + esc(msg) + "</span>";
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 250); }, 3000);
}

function logout() { localStorage.removeItem("bb_admin_auth"); location.replace("login.html"); }
function badge(st) { return '<span class="badge ' + statusClass(st) + '">' + esc(st).toUpperCase() + "</span>"; }

/* =====================================================================
   VIEW: Dashboard / KPIs
   ===================================================================== */
function vDashboard() {
  const k = Storage.getKpis();
  const low = Storage.getInventory().filter((i) => i.qtyOnHand <= i.reorderLevel);
  const led = Storage.getLedger().slice(0, 8);
  return (
    '<div class="vhead"><div><div class="dark-eyebrow">Overview</div><h2>Today at a glance</h2></div></div>' +
    '<div class="kpis">' +
      stat("Bookings today", k.today) +
      stat("Pending", k.pending, k.pending ? "alert" : "") +
      stat("Assigned", k.assigned) +
      stat("In progress", k.inProgress) +
      stat("Completed", k.completed, "good") +
      stat("Revenue", money(k.revenue)) +
      stat("Low stock", k.lowStock, k.lowStock ? "alert" : "good") +
      stat("Avg rating", k.avgRating ? k.avgRating.toFixed(1) + "★" : "—") +
    '</div>' +
    '<div class="two-col" style="margin-top:22px">' +
      '<div class="card"><h3 style="margin-bottom:12px">Recent activity</h3>' +
        (led.length ? '<div class="bars">' + led.map((l) =>
          '<div class="spread" style="font-size:13.5px"><span><span class="badge st-requested" style="margin-right:8px">' + esc(l.entity) + '</span>' + esc(l.detail) + '</span>' +
          '<span class="hint mono">' + fmtDate(l.at, true) + '</span></div>').join("") + '</div>'
          : '<p class="muted">No activity yet.</p>') + '</div>' +
      '<div class="card"><h3 style="margin-bottom:12px">Low-stock alerts</h3>' +
        (low.length ? low.map((i) =>
          '<div class="line"><span><span class="id mono">' + i.id + '</span> ' + esc(i.name) + '</span>' +
          '<span class="badge st-cancelled">' + i.qtyOnHand + " " + i.unit + " ≤ " + i.reorderLevel + '</span></div>').join("")
          : '<p class="muted">All items above reorder level. ✅</p>') + '</div>' +
    '</div>'
  );
}
function stat(label, n, mod) { return '<div class="stat ' + (mod || "") + '"><div class="l">' + label + '</div><div class="n">' + n + "</div></div>"; }

/* =====================================================================
   VIEW: Bookings (filter + confirm/cancel)
   ===================================================================== */
let bookingFilter = "all";
function vBookings() {
  const opts = ["all"].concat(Storage.STATUSES).concat(["Cancelled"]);
  return (
    '<div class="vhead"><div><div class="dark-eyebrow">Operations</div><h2>Bookings</h2></div></div>' +
    '<div class="toolbar"><label class="dark-eyebrow" style="color:#9fb6ab">Filter</label>' +
      '<select id="bkFilter">' + opts.map((o) => '<option value="' + o + '"' + (o === bookingFilter ? " selected" : "") + '>' + (o === "all" ? "All statuses" : o) + "</option>").join("") + "</select>" +
      '<span class="pill spacer" id="bkCount"></span></div>' +
    '<div class="card tablecard"><div id="bkTable"></div></div>'
  );
}
function bindBookings() {
  const sel = $("#bkFilter");
  function paint() {
    let list = Storage.getBookings().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (bookingFilter !== "all") list = list.filter((b) => b.status === bookingFilter);
    $("#bkCount").textContent = list.length + " booking(s)";
    $("#bkTable").innerHTML = list.length ? (
      '<table class="tbl"><thead><tr><th>ID</th><th>Customer</th><th>Services</th><th>Schedule</th><th class="num">Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      list.map((b) =>
        '<tr><td class="id">' + b.id + '</td>' +
        '<td>' + esc(b.customerName) + '<div class="hint mono">' + esc(b.customerPhone || "") + '</div></td>' +
        '<td>' + b.services.map((s) => esc(s.name) + (s.qty > 1 ? " ×" + s.qty : "")).join("<br>") + '</td>' +
        '<td class="hint mono">' + esc(b.preferredDate) + "<br>" + esc(b.timeSlot) + '</td>' +
        '<td class="num">' + money(b.total) + '</td>' +
        '<td>' + badge(b.status) + (b.paid ? '' : ' <span class="hint">unpaid</span>') + '</td>' +
        '<td><div class="flex" style="gap:6px">' +
          (b.status === "Requested" ? '<button class="btn-sm btn" data-confirm="' + b.id + '">Confirm</button>' : "") +
          (b.status !== "Completed" && b.status !== "Cancelled" ? '<button class="btn-sm btn-ghost btn" data-cancel="' + b.id + '">Cancel</button>' : "") +
        '</div></td></tr>').join("") + "</tbody></table>"
    ) : '<div class="empty"><div class="em">📭</div>No bookings in this view.</div>';
    $$("[data-confirm]").forEach((b) => b.onclick = () => { const r = Storage.confirmBooking(b.dataset.confirm); r.ok ? (toast("Booking confirmed"), paint()) : toast(r.error, "err"); });
    $$("[data-cancel]").forEach((b) => b.onclick = () => { if (!confirm("Cancel " + b.dataset.cancel + "?")) return; const r = Storage.cancelBooking(b.dataset.cancel); r.ok ? (toast("Booking cancelled"), paint()) : toast(r.error, "err"); });
  }
  sel.onchange = () => { bookingFilter = sel.value; paint(); };
  paint();
}

/* =====================================================================
   VIEW: Schedule & Technician Assignment
   ===================================================================== */
function vSchedule() {
  return (
    '<div class="vhead"><div><div class="dark-eyebrow">Dispatch</div><h2>Schedule &amp; assignment</h2></div></div>' +
    '<div class="card"><h3 style="margin-bottom:12px">Awaiting a technician</h3><div id="assignList"></div></div>' +
    '<div class="card" style="margin-top:18px"><h3 style="margin-bottom:12px">Scheduled appointments</h3><div id="apptList"></div></div>'
  );
}
function bindSchedule() {
  const techs = Storage.getTechnicians();
  function paint() {
    const need = Storage.getBookings().filter((b) => b.status === "Requested" || b.status === "Confirmed");
    $("#assignList").innerHTML = need.length ? need.map((b) => {
      const skilled = techs.map((t) => {
        const fits = b.services.every((s) => t.skills.indexOf(s.serviceTypeId) !== -1);
        const regionMatch = t.region === b.region;
        return '<option value="' + t.id + '">' + esc(t.name) + " · " + t.id + (fits ? "" : " (skill gap)") + (regionMatch ? "" : " · " + t.region) + "</option>";
      }).join("");
      return '<div class="line" style="display:block">' +
        '<div class="spread"><span><span class="id mono">' + b.id + '</span> — ' + b.services.map((s) => esc(s.name)).join(", ") + '</span>' + badge(b.status) + '</div>' +
        '<div class="hint mono" style="margin:4px 0 8px">' + esc(b.preferredDate) + " · " + esc(b.timeSlot) + " · " + esc(b.region) + '</div>' +
        '<div class="rowform"><select data-tech="' + b.id + '"><option value="">Choose technician…</option>' + skilled + "</select>" +
        '<button class="btn btn-sm" data-assign="' + b.id + '">Assign</button></div>' +
        '<div class="inline-err" data-err="' + b.id + '" style="display:none"></div></div>';
    }).join("") : '<p class="muted">Nothing waiting — all confirmed bookings are assigned. ✅</p>';

    $$("[data-assign]").forEach((btn) => btn.onclick = () => {
      const id = btn.dataset.assign;
      const techId = $('[data-tech="' + id + '"]').value;
      const err = $('[data-err="' + id + '"]');
      err.style.display = "none";
      if (!techId) { err.textContent = "Pick a technician first."; err.style.display = "block"; return; }
      const r = Storage.assignTechnician(id, techId);
      if (!r.ok) { err.textContent = r.error; err.style.display = "block"; return; }
      toast("Technician assigned to " + id); paint();
    });

    const appts = Storage.getAppointments().filter((a) => a.status !== "Cancelled").sort((a, b) => (a.scheduledDate + a.timeSlot).localeCompare(b.scheduledDate + b.timeSlot));
    $("#apptList").innerHTML = appts.length ? (
      '<table class="tbl"><thead><tr><th>Appt</th><th>Booking</th><th>Technician</th><th>Date / slot</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
      appts.map((a) => {
        const t = Storage.getTechnician(a.technicianId); const b = Storage.getBooking(a.bookingId);
        return '<tr><td class="id">' + a.id + '</td><td class="id">' + a.bookingId + '</td>' +
          '<td>' + (t ? esc(t.name) : a.technicianId) + '</td>' +
          '<td class="hint mono">' + esc(a.scheduledDate) + "<br>" + esc(a.timeSlot) + '</td>' +
          '<td>' + badge(a.status) + '</td>' +
          '<td>' + (b && b.status === "Technician Assigned" ? '<button class="btn btn-sm" data-start="' + a.bookingId + '">Start service</button>' : (a.status === "Completed" ? '<span class="hint">done</span>' : '<span class="hint">in progress</span>')) + '</td></tr>';
      }).join("") + "</tbody></table>"
    ) : '<p class="muted">No appointments scheduled yet.</p>';
    $$("[data-start]").forEach((b) => b.onclick = () => { const r = Storage.startService(b.dataset.start); r.ok ? (toast("Service started"), paint()) : toast(r.error, "err"); });
  }
  paint();
}

/* =====================================================================
   VIEW: Service Reports (file report -> decrement inventory)
   ===================================================================== */
const PEST_OPTS = ["Ants", "Cockroaches", "Rats / Mice", "Termites", "Mosquitoes", "Bedbugs", "Flies", "Other"];
function vReports() {
  return (
    '<div class="vhead"><div><div class="dark-eyebrow">Field</div><h2>Service reports</h2></div></div>' +
    '<div class="card"><h3 style="margin-bottom:12px">Awaiting report</h3><div id="needReport"></div></div>' +
    '<div id="reportFormWrap"></div>' +
    '<div class="card" style="margin-top:18px"><h3 style="margin-bottom:12px">Filed reports</h3><div id="reportList"></div></div>'
  );
}
function bindReports() {
  function paint() {
    const appts = Storage.getAppointments().filter((a) => (a.status === "Scheduled" || a.status === "In Progress") && !Storage.getReports().some((r) => r.appointmentId === a.id));
    $("#needReport").innerHTML = appts.length ? appts.map((a) => {
      const b = Storage.getBooking(a.bookingId); const t = Storage.getTechnician(a.technicianId);
      return '<div class="line"><span><span class="id mono">' + a.bookingId + '</span> — ' + (b ? b.services.map((s) => esc(s.name)).join(", ") : "") + '<div class="hint mono">' + (t ? esc(t.name) : "") + " · " + esc(a.scheduledDate) + '</div></span>' +
        '<button class="btn btn-sm" data-report="' + a.id + '">File report</button></div>';
    }).join("") : '<p class="muted">No appointments awaiting a report.</p>';

    $$("[data-report]").forEach((btn) => btn.onclick = () => openReportForm(btn.dataset.report));

    const reports = Storage.getReports().slice().sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    $("#reportList").innerHTML = reports.length ? (
      '<table class="tbl"><thead><tr><th>Report</th><th>Booking</th><th>Pests</th><th class="num">Area</th><th>Outcome</th><th>Chemicals used</th></tr></thead><tbody>' +
      reports.map((r) => '<tr><td class="id">' + r.id + '</td><td class="id">' + r.bookingId + '</td>' +
        '<td>' + esc((r.pestsTreated || []).join(", ")) + '</td><td class="num">' + r.areaTreated + ' m²</td>' +
        '<td>' + esc(r.outcome) + '</td>' +
        '<td class="hint">' + (r.chemicals || []).map((c) => { const it = Storage.getInventoryItem(c.item); return (it ? it.name : c.item) + " (" + c.qtyUsed + (it ? " " + it.unit : "") + ")"; }).join(", ") + '</td></tr>').join("") + "</tbody></table>"
    ) : '<p class="muted">No reports filed yet.</p>';
  }

  function openReportForm(apptId) {
    const a = Storage.getAppointments().find((x) => x.id === apptId);
    const b = Storage.getBooking(a.bookingId);
    const suggested = Storage.suggestedChemicals(a.bookingId);
    const wrap = $("#reportFormWrap");
    wrap.innerHTML =
      '<div class="card" id="reportForm" style="margin-top:18px;border:2px solid var(--pine-2)">' +
      '<div class="spread"><h3>File report · <span class="id mono">' + a.bookingId + '</span></h3><button class="iconbtn" id="closeReport" style="background:var(--mist);color:var(--ink);border:none">Close</button></div>' +
      '<div class="form-row" style="margin-top:14px"><label class="lab">Pests treated <span class="req">*</span></label>' +
        '<div class="checks" data-field="pests" data-error="pests">' + PEST_OPTS.map((p) => '<label><input type="checkbox" name="pest" value="' + p + '">' + p + "</label>").join("") + "</div></div>" +
      '<div class="form-grid" style="margin-top:14px">' +
        '<div class="form-row"><label class="lab">Severity observed <span class="req">*</span></label><select name="severity"><option value="">Select…</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>' +
        '<div class="form-row"><label class="lab">Area treated (m²) <span class="req">*</span></label><input type="number" name="areaTreated" min="1" value="' + (b ? b.areaSize : "") + '"></div>' +
      "</div>" +
      '<div class="form-row" style="margin-top:14px"><label class="lab">Chemicals used (from service BOM — adjust as needed)</label>' +
        '<div data-error="chemicals"></div>' +
        '<div class="stack-sm">' + suggested.map((c) => { const it = Storage.getInventoryItem(c.item); return (
          '<div class="rowform"><span style="width:200px">' + (it ? esc(it.name) : c.item) + ' <span class="hint mono">' + c.item + " · on hand " + (it ? it.qtyOnHand + " " + it.unit : "") + '</span></span>' +
          '<input type="number" min="0" step="0.1" name="chem_' + c.item + '" value="' + c.qtyUsed + '" style="max-width:120px"></div>'); }).join("") + "</div></div>" +
      '<div class="form-row" style="margin-top:14px"><label class="lab">Outcome <span class="req">*</span></label><select name="outcome"><option value="">Select…</option><option>Treated</option><option>Follow-up needed</option><option>Re-treat scheduled</option></select></div>' +
      '<div class="form-row" style="margin-top:14px"><label class="lab">Notes</label><textarea name="notes" placeholder="Observations, recommendations…"></textarea></div>' +
      '<button class="btn btn-block" style="margin-top:18px" id="submitReport">File report &amp; update inventory</button></div>';
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    $("#closeReport").onclick = () => { wrap.innerHTML = ""; };
    $("#submitReport").onclick = () => {
      const form = $("#reportForm");
      const data = {
        pestsTreated: $$('input[name="pest"]:checked', form).map((c) => c.value),
        severity: $('[name="severity"]', form).value,
        areaTreated: $('[name="areaTreated"]', form).value,
        outcome: $('[name="outcome"]', form).value,
        notes: $('[name="notes"]', form).value,
        chemicals: suggested.map((c) => ({ item: c.item, qtyUsed: Number($('[name="chem_' + c.item + '"]', form).value || 0) }))
      };
      const v = Validate.report(data); Validate.clearErrors(form);
      if (!v.valid) { Validate.showErrors(form, v.errors); toast("Fix the report fields.", "err"); return; }
      const r = Storage.fileReport(apptId, data);
      if (!r.ok) { toast(r.error, "err"); return; }
      toast("Report " + r.report.id + " filed; inventory updated");
      wrap.innerHTML = ""; paint();
    };
  }
  paint();
}

/* =====================================================================
   VIEW: Inventory (levels, manual adjust, ledger)
   ===================================================================== */
function vInventory() {
  return (
    '<div class="vhead"><div><div class="dark-eyebrow">Stock</div><h2>Chemicals &amp; equipment</h2></div></div>' +
    '<div class="card tablecard"><div id="invTable"></div></div>' +
    '<div class="card" style="margin-top:18px"><h3 style="margin-bottom:12px">Inventory ledger</h3><div id="invLedger"></div></div>'
  );
}
function bindInventory() {
  function paint() {
    const inv = Storage.getInventory();
    $("#invTable").innerHTML =
      '<table class="tbl"><thead><tr><th>ID</th><th>Item</th><th class="num">On hand</th><th class="num">Reorder</th><th>Status</th><th>Adjust</th></tr></thead><tbody>' +
      inv.map((i) => {
        const lowQ = i.qtyOnHand <= i.reorderLevel;
        return '<tr><td class="id">' + i.id + '</td><td>' + esc(i.name) + '</td>' +
          '<td class="num">' + i.qtyOnHand + " " + i.unit + '</td><td class="num">' + i.reorderLevel + '</td>' +
          '<td>' + (lowQ ? '<span class="badge st-cancelled">LOW</span>' : '<span class="badge st-completed">OK</span>') + '</td>' +
          '<td><div class="rowform"><input type="number" step="0.5" placeholder="±qty" data-adj="' + i.id + '" style="max-width:90px">' +
          '<input type="text" placeholder="reason" data-reason="' + i.id + '" style="max-width:130px">' +
          '<button class="btn btn-sm" data-apply="' + i.id + '">Apply</button></div></td></tr>';
      }).join("") + "</tbody></table>";
    $$("[data-apply]").forEach((btn) => btn.onclick = () => {
      const id = btn.dataset.apply;
      const delta = Number($('[data-adj="' + id + '"]').value);
      const reason = $('[data-reason="' + id + '"]').value.trim() || "manual adjustment";
      if (!delta) { toast("Enter a non-zero quantity.", "err"); return; }
      Storage.adjustInventory(id, delta, reason); toast(id + " adjusted by " + delta); paint();
    });
    const led = Storage.getLedger().filter((l) => l.entity === "inventory").slice(0, 20);
    $("#invLedger").innerHTML = led.length ? (
      '<table class="tbl"><thead><tr><th>When</th><th>Item</th><th>Change</th><th>Ref</th></tr></thead><tbody>' +
      led.map((l) => '<tr><td class="hint mono">' + fmtDate(l.at, true) + '</td><td class="id">' + esc(l.entityId) + '</td><td>' + esc(l.detail) + '</td><td class="hint mono">' + esc(l.ref || "—") + '</td></tr>').join("") + "</tbody></table>"
    ) : '<p class="muted">No inventory movements yet.</p>';
  }
  paint();
}

/* =====================================================================
   VIEW: Customers
   ===================================================================== */
function vCustomers() {
  return '<div class="vhead"><div><div class="dark-eyebrow">CRM</div><h2>Customers</h2></div></div><div class="card tablecard"><div id="custTable"></div></div>';
}
function bindCustomers() {
  const customers = Storage.getCustomers();
  const bookings = Storage.getBookings();
  $("#custTable").innerHTML = customers.length ? (
    '<table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Region</th><th class="num">Bookings</th><th class="num">Spent</th></tr></thead><tbody>' +
    customers.map((c) => {
      const mine = bookings.filter((b) => b.customerId === c.id);
      const spent = mine.filter((b) => b.status === "Completed").reduce((s, b) => s + b.total, 0);
      return '<tr><td class="id">' + c.id + '</td><td>' + esc(c.name) + '</td>' +
        '<td>' + esc(c.email) + '<div class="hint mono">' + esc(c.phone) + '</div></td>' +
        '<td>' + esc(c.region) + '</td><td class="num">' + mine.length + '</td><td class="num">' + money(spent) + '</td></tr>';
    }).join("") + "</tbody></table>"
  ) : '<div class="empty"><div class="em">👥</div>No customers yet.</div>';
}

/* =====================================================================
   VIEW: Analytics (bars + CSV export)
   ===================================================================== */
function vAnalytics() {
  return (
    '<div class="vhead"><div><div class="dark-eyebrow">Insight</div><h2>Analytics</h2></div>' +
      '<button class="iconbtn amber" id="csvBtn">⬇ Export bookings CSV</button></div>' +
    '<div class="two-col">' +
      '<div class="card"><h3 style="margin-bottom:14px">Bookings · last 7 days</h3><div class="bars" id="otBars"></div></div>' +
      '<div class="card"><h3 style="margin-bottom:14px">Status mix</h3><div class="bars" id="smBars"></div></div>' +
    '</div>' +
    '<div class="card" style="margin-top:18px"><h3 style="margin-bottom:14px">Top services</h3><div class="bars" id="tsBars"></div></div>'
  );
}
function bindAnalytics() {
  const ot = Storage.bookingsOverTime(7); const otMax = Math.max(1, ...ot.map((d) => d.count));
  $("#otBars").innerHTML = ot.map((d) =>
    barRow(new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), d.count, otMax, "amber")).join("");
  const sm = Storage.statusMix(); const smMax = Math.max(1, ...Object.values(sm));
  $("#smBars").innerHTML = Object.keys(sm).map((s) => barRow(s, sm[s], smMax)).join("");
  const ts = Storage.topServices(); const tsMax = Math.max(1, ...ts.map((t) => t.count));
  $("#tsBars").innerHTML = ts.length ? ts.map((t) => barRow(t.name, t.count, tsMax)).join("") : '<p class="muted">No data yet.</p>';
  $("#csvBtn").onclick = exportCsv;
}
function barRow(label, val, max, cls) {
  return '<div class="bar-row"><span class="lab">' + esc(label) + '</span><span class="track"><span class="fill ' + (cls || "") + '" style="width:' + Math.round((val / max) * 100) + '%"></span></span><span class="val">' + val + "</span></div>";
}
function exportCsv() {
  const rows = [["BookingID", "Customer", "Region", "Services", "Date", "TimeSlot", "Total", "Status", "Paid", "CreatedAt"]];
  Storage.getBookings().forEach((b) => rows.push([
    b.id, b.customerName, b.region, b.services.map((s) => s.name + "x" + s.qty).join("; "),
    b.preferredDate, b.timeSlot, b.total, b.status, b.paid ? "yes" : "no", b.createdAt
  ]));
  const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "bugbuster-bookings.csv"; a.click();
  URL.revokeObjectURL(url); toast("CSV exported");
}

/* =====================================================================
   Router + boot
   ===================================================================== */
const VIEWS = {
  dashboard: { render: vDashboard, bind: function(){}, label: "Dashboard", ic: "▣" },
  bookings:  { render: vBookings,  bind: bindBookings,  label: "Bookings",  ic: "🗂" },
  schedule:  { render: vSchedule,  bind: bindSchedule,  label: "Schedule",  ic: "📅" },
  reports:   { render: vReports,   bind: bindReports,   label: "Reports",   ic: "📋" },
  inventory: { render: vInventory, bind: bindInventory, label: "Inventory", ic: "🧪" },
  customers: { render: vCustomers, bind: bindCustomers, label: "Customers", ic: "👥" },
  analytics: { render: vAnalytics, bind: bindAnalytics, label: "Analytics", ic: "📈" }
};
function setView(name) {
  if (!VIEWS[name]) name = "dashboard";
  $$(".navbtn").forEach((b) => b.classList.toggle("on", b.dataset.view === name));
  const v = VIEWS[name];
  $("#view").innerHTML = v.render();
  v.bind();
  history.replaceState(null, "", "#" + name);
}

document.addEventListener("DOMContentLoaded", () => {
  // build sidebar nav
  const nav = $("#sideNav");
  nav.innerHTML = Object.keys(VIEWS).map((k) =>
    '<button class="navbtn" data-view="' + k + '"><span class="ic">' + VIEWS[k].ic + '</span>' + VIEWS[k].label + "</button>").join("");
  $$(".navbtn").forEach((b) => b.onclick = () => setView(b.dataset.view));
  $("#logoutBtn").onclick = logout;
  $("#resetBtn").onclick = () => { if (confirm((window.t ? window.t("Reset all demo data to its seeded state?") : "Reset all demo data to its seeded state?"))) { Storage.resetDemo(); toast("Demo data reset"); setView("dashboard"); } };

  // re-render current view on live sync from a customer device
  window.addEventListener("bb:sync", () => setView((location.hash || "#dashboard").slice(1)));

  setView((location.hash || "#dashboard").slice(1));
});
