/* =====================================================================
   BugBuster Pro — js/i18n.js
   Full EN <-> ID language toggle for the WHOLE app (customer + admin).
   Approach: translate the rendered DOM (static text, attributes, and
   anything the other scripts render dynamically) through a dictionary,
   kept in sync by a MutationObserver. No app logic is modified; stored
   values (status codes, option values, IDs) are never changed — only
   display text and placeholders. Choice persists in bb_lang.
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- exact-phrase dictionary (English -> Indonesian) ---------- */
  var DICT = {
    /* nav / footer / global */
    "Services": "Layanan", "Track": "Lacak", "Feedback": "Umpan Balik", "Book now": "Pesan Sekarang",
    "Service Management Module · demo prototype for coursework.": "Service Management Module · prototipe demo untuk tugas kuliah.",
    "Staff login →": "Login staf →", "← Customer site": "← Situs pelanggan", "Staff login": "Login staf",

    /* landing */
    "Pest control · Yogyakarta & around": "Pengendalian hama · Yogyakarta & sekitarnya",
    "Pests handled.": "Hama tuntas.", "Same week.": "Minggu ini juga.",
    "Book a licensed technician, follow the job from request to done, and get a written service report — all from your phone.": "Pesan teknisi bersertifikat, pantau pekerjaan dari permintaan sampai selesai, dan dapatkan laporan layanan tertulis — semua dari ponsel Anda.",
    "Book a service": "Pesan layanan", "Track my booking": "Lacak pesanan saya",
    "service types": "jenis layanan", "field technicians": "teknisi lapangan", "regions covered": "wilayah dilayani",
    "What we treat": "Yang kami tangani", "View all services →": "Lihat semua layanan →",
    "How it works": "Cara kerja", "Request to resolved": "Dari permintaan hingga selesai",
    "STEP 01": "LANGKAH 01", "STEP 02": "LANGKAH 02", "STEP 03": "LANGKAH 03",
    "Book online": "Pesan online",
    "Pick your service, property details, and a time slot. Confirm with a simulated payment.": "Pilih layanan, detail properti, dan slot waktu. Konfirmasi dengan pembayaran simulasi.",
    "We assign a technician": "Kami menugaskan teknisi",
    "A coordinator confirms your booking and assigns a licensed technician to your slot.": "Koordinator mengonfirmasi pesanan Anda dan menugaskan teknisi bersertifikat ke slot Anda.",
    "Track & get your report": "Lacak & dapatkan laporan",
    "Watch the status update live, then read the full service report and leave feedback.": "Pantau status secara langsung, lalu baca laporan layanan lengkap dan beri umpan balik.",
    "Got a pest problem?": "Punya masalah hama?", "Get a licensed technician out this week.": "Dapatkan teknisi bersertifikat minggu ini.",
    "Today": "Hari ini",

    /* service names */
    "General Pest Control": "Pengendalian Hama Umum", "Anti-Termite": "Anti-Rayap", "Rodent Control": "Pengendalian Tikus",
    "Cockroach Control": "Pengendalian Kecoa", "Mosquito Fogging": "Fogging Nyamuk", "Bedbug Treatment": "Penanganan Kutu Busuk",
    "Fumigation": "Fumigasi",
    /* service descriptions */
    "Routine spray + barrier treatment for ants, spiders, and common household pests.": "Penyemprotan rutin + perlindungan untuk semut, laba-laba, dan hama rumah tangga umum.",
    "Soil and wood termiticide treatment with a follow-up inspection.": "Perlakuan termitisida pada tanah dan kayu dengan inspeksi lanjutan.",
    "Baiting, trapping, and entry-point sealing for rats and mice.": "Pengumpanan, perangkap, dan penutupan jalur masuk untuk tikus.",
    "Gel bait + crack-and-crevice treatment targeting nesting sites.": "Umpan gel + perlakuan celah-retakan menyasar sarang.",
    "Thermal/cold fogging for outdoor and perimeter mosquito reduction.": "Fogging termal/dingin untuk mengurangi nyamuk di area luar dan sekeliling.",
    "Targeted aerosol + steam treatment for mattresses and furniture.": "Aerosol + perlakuan uap tertarget untuk kasur dan furnitur.",
    "Whole-structure fumigation for heavy infestations (vacate required).": "Fumigasi seluruh bangunan untuk serangan berat (harus dikosongkan).",

    /* catalog */
    "Catalog": "Katalog", "Pest control services": "Layanan pengendalian hama",
    "Transparent pricing. Every job includes a written service report.": "Harga transparan. Setiap pekerjaan termasuk laporan layanan tertulis.",
    "Sort by": "Urutkan", "Recommended": "Rekomendasi", "Price: low to high": "Harga: rendah ke tinggi",
    "Price: high to low": "Harga: tinggi ke rendah", "Duration: shortest": "Durasi: tercepat",
    "Start a booking →": "Mulai pesan →", "Add to booking": "Tambah ke pesanan",

    /* booking form */
    "New booking": "Pesanan baru",
    "1 · Details": "1 · Detail", "2 · Payment": "2 · Pembayaran", "3 · Track": "3 · Lacak",
    "No service selected yet. Add one above.": "Belum ada layanan dipilih. Tambahkan di atas.",
    "+ Add a service…": "+ Tambah layanan…", "Your details": "Detail Anda",
    "Full name": "Nama lengkap", "Email": "Email", "Phone": "Telepon", "Service address": "Alamat layanan",
    "Region": "Wilayah", "Select a region…": "Pilih wilayah…", "Property & pest": "Properti & hama",
    "Property type": "Jenis properti",
    "🏠 House": "🏠 Rumah", "🏢 Apartment": "🏢 Apartemen", "🏬 Office": "🏬 Kantor", "🏭 Warehouse": "🏭 Gudang",
    "Area size (m²)": "Luas area (m²)", "Pest severity": "Tingkat keparahan", "Select…": "Pilih…",
    "Low — a few sightings": "Rendah — beberapa terlihat", "Medium — recurring activity": "Sedang — aktivitas berulang",
    "High — heavy infestation": "Tinggi — serangan berat", "Schedule & options": "Jadwal & opsi",
    "Preferred date": "Tanggal diinginkan", "Time slot": "Slot waktu", "Frequency": "Frekuensi",
    "One-time": "Sekali", "Recurring — monthly": "Berulang — bulanan", "Recurring — quarterly": "Berulang — tiga bulanan",
    "Eco-friendly chemicals": "Bahan kimia ramah lingkungan",
    "Low-toxicity, pet & child safe (+10%)": "Toksisitas rendah, aman hewan & anak (+10%)",
    "Summary": "Ringkasan", "Review before payment": "Tinjau sebelum pembayaran",
    "Subtotal": "Subtotal", "Eco surcharge": "Biaya eco", "Total": "Total",
    "Continue to payment →": "Lanjut ke pembayaran →", "No charge yet · payment is simulated": "Belum ada tagihan · pembayaran disimulasikan",
    "Remove": "Hapus",
    /* placeholders (book) */
    "e.g. Sari Wulandari": "mis. Sari Wulandari", "you@email.com": "anda@email.com",
    "Street, number, neighbourhood": "Jalan, nomor, lingkungan", "e.g. 90": "mis. 90",

    /* checkout */
    "Confirm & pay": "Konfirmasi & bayar", "Payment": "Pembayaran", "SIMULATED": "SIMULASI",
    "No real payment is processed. The card number is checked with the Luhn self-checking formula only — a demonstration of a check-digit control.": "Tidak ada pembayaran nyata yang diproses. Nomor kartu hanya diperiksa dengan formula self-checking Luhn — demonstrasi kontrol check-digit.",
    "Cardholder name": "Nama pemegang kartu", "Card number": "Nomor kartu",
    "Use a Luhn-valid test number, e.g. 4242 4242 4242 4242": "Gunakan nomor uji valid-Luhn, mis. 4242 4242 4242 4242",
    "Pay & confirm booking": "Bayar & konfirmasi pesanan", "← Back to details": "← Kembali ke detail",
    "Order summary": "Ringkasan pesanan", "Name on card": "Nama di kartu",
    "Eco-friendly chemicals (+10%)": "Bahan kimia ramah lingkungan (+10%)", "Total due": "Total tagihan",
    "Service date": "Tanggal layanan", "Property": "Properti", "Location": "Lokasi",
    "Booking confirmed": "Pesanan dikonfirmasi",
    "We've received your request. A coordinator will confirm and assign a technician shortly.": "Permintaan Anda telah kami terima. Koordinator akan segera mengonfirmasi dan menugaskan teknisi.",
    "Save this booking ID — you'll use it to track your service.": "Simpan ID pesanan ini — Anda akan memakainya untuk melacak layanan.",
    "Track this service": "Lacak layanan ini", "Book another": "Pesan lagi",

    /* tracking */
    "Tracking": "Pelacakan", "Track your service": "Lacak layanan Anda",
    "Enter your booking ID to see live status, your assigned technician, and the service report.": "Masukkan ID pesanan untuk melihat status langsung, teknisi yang ditugaskan, dan laporan layanan.",
    "Booking ID": "ID pesanan",
    "Tip: try a seeded demo booking — open the dashboard to copy an ID, or book one yourself.": "Tip: coba pesanan demo bawaan — buka dashboard untuk menyalin ID, atau pesan sendiri.",
    "Activity": "Aktivitas", "pending": "menunggu", "Technician": "Teknisi", "Not assigned yet.": "Belum ditugaskan.",
    "Service report": "Laporan layanan", "Pests treated": "Hama yang ditangani", "Area treated": "Area ditangani",
    "Outcome": "Hasil", "Chemicals": "Bahan kimia", "Your feedback": "Umpan balik Anda",
    "Leave feedback": "Beri umpan balik", "How was the service?": "Bagaimana layanannya?", "Submit feedback": "Kirim umpan balik",
    "Tell us what went well or what we can improve…": "Ceritakan apa yang baik atau yang bisa kami tingkatkan…",
    "This booking was cancelled. Contact us to rebook.": "Pesanan ini dibatalkan. Hubungi kami untuk memesan ulang.",

    /* feedback page */
    "What customers say": "Kata pelanggan",
    "Every review here is tied to a completed service — no cherry-picking.": "Setiap ulasan di sini terkait layanan yang selesai — tanpa pilih-pilih.",
    "based on": "berdasarkan", "reviews": "ulasan", "No feedback yet.": "Belum ada umpan balik.",

    /* statuses (Title Case + UPPERCASE for badges) */
    "Requested": "Diminta", "Confirmed": "Dikonfirmasi", "Technician Assigned": "Teknisi Ditugaskan",
    "In Progress": "Sedang Dikerjakan", "Completed": "Selesai", "Cancelled": "Dibatalkan",
    "REQUESTED": "DIMINTA", "CONFIRMED": "DIKONFIRMASI", "TECHNICIAN ASSIGNED": "TEKNISI DITUGASKAN",
    "IN PROGRESS": "SEDANG DIKERJAKAN", "COMPLETED": "SELESAI", "CANCELLED": "DIBATALKAN",

    /* validation messages */
    "Enter the customer name.": "Masukkan nama pelanggan.", "Name must be 2–60 letters.": "Nama harus 2–60 huruf.",
    "Enter an email address.": "Masukkan alamat email.", "Enter a valid email (name@domain.com).": "Masukkan email valid (nama@domain.com).",
    "Enter a phone number.": "Masukkan nomor telepon.", "Phone may contain digits only.": "Telepon hanya boleh angka.",
    "Phone must be 9–15 digits.": "Telepon harus 9–15 digit.", "Enter the service address (min 5 characters).": "Masukkan alamat layanan (min 5 karakter).",
    "Select a serviced region.": "Pilih wilayah yang dilayani.", "Select at least one service.": "Pilih minimal satu layanan.",
    "Unknown service selected.": "Layanan tidak dikenal dipilih.", "Choose a property type.": "Pilih jenis properti.",
    "Enter the area size in m².": "Masukkan luas area dalam m².", "Area size must be numeric.": "Luas area harus berupa angka.",
    "Area size must be between 1 and 100000 m².": "Luas area harus antara 1 dan 100000 m².", "Select the severity.": "Pilih tingkat keparahan.",
    "Pick a preferred date.": "Pilih tanggal yang diinginkan.", "Date cannot be in the past.": "Tanggal tidak boleh di masa lalu.",
    "Choose a time slot.": "Pilih slot waktu.", "Choose a frequency.": "Pilih frekuensi.",
    "Select at least one pest treated.": "Pilih minimal satu hama yang ditangani.", "Select the severity observed.": "Pilih tingkat keparahan yang teramati.",
    "Area treated must be numeric.": "Area yang ditangani harus angka.", "Area treated must be 1–100000 m².": "Area yang ditangani harus 1–100000 m².",
    "Select an outcome.": "Pilih hasil.", "Notes must be 500 characters or fewer.": "Catatan maksimal 500 karakter.",
    "Unknown chemical referenced.": "Bahan kimia tidak dikenal.", "Chemical quantity must be greater than 0.": "Jumlah bahan kimia harus lebih dari 0.",
    "Select a star rating.": "Pilih rating bintang.", "Rating must be 1–5.": "Rating harus 1–5.",
    "Comment must be 1000 characters or fewer.": "Komentar maksimal 1000 karakter.",
    "Enter your booking ID.": "Masukkan ID pesanan Anda.",
    "That booking ID fails its check digit — please re-check.": "ID pesanan gagal check digit — mohon periksa lagi.",
    "No booking found with that ID.": "Tidak ada pesanan dengan ID tersebut.",
    "Enter the cardholder name.": "Masukkan nama pemegang kartu.", "Card number may contain digits only.": "Nomor kartu hanya boleh angka.",
    "Card number must be 13–19 digits.": "Nomor kartu harus 13–19 digit.", "Card number fails the Luhn check — please re-check.": "Nomor kartu gagal cek Luhn — mohon periksa lagi.",

    /* customer toasts */
    "Please fix the highlighted fields.": "Mohon perbaiki kolom yang ditandai.", "Payment details look off.": "Detail pembayaran tampak keliru.",
    "Thanks for your feedback!": "Terima kasih atas umpan baliknya!",

    /* admin login */
    "Staff console": "Konsol staf", "Coordinators & managers only.": "Khusus koordinator & manajer.",
    "Username": "Nama pengguna", "Password": "Kata sandi", "Sign in": "Masuk", "Demo-grade auth.": "Autentikasi tingkat demo.",
    "This prototype gates the console with a localStorage flag, not a real identity system. Use": "Prototipe ini menjaga konsol dengan flag localStorage, bukan sistem identitas nyata. Gunakan",
    "Invalid credentials. Try admin / bugbuster.": "Kredensial salah. Coba admin / bugbuster.",

    /* admin shell */
    "Dispatch console": "Konsol dispatch", "localStorage mode": "mode localStorage", "● live sync": "● sinkron langsung",
    "Sign out": "Keluar", "↺ Reset demo data": "↺ Reset data demo",

    /* admin nav + views */
    "Dashboard": "Dasbor", "Bookings": "Pesanan", "Schedule": "Jadwal", "Reports": "Laporan",
    "Inventory": "Inventaris", "Customers": "Pelanggan", "Analytics": "Analitik",
    "Today at a glance": "Hari ini sekilas", "Overview": "Ikhtisar", "Bookings today": "Pesanan hari ini",
    "Pending": "Tertunda", "Assigned": "Ditugaskan", "In progress": "Sedang berjalan",
    "Revenue": "Pendapatan", "Low stock": "Stok menipis", "Avg rating": "Rating rata-rata",
    "Recent activity": "Aktivitas terbaru", "No activity yet.": "Belum ada aktivitas.",
    "Low-stock alerts": "Peringatan stok menipis", "Operations": "Operasi",
    "Dispatch": "Dispatch", "All statuses": "Semua status", "Filter": "Filter", "Customer": "Pelanggan",
    "Date": "Tanggal", "Status": "Status", "Actions": "Aksi", "Action": "Aksi",
    "Confirm": "Konfirmasi", "Cancel": "Batalkan", "No bookings in this view.": "Tidak ada pesanan di tampilan ini.",
    "Paid": "Lunas", "unpaid": "belum bayar",
    "Region": "Wilayah", "When": "Kapan", "Item": "Item", "On hand": "Tersedia", "Reorder": "Reorder",
    "Stock": "Stok", "Pests": "Hama", "Area": "Area", "Appt": "Janji", "Date / slot": "Tanggal / slot",
    "Ref": "Ref", "Contact": "Kontak", "Name": "Nama", "Change": "Ubah", "Adjust": "Sesuaikan", "Apply": "Terapkan",
    "Assign": "Tugaskan", "Start service": "Mulai layanan", "File report": "Isi laporan", "Close": "Tutup",
    "Field": "Lapangan", "Awaiting a technician": "Menunggu teknisi", "Scheduled appointments": "Janji terjadwal",
    "No appointments awaiting a report.": "Tidak ada janji yang menunggu laporan.", "No appointments scheduled yet.": "Belum ada janji terjadwal.",
    "Choose technician…": "Pilih teknisi…", "Pick a technician first.": "Pilih teknisi dulu.", "Awaiting report": "Menunggu laporan",
    "Service reports": "Laporan layanan", "Filed reports": "Laporan terisi", "No reports filed yet.": "Belum ada laporan terisi.",
    "Severity observed": "Keparahan teramati", "Chemicals used": "Bahan kimia terpakai",
    "Chemicals used (from service BOM — adjust as needed)": "Bahan kimia terpakai (dari BOM layanan — sesuaikan bila perlu)",
    "Notes": "Catatan", "Treated": "Ditangani", "Follow-up needed": "Perlu tindak lanjut", "Re-treat scheduled": "Penanganan ulang dijadwalkan",
    "Submit report": "Kirim laporan", "Fix the report fields.": "Perbaiki kolom laporan.", "Enter a non-zero quantity.": "Masukkan jumlah bukan nol.",
    "Ants": "Semut", "Cockroaches": "Kecoa", "Rats / Mice": "Tikus", "Termites": "Rayap",
    "Mosquitoes": "Nyamuk", "Bedbugs": "Kutu busuk", "Flies": "Lalat", "Other": "Lainnya",
    "Inventory ledger": "Buku besar inventaris", "No inventory movements yet.": "Belum ada pergerakan inventaris.",
    "LOW": "MENIPIS", "Low": "Menipis", "High": "Tinggi", "Medium": "Sedang",
    "CRM": "CRM", "No customers yet.": "Belum ada pelanggan.",
    "Insight": "Insight", "Bookings · last 7 days": "Pesanan · 7 hari terakhir", "Top services": "Layanan teratas",
    "Status mix": "Komposisi status", "No data yet.": "Belum ada data.", "Export CSV": "Ekspor CSV",
    "Booking cancelled": "Pesanan dibatalkan", "Service started": "Layanan dimulai", "Demo data reset": "Data demo direset",
    "CSV exported": "CSV diekspor", "Reset all demo data to its seeded state?": "Reset semua data demo ke kondisi awal?"
  };

  /* ---------- build reverse map (Indonesian -> English) ---------- */
  var REV = {};
  for (var k in DICT) { if (DICT.hasOwnProperty(k) && !(DICT[k] in REV)) REV[DICT[k]] = k; }

  /* ---------- dynamic-pattern rules (composite strings) ----------
     Each rule is applied in the active direction; wm() maps embedded
     words (service / technician names) using the active phrase map. */
  function ruleSet(forward) {
    var EM = "—";
    return [
      { re: /^(.+) × (\d+)$/,                      f: function (m, wm) { return wm(m[1]) + " × " + m[2]; } },
      { re: new RegExp("^(.+) " + EM + " (Rp .+)$"), f: function (m, wm) { return wm(m[1]) + " " + EM + " " + m[2]; } },
      forward
        ? { re: /^(.+) each$/,                      f: function (m, wm) { return wm(m[1]) + " / item"; } }
        : { re: /^(.+) \/ item$/,                   f: function (m, wm) { return wm(m[1]) + " each"; } },
      forward
        ? { re: /^File report · (.+)$/,             f: function (m) { return "Isi laporan · " + m[1]; } }
        : { re: /^Isi laporan · (.+)$/,             f: function (m) { return "File report · " + m[1]; } },
      forward
        ? { re: /^Booking created \((.+)\)$/,       f: function (m) { return "Pesanan dibuat (" + m[1] + ")"; } }
        : { re: /^Pesanan dibuat \((.+)\)$/,        f: function (m) { return "Booking created (" + m[1] + ")"; } },
      forward
        ? { re: /^Assigned (.+) to (.+)$/,          f: function (m, wm) { return "Menugaskan " + wm(m[1]) + " ke " + m[2]; } }
        : { re: /^Menugaskan (.+) ke (.+)$/,        f: function (m, wm) { return "Assigned " + wm(m[1]) + " to " + m[2]; } },
      forward
        ? { re: /^Service report filed for (.+)$/,  f: function (m) { return "Laporan layanan diisi untuk " + m[1]; } }
        : { re: /^Laporan layanan diisi untuk (.+)$/, f: function (m) { return "Service report filed for " + m[1]; } },
      forward
        ? { re: /^consumed (.+)$/,                  f: function (m) { return "terpakai " + m[1]; } }
        : { re: /^terpakai (.+)$/,                  f: function (m) { return "consumed " + m[1]; } },
      forward
        ? { re: /^restocked (.+)$/,                 f: function (m) { return "ditambah " + m[1]; } }
        : { re: /^ditambah (.+)$/,                  f: function (m) { return "restocked " + m[1]; } },
      forward
        ? { re: /^Feedback (\d)★ for (.+)$/,        f: function (m) { return "Feedback " + m[1] + "★ untuk " + m[2]; } }
        : { re: /^Feedback (\d)★ untuk (.+)$/,      f: function (m) { return "Feedback " + m[1] + "★ for " + m[2]; } },
      /* forward-only transient toasts (no need to revert; they vanish) */
      forward ? { re: /^(.+) added$/,                       f: function (m, wm) { return wm(m[1]) + " ditambahkan"; } } : null,
      forward ? { re: /^Booking (.+) created$/,             f: function (m) { return "Pesanan " + m[1] + " dibuat"; } } : null,
      forward ? { re: /^Technician assigned to (.+)$/,      f: function (m) { return "Teknisi ditugaskan ke " + m[1]; } } : null,
      forward ? { re: /^(.+) is already booked for (.+)\.$/, f: function (m, wm) { return wm(m[1]) + " sudah dibooking untuk " + m[2] + "."; } } : null,
      forward ? { re: /^Quantity exceeds stock on hand for (.+)\.$/, f: function (m) { return "Jumlah melebihi stok untuk " + m[1] + "."; } } : null,
      forward ? { re: /^(.+) adjusted by (.+)$/,            f: function (m) { return m[1] + " disesuaikan " + m[2]; } } : null
    ].filter(Boolean);
  }
  var FWD = ruleSet(true), RVS = ruleSet(false);

  /* ---------- core string translator ---------- */
  function translateString(raw, lang) {
    if (raw == null) return raw;
    var lead = (raw.match(/^\s*/) || [""])[0];
    var tail = (raw.match(/\s*$/) || [""])[0];
    var core = raw.slice(lead.length, raw.length - tail.length);
    if (core === "") return raw;
    var PH = lang === "id" ? DICT : REV;
    var RULES = lang === "id" ? FWD : RVS;
    var wm = function (w) { return PH[w] || w; };
    var out = null;
    if (PH.hasOwnProperty(core)) out = PH[core];
    else {
      for (var i = 0; i < RULES.length; i++) {
        var m = RULES[i].re.exec(core);
        if (m) { out = RULES[i].f(m, wm); break; }
      }
    }
    if (out == null) return raw;            // leave untranslated (numbers, IDs, names)
    return lead + out + tail;
  }

  /* expose a tiny helper for non-DOM strings (e.g. confirm dialogs) */
  if (typeof window !== "undefined") {
    window.t = function (en) { return getLang() === "id" ? (DICT[en] || en) : en; };
  }

  /* ================= DOM layer (browser only) ================= */
  if (typeof document === "undefined" || typeof window === "undefined") {
    if (typeof module !== "undefined" && module.exports) module.exports = { translateString: translateString, DICT: DICT };
    return;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };
  function skipParent(node) {
    var p = node.parentNode;
    while (p && p.nodeType === 1) {
      if (SKIP_TAGS[p.nodeName]) return true;
      if (p.hasAttribute && p.hasAttribute("data-no-i18n")) return true;
      // never retranslate <option> text when the option carries no value attr
      // (that would change its submitted value) — but options WITH a value are safe.
      if (p.nodeName === "OPTION" && !p.hasAttribute("value")) return true;
      p = p.parentNode;
    }
    return false;
  }

  function getLang() { try { return localStorage.getItem("bb_lang") || "en"; } catch (e) { return "en"; } }

  function tText(node, lang) {
    if (skipParent(node)) return;
    var v = node.nodeValue;
    if (!v || !v.trim()) return;
    var nv = translateString(v, lang);
    if (nv !== v) node.nodeValue = nv;
  }
  function tAttrs(el, lang) {
    if (el.nodeType !== 1) return;
    if (el.hasAttribute && el.hasAttribute("placeholder"))
      el.setAttribute("placeholder", translateString(el.getAttribute("placeholder"), lang));
    if (el.hasAttribute && el.hasAttribute("title"))
      el.setAttribute("title", translateString(el.getAttribute("title"), lang));
  }
  function walk(root, lang) {
    if (root.nodeType === 3) { tText(root, lang); return; }
    if (root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute("data-no-i18n")) return;
    tAttrs(root, lang);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var batch = [], n;
    while ((n = tw.nextNode())) batch.push(n);
    batch.forEach(function (t) { tText(t, lang); });
    // attributes on descendants
    var els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[title]") : [];
    Array.prototype.forEach.call(els, function (e) { tAttrs(e, lang); });
  }

  var observer = null, applying = false;
  function startObserver() {
    observer = new MutationObserver(function (records) {
      if (applying) return;
      applying = true; observer.disconnect();
      var lang = getLang();
      records.forEach(function (r) {
        if (r.type === "childList") Array.prototype.forEach.call(r.addedNodes, function (nn) { walk(nn, lang); });
        else if (r.type === "characterData") tText(r.target, lang);
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      applying = false;
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  function applyAll(lang) {
    applying = true;
    if (observer) observer.disconnect();
    walk(document.body, lang);
    if (observer) observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    applying = false;
  }

  /* ---------- toggle UI ---------- */
  function injectStyle() {
    var s = document.createElement("style");
    s.textContent =
      ".lang-toggle{display:inline-flex;border:1.5px solid rgba(127,127,127,.32);border-radius:999px;overflow:hidden;font-family:var(--mono,monospace);font-size:12px;line-height:1;transition:border-color .2s}" +
      ".lang-toggle:hover{border-color:rgba(127,127,127,.5)}" +
      ".lang-toggle button{border:none;background:transparent;color:inherit;padding:6px 11px;cursor:pointer;font-weight:700;font-family:inherit;letter-spacing:.04em;transition:background .22s ease,color .22s ease}" +
      ".lang-toggle button:not(.on):hover{background:rgba(127,127,127,.12)}" +
      ".lang-toggle button.on{background:var(--amber,#f4a52a);color:#0a261f}" +
      ".lang-toggle.float{position:fixed;top:16px;right:16px;z-index:120;background:rgba(255,255,255,.08);backdrop-filter:blur(6px);box-shadow:0 10px 30px -16px rgba(0,0,0,.5)}";
    document.head.appendChild(s);
  }
  function buildToggle() {
    var wrap = document.createElement("div");
    wrap.className = "lang-toggle"; wrap.setAttribute("data-no-i18n", "");
    ["en", "id"].forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("data-lang", l); b.textContent = l.toUpperCase();
      b.addEventListener("click", function () { setLang(l); });
      wrap.appendChild(b);
    });
    var navHost = document.querySelector(".topbar");
    if (navHost) { var lo = document.getElementById("logoutBtn"); navHost.insertBefore(wrap, lo || null); return wrap; }
    navHost = document.querySelector(".nav .wrap nav");
    if (navHost) { navHost.insertBefore(wrap, navHost.firstChild); return wrap; }
    wrap.classList.add("float"); document.body.appendChild(wrap); return wrap;
  }
  var toggleEl = null;
  function paintToggle() {
    if (!toggleEl) return;
    var lang = getLang();
    Array.prototype.forEach.call(toggleEl.querySelectorAll("button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-lang") === lang);
    });
  }
  function setLang(lang) {
    try { localStorage.setItem("bb_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    paintToggle();
    applyAll(lang);
  }

  function boot() {
    injectStyle();
    toggleEl = buildToggle();
    startObserver();
    var lang = getLang();
    document.documentElement.lang = lang;
    paintToggle();
    if (lang !== "en") applyAll(lang);   // English is the base; only translate if ID
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
