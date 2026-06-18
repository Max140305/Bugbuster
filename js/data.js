/* =====================================================================
   BugBuster Pro — js/data.js
   Immutable seed catalog + demo seed. Read by storage.js on init.
   Prices in IDR. Service names are bilingual (EN / ID) per scope.
   ===================================================================== */

const BB_DATA = {
  /* ---- SERVICE_TYPE ---- */
  services: [
    { id: "SVC-GEN", name: "General Pest Control", nameId: "Hama Umum",      basePrice: 350000,  durationMin: 60,  icon: "🛡️",
      description: "Routine spray + barrier treatment for ants, spiders, and common household pests." },
    { id: "SVC-TRM", name: "Anti-Termite",         nameId: "Anti-Rayap",     basePrice: 750000,  durationMin: 120, icon: "🪵",
      description: "Soil and wood termiticide treatment with a follow-up inspection." },
    { id: "SVC-ROD", name: "Rodent Control",        nameId: "Tikus",          basePrice: 400000,  durationMin: 75,  icon: "🐀",
      description: "Baiting, trapping, and entry-point sealing for rats and mice." },
    { id: "SVC-CKR", name: "Cockroach Control",     nameId: "Kecoa",          basePrice: 300000,  durationMin: 60,  icon: "🪳",
      description: "Gel bait + crack-and-crevice treatment targeting nesting sites." },
    { id: "SVC-MOS", name: "Mosquito Fogging",      nameId: "Fogging Nyamuk", basePrice: 500000,  durationMin: 90,  icon: "🦟",
      description: "Thermal/cold fogging for outdoor and perimeter mosquito reduction." },
    { id: "SVC-BED", name: "Bedbug Treatment",      nameId: "Kutu Busuk",     basePrice: 650000,  durationMin: 120, icon: "🛏️",
      description: "Targeted aerosol + steam treatment for mattresses and furniture." },
    { id: "SVC-FUM", name: "Fumigation",           nameId: "Fumigasi",       basePrice: 1200000, durationMin: 240, icon: "☣️",
      description: "Whole-structure fumigation for heavy infestations (vacate required)." }
  ],

  /* ---- Booking option value sets (drive GUI controls + validation) ---- */
  options: {
    propertyType: [
      { value: "house",     label: "House / Rumah" },
      { value: "apartment", label: "Apartment / Apartemen" },
      { value: "office",    label: "Office / Kantor" },
      { value: "warehouse", label: "Warehouse / Gudang" }
    ],
    severity: [
      { value: "low",    label: "Low — a few sightings" },
      { value: "medium", label: "Medium — recurring activity" },
      { value: "high",   label: "High — heavy infestation" }
    ],
    timeSlot: [
      { value: "08:00-10:00", label: "08:00 – 10:00" },
      { value: "10:00-12:00", label: "10:00 – 12:00" },
      { value: "13:00-15:00", label: "13:00 – 15:00" },
      { value: "15:00-17:00", label: "15:00 – 17:00" }
    ],
    frequency: [
      { value: "one-time",  label: "One-time" },
      { value: "monthly",   label: "Recurring — monthly" },
      { value: "quarterly", label: "Recurring — quarterly" }
    ],
    region: ["Yogyakarta", "Sleman", "Bantul", "Kulon Progo", "Gunungkidul"]
  },

  /* ---- TECHNICIAN ---- (seeded into bb_technicians; mutable status) */
  technicians: [
    { id: "TC-01", name: "Andi Pratama",  phone: "0812-1000-0001", region: "Yogyakarta", skills: ["SVC-GEN","SVC-TRM","SVC-ROD"], status: "available" },
    { id: "TC-02", name: "Budi Santoso",  phone: "0812-1000-0002", region: "Yogyakarta", skills: ["SVC-GEN","SVC-CKR","SVC-MOS"], status: "available" },
    { id: "TC-03", name: "Citra Dewi",    phone: "0812-1000-0003", region: "Sleman",     skills: ["SVC-GEN","SVC-BED","SVC-FUM"], status: "available" },
    { id: "TC-04", name: "Dimas Woro",    phone: "0812-1000-0004", region: "Bantul",     skills: ["SVC-GEN","SVC-ROD","SVC-TRM"], status: "available" },
    { id: "TC-05", name: "Eka Putri",     phone: "0812-1000-0005", region: "Yogyakarta", skills: ["SVC-GEN","SVC-MOS","SVC-CKR"], status: "available" }
  ],

  /* ---- INVENTORY_ITEM ---- (seeded into bb_inventory; mutable qty) */
  inventory: [
    { id: "INV-01", name: "Fipronil Termiticide", unit: "L",    qtyOnHand: 40, reorderLevel: 10 },
    { id: "INV-02", name: "Cypermethrin Conc.",   unit: "L",    qtyOnHand: 30, reorderLevel: 8  },
    { id: "INV-03", name: "Rodenticide Bait",     unit: "kg",   qtyOnHand: 25, reorderLevel: 5  },
    { id: "INV-04", name: "Cockroach Gel Bait",   unit: "tube", qtyOnHand: 60, reorderLevel: 15 },
    { id: "INV-05", name: "Fogging Solution",     unit: "L",    qtyOnHand: 50, reorderLevel: 12 },
    { id: "INV-06", name: "Bedbug Aerosol",       unit: "can",  qtyOnHand: 35, reorderLevel: 10 },
    { id: "INV-07", name: "Fumigation Tablets",   unit: "pack", qtyOnHand: 20, reorderLevel: 5  },
    { id: "INV-08", name: "PPE / Safety Kit",     unit: "set",  qtyOnHand: 15, reorderLevel: 5  }
  ],

  /* ---- SERVICE_BOM ---- chemicals consumed per service per job ---- */
  bom: {
    "SVC-GEN": [{ item: "INV-02", qtyPerJob: 0.5 }],
    "SVC-TRM": [{ item: "INV-01", qtyPerJob: 2.0 }],
    "SVC-ROD": [{ item: "INV-03", qtyPerJob: 1.5 }],
    "SVC-CKR": [{ item: "INV-04", qtyPerJob: 2 }],
    "SVC-MOS": [{ item: "INV-05", qtyPerJob: 3.0 }],
    "SVC-BED": [{ item: "INV-06", qtyPerJob: 2 }],
    "SVC-FUM": [{ item: "INV-07", qtyPerJob: 4 }, { item: "INV-08", qtyPerJob: 1 }]
  },

  /* ---- Seed FEEDBACK (shown before any real bookings exist) ---- */
  seedFeedback: [
    { id: "FB-2026-9001", appointmentId: null, service: "SVC-TRM", rating: 5, comments: "Teknisi datang tepat waktu, rayap langsung tertangani. Recommended!", submittedAt: "2026-05-28T09:15:00Z" },
    { id: "FB-2026-9002", appointmentId: null, service: "SVC-CKR", rating: 4, comments: "Pelayanan rapi, kecoa berkurang drastis dalam seminggu.",            submittedAt: "2026-06-02T13:40:00Z" },
    { id: "FB-2026-9003", appointmentId: null, service: "SVC-MOS", rating: 5, comments: "Fogging nyamuk efektif, area outdoor jadi nyaman buat anak-anak.",   submittedAt: "2026-06-08T16:05:00Z" }
  ]
};

window.BB_DATA = BB_DATA;
