/* =====================================================================
   BugBuster Pro — js/validation.js
   Input-validation engine. Each rule maps to a NAMED Kendall & Kendall
   (Ch. 15) test so the control set is defensible:
     missing data · field length · class/composition · range/reasonableness
     · invalid values · cross-reference (geographical) · comparison with
     stored data · check digit (Luhn).
   Returns { valid, errors:{field:message} }. UI renders the messages.
   ===================================================================== */

const Validate = (() => {

  /* ---- atomic tests ---- */
  const isBlank   = (v) => v == null || String(v).trim() === "";          // missing data
  const len       = (v, min, max) => { const n = String(v || "").trim().length; return n >= min && n <= max; }; // field length
  const digits    = (v) => /^[0-9]+$/.test(String(v || "").replace(/[\s+\-()]/g, "")); // class/composition
  const isEmail   = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  const nameLike  = (v) => /^[A-Za-z\u00C0-\u024F .'\-]+$/.test(String(v || "").trim());
  const inRange   = (v, min, max) => { const n = Number(v); return !isNaN(n) && n >= min && n <= max; }; // range/reasonableness
  const oneOf     = (v, set) => set.indexOf(v) !== -1;                     // invalid values
  const notPast   = (d) => { if (!d) return false; const t = new Date(); t.setHours(0,0,0,0); return new Date(d) >= t; }; // reasonableness

  function opt(name) { return Storage.getOptions()[name].map((o) => o.value || o); }

  /* ---- composed validators ---- */
  function booking(p) {
    const e = {};
    // customer
    if (isBlank(p.cust_name)) e.cust_name = "Enter the customer name.";
    else if (!len(p.cust_name, 2, 60) || !nameLike(p.cust_name)) e.cust_name = "Name must be 2–60 letters.";
    if (isBlank(p.cust_email)) e.cust_email = "Enter an email address.";
    else if (!isEmail(p.cust_email)) e.cust_email = "Enter a valid email (name@domain.com).";
    if (isBlank(p.cust_phone)) e.cust_phone = "Enter a phone number.";
    else if (!digits(p.cust_phone)) e.cust_phone = "Phone may contain digits only.";
    else if (!len(String(p.cust_phone).replace(/[\s+\-()]/g, ""), 9, 15)) e.cust_phone = "Phone must be 9–15 digits.";
    // service location
    if (isBlank(p.address) || !len(p.address, 5, 120)) e.address = "Enter the service address (min 5 characters).";
    if (!oneOf(p.region, opt("region"))) e.region = "Select a serviced region.";          // geographical cross-reference
    // services (missing data)
    if (!p.services || !p.services.length) e.services = "Select at least one service.";
    else if (p.services.some((s) => !Storage.getService(s.id))) e.services = "Unknown service selected."; // comparison w/ stored data
    // property + reasonableness
    if (!oneOf(p.propertyType, opt("propertyType"))) e.propertyType = "Choose a property type.";
    if (isBlank(p.areaSize)) e.areaSize = "Enter the area size in m².";
    else if (!digits(p.areaSize)) e.areaSize = "Area size must be numeric.";
    else if (!inRange(p.areaSize, 1, 100000)) e.areaSize = "Area size must be between 1 and 100000 m².";
    if (!oneOf(p.severity, opt("severity"))) e.severity = "Select the severity.";
    // schedule
    if (isBlank(p.preferredDate)) e.preferredDate = "Pick a preferred date.";
    else if (!notPast(p.preferredDate)) e.preferredDate = "Date cannot be in the past.";
    if (!oneOf(p.timeSlot, opt("timeSlot"))) e.timeSlot = "Choose a time slot.";
    if (!oneOf(p.frequency, opt("frequency"))) e.frequency = "Choose a frequency.";
    return { valid: Object.keys(e).length === 0, errors: e };
  }

  function report(d) {
    const e = {};
    if (!d.pestsTreated || !d.pestsTreated.length) e.pests = "Select at least one pest treated.";
    if (!oneOf(d.severity, ["low", "medium", "high"])) e.severity = "Select the severity observed.";
    if (isBlank(d.areaTreated) || !digits(d.areaTreated)) e.areaTreated = "Area treated must be numeric.";
    else if (!inRange(d.areaTreated, 1, 100000)) e.areaTreated = "Area treated must be 1–100000 m².";
    if (!oneOf(d.outcome, ["Treated", "Follow-up needed", "Re-treat scheduled"])) e.outcome = "Select an outcome.";
    if (d.notes && !len(d.notes, 0, 500)) e.notes = "Notes must be 500 characters or fewer.";
    (d.chemicals || []).forEach((c) => {
      if (!Storage.getInventoryItem(c.item)) e.chemicals = "Unknown chemical referenced.";     // comparison w/ stored data
      else if (!(Number(c.qtyUsed) > 0)) e.chemicals = "Chemical quantity must be greater than 0.";
      else {
        const onHand = Storage.getInventoryItem(c.item).qtyOnHand;
        if (Number(c.qtyUsed) > onHand) e.chemicals = "Quantity exceeds stock on hand for " + c.item + ".";  // reasonableness
      }
    });
    return { valid: Object.keys(e).length === 0, errors: e };
  }

  function feedback(d) {
    const e = {};
    if (isBlank(d.rating)) e.rating = "Select a star rating.";
    else if (!inRange(d.rating, 1, 5)) e.rating = "Rating must be 1–5.";
    if (d.comments && !len(d.comments, 0, 1000)) e.comments = "Comment must be 1000 characters or fewer.";
    return { valid: Object.keys(e).length === 0, errors: e };
  }

  function bookingIdLookup(id) {
    const e = {};
    if (isBlank(id)) e.lookup = "Enter your booking ID.";
    else if (!Storage.validBookingId(id)) e.lookup = "That booking ID fails its check digit — please re-check.";  // Luhn
    else if (!Storage.getBooking(id.trim().toUpperCase())) e.lookup = "No booking found with that ID.";           // comparison w/ stored data
    return { valid: Object.keys(e).length === 0, errors: e };
  }

  /* ---- shared inline error rendering (used by customer + admin forms) ---- */
  function clearErrors(scope) {
    scope.querySelectorAll(".field-error").forEach((el) => el.remove());
    scope.querySelectorAll(".has-error").forEach((el) => el.classList.remove("has-error"));
  }
  function showErrors(scope, errors) {
    clearErrors(scope);
    let first = null;
    Object.keys(errors).forEach((field) => {
      const target = scope.querySelector('[data-field="' + field + '"]') ||
                     scope.querySelector('[name="' + field + '"]');
      const anchor = scope.querySelector('[data-error="' + field + '"]') ||
                     (target ? target.closest(".form-row") || target.parentElement : null);
      if (anchor) {
        const msg = document.createElement("p");
        msg.className = "field-error";
        msg.textContent = errors[field];
        anchor.appendChild(msg);
        if (target) target.classList.add("has-error");
        if (!first) first = target || anchor;
      }
    });
    if (first && first.scrollIntoView) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return { booking, report, feedback, bookingIdLookup, showErrors, clearErrors,
           tests: { isBlank, len, digits, isEmail, inRange, oneOf, notPast } };
})();

window.Validate = Validate;
