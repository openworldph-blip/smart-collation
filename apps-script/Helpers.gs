var structuredClone = function(value){return JSON.parse(JSON.stringify(value));};
var SC = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // apps-script/helpers-entry.js
  var helpers_entry_exports = {};
  __export(helpers_entry_exports, {
    saveAdminRequest: () => saveAdminRequest,
    submitLocal: () => submitLocal,
    validateState: () => validateState
  });

  // src/model.js
  var SCHEMA = 1;
  var marketZone = (state) => state.zones.find((z) => z.code === "market");
  function validateState(s) {
    if (!s || s.schemaVersion !== SCHEMA) throw Error("Unsupported backup format. Choose a Smart Collation catalog backup.");
    for (const key of ["branches", "categories", "items", "zones", "sources"]) {
      if (!Array.isArray(s[key]) || s[key].length > 2e3) throw Error(`Invalid ${key} list.`);
      const ids = /* @__PURE__ */ new Set();
      for (const r of s[key]) {
        if (!r || typeof r.id !== "string" || !r.id || ids.has(r.id)) throw Error(`Duplicate or invalid ID in ${key}.`);
        ids.add(r.id);
        if (typeof r.name !== "string" || !r.name.trim() || r.name.length > 160 || typeof r.active !== "boolean" || !Number.isInteger(r.order) || r.order < 0) throw Error(`Invalid record in ${key}.`);
      }
    }
    const refs = (key) => new Set(s[key].map((r) => r.id));
    const cats = refs("categories"), zones = refs("zones"), sources = refs("sources"), branches = refs("branches");
    if (!s.branches.length || !s.categories.length) throw Error("Keep at least one branch and one category.");
    for (const b of s.branches) if (typeof b.abbreviation !== "string" || b.abbreviation.length > 10) throw Error("Invalid branch report abbreviation.");
    if (s.zones.filter((z) => z.code === "market").length !== 1) throw Error("The Market purchasing zone must exist exactly once.");
    for (const r of [...s.categories, ...s.items]) {
      if (!r.visibility || Array.isArray(r.visibility) || typeof r.visibility !== "object") throw Error("Invalid branch visibility.");
      for (const [k, v] of Object.entries(r.visibility)) if (!branches.has(k) || typeof v !== "boolean") throw Error("Invalid visibility branch reference.");
    }
    for (const item of s.items) {
      if (!cats.has(item.categoryId) || item.zoneId && !zones.has(item.zoneId) || item.sourceId && !sources.has(item.sourceId)) throw Error("Item has an invalid category, zone, or source reference.");
      for (const key of ["unit", "shortName", "zoneId", "sourceId"]) if (typeof item[key] !== "string" || item[key].length > 160) throw Error("Invalid item details.");
      if (!Array.isArray(item.aliases) || item.aliases.length > 100 || item.aliases.some((a) => typeof a !== "string" || a.length > 160)) throw Error("Invalid item aliases.");
      if (item.sourceId && item.zoneId !== marketZone(s).id) throw Error("Only Market items can have a Market source.");
    }
    return s;
  }

  // src/draft-model.js
  function validQuantity(q) {
    return typeof q === "string" && q.length <= 80;
  }

  // src/date-tools.js
  function todayManila(now = /* @__PURE__ */ new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
    return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k).value).join("-");
  }

  // src/workflow.js
  function validDate(date) {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + "T12:00:00Z")) && (/* @__PURE__ */ new Date(date + "T12:00:00Z")).toISOString().slice(0, 10) === date;
  }
  function submitLocal(workflow, state, drafts, { branchId, date, submittedBy, nothingNeeded }, now = (/* @__PURE__ */ new Date()).toISOString()) {
    if (!validDate(date) || !workflow.openDates.includes(date)) throw Error("Choose an Admin-opened delivery date first.");
    if (date <= todayManila(now)) throw Error("Delivery starts tomorrow. Choose tomorrow or a later delivery date.");
    if (!state.branches.some((b) => b.id === branchId && b.active)) throw Error("This branch is not active.");
    const key = `${date}/${branchId}`;
    if (workflow.submissions[key]) throw Error("This branch already submitted for this date.");
    if (!submittedBy.trim()) throw Error("Enter the employee name.");
    const rows = drafts[key] || {};
    if (!nothingNeeded && !Object.keys(rows).length) throw Error("Select items or choose Nothing needed.");
    const items = {};
    if (!nothingNeeded) for (const [itemId, row] of Object.entries(rows)) {
      if (!validQuantity(row.quantity)) throw Error("Keep quantity entries within 80 characters. Blank is allowed.");
      const item = state.items.find((i) => i.id === itemId) || row.snapshot;
      if (!item) throw Error("An item cannot be identified. Review your checklist.");
      items[itemId] = { quantity: row.quantity, unit: row.unit, snapshot: structuredClone(item), locked: true, masterItemId: row.masterItemId || (!item.isNewItem ? item.id : null), isNewItem: !!item.isNewItem };
    }
    const receipt = { date, branchId, submittedBy: submittedBy.trim(), submittedAt: now, nothingNeeded: !!nothingNeeded, items, version: 1 };
    return { ...workflow, revision: (workflow.revision || 0) + 1, submissions: { ...workflow.submissions, [key]: receipt } };
  }
  function saveAdminRequest(workflow, state, { branchId, date, items, nothingNeeded, expectedVersion }, now = (/* @__PURE__ */ new Date()).toISOString()) {
    if (!validDate(date) || !state.branches.some((b) => b.id === branchId)) throw Error("Choose a valid branch and delivery date.");
    const key = `${date}/${branchId}`, before = workflow.submissions[key];
    if (expectedVersion === null ? !!before : !before || (before.version || 0) !== expectedVersion) throw Error("This request changed since you opened it. Reload it before saving.");
    if (!nothingNeeded && !Object.keys(items).length) throw Error("Add at least one item, or mark Nothing needed.");
    const saved = {};
    if (!nothingNeeded) for (const [lineId, row] of Object.entries(items)) {
      if (!validQuantity(row.quantity)) throw Error("Keep quantity entries within 80 characters. Blank is allowed.");
      if (!row.snapshot?.name?.trim() || row.snapshot.name.length > 160) throw Error("Every item needs a name (up to 160 characters).");
      const snap = structuredClone(row.snapshot);
      snap.name = snap.name.trim();
      snap.shortName = snap.name;
      if (!state.categories.some((c) => c.id === snap.categoryId)) throw Error("Choose an item category.");
      if (snap.zoneId && !state.zones.some((z) => z.id === snap.zoneId)) throw Error("Choose a valid purchasing zone.");
      if (snap.sourceId && !state.sources.some((s) => s.id === snap.sourceId)) throw Error("Choose a valid Market source.");
      if (snap.zoneId !== state.zones.find((z) => z.code === "market").id) snap.sourceId = "";
      saved[lineId] = { ...row, quantity: row.quantity, unit: row.unit, snapshot: snap, locked: true, adminReviewed: true };
    }
    const after = { ...before, date, branchId, submittedBy: before?.submittedBy || "Admin manual entry", submittedAt: before?.submittedAt || now, nothingNeeded: !!nothingNeeded, items: saved, version: (before?.version || 0) + 1, reviewedAt: now, editedAt: now, origin: before?.origin || "admin" };
    return { ...workflow, revision: (workflow.revision || 0) + 1, submissions: { ...workflow.submissions, [key]: after }, audit: [{ date, branchId, at: now, actor: "Admin", action: "Edited branch request", before: before || null, after }, ...workflow.audit || []].slice(0, 100) };
  }
  return __toCommonJS(helpers_entry_exports);
})();
