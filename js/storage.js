/* =====================================================================
   BugBuster Pro — js/storage.js
   The STABLE METHOD SURFACE. All state + business logic live here so the
   UI never touches localStorage directly and the backend could later be
   swapped (Supabase/REST) without changing any page.
   Depends on: data.js (BB_DATA), firebase-sync.js (window.Sync).
   ===================================================================== */

const Storage = (() => {

  /* ---------- low-level get/set (with RTDB array-coercion fix) ---------- */
  function _get(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    let val;
    try { val = JSON.parse(raw); } catch (_) { return fallback; }
    // Firebase serializes sparse arrays as objects ({0:.., 2:..}); coerce back.
    if (Array.isArray(fallback) && val && !Array.isArray(val) && typeof val === "object") {
      val = Object.keys(val).sort((a, b) => a - b).map((k) => val[k]).filter((v) => v != null);
    }
    return val;
  }

  function _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    if (window.Sync && window.Sync.enabled) window.Sync.push(key, value);
    return value;
  }

  /* ---------- sequence counters + ID generation ---------- */
  function _seq(name) {
    const seqs = _get("bb_seq", {});
    seqs[name] = (seqs[name] || 0) + 1;
    _set("bb_seq", seqs);
    return seqs[name];
  }
  const _pad = (n, w) => String(n).padStart(w, "0");

  // Luhn (modulus-10) self-checking number — K&K Ch.15 check digit.
  function luhnDigit(numStr) {
    let sum = 0, dbl = true;
    for (let i = numStr.length - 1; i >= 0; i--) {
      let d = +numStr[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return (10 - (sum % 10)) % 10;
  }
  function luhnValid(fullDigits) {
    let sum = 0, dbl = false;
    for (let i = fullDigits.length - 1; i >= 0; i--) {
      let d = +fullDigits[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return fullDigits.length > 0 && sum % 10 === 0;
  }
  function genBookingId() {
    const seq = _seq("booking");
    const core = "2026" + _pad(seq, 4);          // e.g. 20260001
    const chk = luhnDigit(core);                 // check digit
    return "BK-2026-" + _pad(seq, 4) + "-" + chk; // BK-2026-0001-7
  }
  function validBookingId(id) {
    const digits = String(id).replace(/\D/g, "");
    return luhnValid(digits);
  }
  const genCustomerId   = () => "CU-2026-" + _pad(_seq("customer"), 4);
  const genAppointmentId= () => "AP-2026-" + _pad(_seq("appointment"), 4);
  const genReportId     = () => "SR-2026-" + _pad(_seq("report"), 4);
  const genFeedbackId   = () => "FB-2026-" + _pad(_seq("feedback"), 4);

  /* ---------- catalog accessors (immutable seed) ---------- */
  const getServices   = () => BB_DATA.services.slice();
  const getService    = (id) => BB_DATA.services.find((s) => s.id === id) || null;
  const serviceName   = (id) => { const s = getService(id); return s ? s.name : id; };
  const getOptions    = () => BB_DATA.options;
  const getBOM        = (serviceId) => BB_DATA.bom[serviceId] || [];

  /* ---------- technicians / inventory (mutable, seeded) ---------- */
  const getTechnicians = () => _get("bb_technicians", []);
  const getTechnician  = (id) => getTechnicians().find((t) => t.id === id) || null;
  const getInventory   = () => _get("bb_inventory", []);
  const getInventoryItem = (id) => getInventory().find((i) => i.id === id) || null;

  function adjustInventory(itemId, delta, reason, ref) {
    const inv = getInventory();
    const item = inv.find((i) => i.id === itemId);
    if (!item) return null;
    item.qtyOnHand = Math.max(0, Math.round((item.qtyOnHand + delta) * 100) / 100);
    _set("bb_inventory", inv);
    log("inventory", itemId, "system", (delta < 0 ? "consumed " : "restocked ") + Math.abs(delta) + " " + item.unit + " (" + reason + ")", ref);
    return item;
  }

  /* ---------- customers ---------- */
  const getCustomers = () => _get("bb_customers", []);
  const getCustomer  = (id) => getCustomers().find((c) => c.id === id) || null;

  function upsertCustomer(data) {
    const customers = getCustomers();
    const email = (data.email || "").trim().toLowerCase();
    let cust = email ? customers.find((c) => c.email === email) : null;
    if (cust) {
      Object.assign(cust, { name: data.name, phone: data.phone, address: data.address, region: data.region });
    } else {
      cust = { id: genCustomerId(), name: data.name, email: email, phone: data.phone,
               address: data.address, region: data.region, createdAt: new Date().toISOString() };
      customers.push(cust);
    }
    _set("bb_customers", customers);
    return cust;
  }

  /* ---------- bookings ---------- */
  const getBookings = (filter) => {
    let list = _get("bb_bookings", []);
    if (filter && filter.status) list = list.filter((b) => b.status === filter.status);
    return list;
  };
  const getBooking = (id) => getBookings().find((b) => b.id === id) || null;

  function createBooking(payload) {
    const cust = upsertCustomer(payload.customer);
    const services = (payload.services || []).map((s) => {
      const svc = getService(s.id);
      const qty = Math.max(1, parseInt(s.qty || 1, 10));
      return { serviceTypeId: s.id, name: svc ? svc.name : s.id, qty: qty, linePrice: (svc ? svc.basePrice : 0) * qty };
    });
    const subtotal = services.reduce((sum, s) => sum + s.linePrice, 0);
    const ecoSurcharge = payload.ecoFriendly ? Math.round(subtotal * 0.10) : 0;
    const now = new Date().toISOString();
    const booking = {
      id: genBookingId(),
      customerId: cust.id,
      customerName: cust.name,    // display snapshot — source of truth is CUSTOMER
      customerPhone: cust.phone,  // display snapshot
      services: services,
      propertyType: payload.propertyType,
      areaSize: parseInt(payload.areaSize, 10),
      severity: payload.severity,
      address: payload.address,
      region: payload.region,
      preferredDate: payload.preferredDate,
      timeSlot: payload.timeSlot,
      ecoFriendly: !!payload.ecoFriendly,
      frequency: payload.frequency || "one-time",
      subtotal: subtotal,
      ecoSurcharge: ecoSurcharge,
      total: subtotal + ecoSurcharge,
      status: "Requested",
      paid: false,
      createdAt: now,
      statusHistory: [{ status: "Requested", at: now, by: "customer" }]
    };
    const bookings = getBookings();
    bookings.push(booking);
    _set("bb_bookings", bookings);
    log("booking", booking.id, "customer", "Booking created (" + services.length + " service(s), total " + booking.total + ")");
    notify("New booking " + booking.id + " from " + cust.name);
    return booking;
  }

  const STATUS_FLOW = ["Requested", "Confirmed", "Technician Assigned", "In Progress", "Completed"];

  function _setStatus(booking, status, by) {
    booking.status = status;
    booking.statusHistory.push({ status: status, at: new Date().toISOString(), by: by || "system" });
  }
  function _saveBooking(updated) {
    const bookings = getBookings();
    const i = bookings.findIndex((b) => b.id === updated.id);
    if (i >= 0) { bookings[i] = updated; _set("bb_bookings", bookings); }
    return updated;
  }

  function markPaid(bookingId) {
    const b = getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    b.paid = true;
    return { ok: true, booking: _saveBooking(b) };
  }
  function confirmBooking(bookingId, by) {
    const b = getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "Requested") return { ok: false, error: "Only a Requested booking can be confirmed." };
    _setStatus(b, "Confirmed", by || "coordinator");
    log("booking", b.id, by || "coordinator", "Booking confirmed");
    return { ok: true, booking: _saveBooking(b) };
  }
  function cancelBooking(bookingId, by) {
    const b = getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status === "Completed") return { ok: false, error: "A completed booking cannot be cancelled." };
    _setStatus(b, "Cancelled", by || "coordinator");
    log("booking", b.id, by || "coordinator", "Booking cancelled");
    return { ok: true, booking: _saveBooking(b) };
  }

  /* ---------- appointments / technician assignment ---------- */
  const getAppointments = () => _get("bb_appointments", []);
  const getAppointmentByBooking = (bookingId) =>
    getAppointments().find((a) => a.bookingId === bookingId && a.status !== "Cancelled") || null;

  function assignTechnician(bookingId, technicianId, by) {
    const b = getBooking(bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "Requested" && b.status !== "Confirmed")
      return { ok: false, error: "Booking is already assigned, in progress, or closed." };
    const tech = getTechnician(technicianId);
    if (!tech) return { ok: false, error: "Technician does not exist." };
    // Range/clash control: same technician + same date + same slot = double-booking.
    const clash = getAppointments().some((a) =>
      a.technicianId === technicianId && a.scheduledDate === b.preferredDate &&
      a.timeSlot === b.timeSlot && a.status !== "Cancelled");
    if (clash) return { ok: false, error: tech.name + " is already booked for " + b.preferredDate + " " + b.timeSlot + "." };

    const appt = {
      id: genAppointmentId(), bookingId: bookingId, technicianId: technicianId,
      scheduledDate: b.preferredDate, timeSlot: b.timeSlot, status: "Scheduled"
    };
    const appts = getAppointments();
    appts.push(appt);
    _set("bb_appointments", appts);
    _setStatus(b, "Technician Assigned", by || "coordinator");
    _saveBooking(b);
    log("appointment", appt.id, by || "coordinator", "Assigned " + tech.name + " to " + bookingId);
    notify(tech.name + " assigned to " + bookingId);
    return { ok: true, appointment: appt };
  }

  function startService(bookingId, by) {
    const b = getBooking(bookingId);
    const appt = getAppointmentByBooking(bookingId);
    if (!b || !appt) return { ok: false, error: "No scheduled appointment for this booking." };
    if (b.status !== "Technician Assigned") return { ok: false, error: "Booking must be assigned before starting." };
    appt.status = "In Progress"; _set("bb_appointments", getAppointments().map((a) => a.id === appt.id ? appt : a));
    _setStatus(b, "In Progress", by || "technician"); _saveBooking(b);
    log("appointment", appt.id, by || "technician", "Service started");
    return { ok: true };
  }

  /* ---------- service reports (decrement inventory via chemicals used) ---------- */
  const getReports = () => _get("bb_reports", []);
  const getReportByBooking = (bookingId) => getReports().find((r) => r.bookingId === bookingId) || null;

  // Suggested chemical usage from the BOM of the booking's services.
  function suggestedChemicals(bookingId) {
    const b = getBooking(bookingId);
    if (!b) return [];
    const acc = {};
    b.services.forEach((s) => getBOM(s.serviceTypeId).forEach((line) => {
      acc[line.item] = (acc[line.item] || 0) + line.qtyPerJob * s.qty;
    }));
    return Object.keys(acc).map((item) => ({ item: item, qtyUsed: acc[item] }));
  }

  function fileReport(appointmentId, data) {
    const appt = getAppointments().find((a) => a.id === appointmentId);
    if (!appt) return { ok: false, error: "Appointment not found." };
    if (getReports().some((r) => r.appointmentId === appointmentId))
      return { ok: false, error: "A report already exists for this appointment." };
    const b = getBooking(appt.bookingId);

    const report = {
      id: genReportId(), appointmentId: appointmentId, bookingId: appt.bookingId,
      technicianId: appt.technicianId,
      pestsTreated: data.pestsTreated || [],
      severity: data.severity,
      areaTreated: parseInt(data.areaTreated, 10),
      chemicals: (data.chemicals || []).filter((c) => c.item && c.qtyUsed > 0),
      outcome: data.outcome,
      notes: data.notes || "",
      completedAt: new Date().toISOString()
    };
    const reports = getReports();
    reports.push(report);
    _set("bb_reports", reports);

    // decrement inventory
    report.chemicals.forEach((c) => adjustInventory(c.item, -Math.abs(c.qtyUsed), "service report", report.id));

    appt.status = "Completed";
    _set("bb_appointments", getAppointments().map((a) => a.id === appt.id ? appt : a));
    if (b) { _setStatus(b, "Completed", "technician"); _saveBooking(b); }
    log("report", report.id, "technician", "Service report filed for " + appt.bookingId);
    notify("Report " + report.id + " filed; inventory updated");
    return { ok: true, report: report };
  }

  /* ---------- feedback ---------- */
  function getFeedback() {
    const real = _get("bb_feedback", null);
    return real === null ? BB_DATA.seedFeedback.slice() : real;
  }
  function submitFeedback(payload) {
    const b = getBooking(payload.bookingId);
    if (!b) return { ok: false, error: "Booking not found." };
    if (b.status !== "Completed") return { ok: false, error: "Feedback is available only after the service is Completed." };
    const appt = getAppointmentByBooking(payload.bookingId);
    const apptId = appt ? appt.id : null;
    const list = getFeedback();
    if (apptId && list.some((f) => f.appointmentId === apptId))
      return { ok: false, error: "Feedback has already been submitted for this service." };
    const fb = {
      id: genFeedbackId(), appointmentId: apptId, bookingId: b.id,
      service: b.services[0] ? b.services[0].serviceTypeId : null,
      rating: parseInt(payload.rating, 10), comments: payload.comments || "",
      submittedAt: new Date().toISOString()
    };
    list.push(fb);
    _set("bb_feedback", list);
    log("feedback", fb.id, "customer", "Feedback " + fb.rating + "★ for " + b.id);
    return { ok: true, feedback: fb };
  }
  function feedbackSummary() {
    const list = getFeedback();
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach((f) => { if (dist[f.rating] != null) dist[f.rating]++; });
    const avg = list.length ? list.reduce((s, f) => s + f.rating, 0) / list.length : 0;
    return { count: list.length, avg: Math.round(avg * 10) / 10, dist: dist };
  }

  /* ---------- audit ledger + notifications ---------- */
  function log(entity, entityId, actor, detail, ref) {
    const ledger = _get("bb_ledger", []);
    ledger.unshift({ id: "LG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      at: new Date().toISOString(), actor: actor, entity: entity, entityId: entityId, detail: detail, ref: ref || null });
    _set("bb_ledger", ledger.slice(0, 500));
  }
  const getLedger = () => _get("bb_ledger", []);
  function notify(message) {
    const n = _get("bb_notifs", []);
    n.unshift({ id: "N-" + Date.now(), at: new Date().toISOString(), message: message, read: false });
    _set("bb_notifs", n.slice(0, 100));
  }
  const getNotifs = () => _get("bb_notifs", []);

  /* ---------- analytics ---------- */
  function getKpis() {
    const b = getBookings();
    const today = new Date().toISOString().slice(0, 10);
    const inv = getInventory();
    return {
      total: b.length,
      today: b.filter((x) => (x.createdAt || "").slice(0, 10) === today).length,
      pending: b.filter((x) => x.status === "Requested" || x.status === "Confirmed").length,
      assigned: b.filter((x) => x.status === "Technician Assigned").length,
      inProgress: b.filter((x) => x.status === "In Progress").length,
      completed: b.filter((x) => x.status === "Completed").length,
      revenue: b.filter((x) => x.status === "Completed").reduce((s, x) => s + x.total, 0),
      lowStock: inv.filter((i) => i.qtyOnHand <= i.reorderLevel).length,
      avgRating: feedbackSummary().avg
    };
  }
  function statusMix() {
    const counts = {};
    ["Requested", "Confirmed", "Technician Assigned", "In Progress", "Completed", "Cancelled"]
      .forEach((s) => counts[s] = 0);
    getBookings().forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return counts;
  }
  function topServices() {
    const counts = {};
    getBookings().forEach((b) => b.services.forEach((s) => {
      counts[s.serviceTypeId] = (counts[s.serviceTypeId] || 0) + s.qty;
    }));
    return Object.keys(counts).map((id) => ({ id: id, name: serviceName(id), count: counts[id] }))
      .sort((a, b) => b.count - a.count);
  }
  function bookingsOverTime(days) {
    days = days || 7;
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ date: d, count: getBookings().filter((b) => (b.createdAt || "").slice(0, 10) === d).length });
    }
    return out;
  }

  /* ---------- formatting helpers ---------- */
  const money = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
  const STATUSES = STATUS_FLOW.slice();

  /* ---------- init + demo seed ---------- */
  function seedDemo() {
    // Booking A — completed (drives tracking, reports, analytics, feedback)
    const a = createBooking({
      customer: { name: "Sari Wulandari", email: "sari@example.com", phone: "081234500001", address: "Jl. Kaliurang KM 5, Yogyakarta", region: "Yogyakarta" },
      services: [{ id: "SVC-GEN", qty: 1 }], propertyType: "house", areaSize: 90, severity: "medium",
      address: "Jl. Kaliurang KM 5, Yogyakarta", region: "Yogyakarta",
      preferredDate: new Date().toISOString().slice(0, 10), timeSlot: "08:00-10:00", ecoFriendly: true, frequency: "one-time"
    });
    markPaid(a.id); confirmBooking(a.id, "coordinator");
    const ra = assignTechnician(a.id, "TC-02", "coordinator");
    if (ra.ok) {
      startService(a.id, "technician");
      fileReport(ra.appointment.id, {
        pestsTreated: ["Ants", "Spiders"], severity: "medium", areaTreated: 90,
        chemicals: suggestedChemicals(a.id), outcome: "Treated", notes: "Perimeter sprayed; advised re-treat in 30 days."
      });
      submitFeedback({ bookingId: a.id, rating: 5, comments: "Cepat, rapi, dan ramah. Hama langsung berkurang." });
    }
    // Booking B — technician assigned (awaiting service)
    const b = createBooking({
      customer: { name: "Joko Susilo", email: "joko@example.com", phone: "081234500002", address: "Jl. Magelang KM 7, Sleman", region: "Sleman" },
      services: [{ id: "SVC-TRM", qty: 1 }], propertyType: "office", areaSize: 150, severity: "high",
      address: "Jl. Magelang KM 7, Sleman", region: "Sleman",
      preferredDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), timeSlot: "10:00-12:00", ecoFriendly: false, frequency: "one-time"
    });
    markPaid(b.id); confirmBooking(b.id, "coordinator"); assignTechnician(b.id, "TC-04", "coordinator");
    // Booking C — fresh request (awaiting confirmation)
    createBooking({
      customer: { name: "Rina Hartati", email: "rina@example.com", phone: "081234500003", address: "Jl. Parangtritis KM 4, Bantul", region: "Bantul" },
      services: [{ id: "SVC-CKR", qty: 1 }, { id: "SVC-ROD", qty: 1 }], propertyType: "apartment", areaSize: 60, severity: "low",
      address: "Jl. Parangtritis KM 4, Bantul", region: "Bantul",
      preferredDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), timeSlot: "13:00-15:00", ecoFriendly: true, frequency: "monthly"
    });
  }

  function init() {
    if (_get("bb_seeded", null)) return;
    _set("bb_technicians", JSON.parse(JSON.stringify(BB_DATA.technicians)));
    _set("bb_inventory", JSON.parse(JSON.stringify(BB_DATA.inventory)));
    _set("bb_feedback", JSON.parse(JSON.stringify(BB_DATA.seedFeedback)));
    _set("bb_store_status", { open: true, since: new Date().toISOString() });
    try { seedDemo(); } catch (e) { console.warn("[BugBuster] demo seed skipped:", e); }
    _set("bb_seeded", "1");
    console.info("[BugBuster] storage seeded.");
  }

  function resetDemo() {
    ["bb_customers","bb_bookings","bb_appointments","bb_reports","bb_feedback",
     "bb_technicians","bb_inventory","bb_ledger","bb_notifs","bb_store_status","bb_seq","bb_seeded"]
      .forEach((k) => localStorage.removeItem(k));
    init();
  }

  return {
    _get, _set, init, resetDemo,
    // catalog
    getServices, getService, serviceName, getOptions, getBOM,
    // technicians / inventory
    getTechnicians, getTechnician, getInventory, getInventoryItem, adjustInventory,
    // customers
    getCustomers, getCustomer, upsertCustomer,
    // bookings
    getBookings, getBooking, createBooking, confirmBooking, cancelBooking, markPaid,
    // appointments
    getAppointments, getAppointmentByBooking, assignTechnician, startService,
    // reports
    getReports, getReportByBooking, suggestedChemicals, fileReport,
    // feedback
    getFeedback, submitFeedback, feedbackSummary,
    // audit / notifs / analytics
    getLedger, getNotifs, getKpis, statusMix, topServices, bookingsOverTime,
    // helpers
    money, luhnValid, validBookingId, STATUSES
  };
})();

window.Storage = Storage;
Storage.init();
