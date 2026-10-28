// Club Operations SQL Lab: loads SQLite (sql.js), builds the database, renders every section.
(function () {
  "use strict";

  const SQLJS_CDN = "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/";
  const SAMPLE_ROWS = 5;

  let SQL = null;
  let db = null;
  let schemaSql = "";
  let seedSql = "";
  const runButtons = [];

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  }

  async function fetchText(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return res.text();
  }

  // ---------- database ----------
  function resetDb() {
    if (db) db.close();
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON;");
    db.exec(schemaSql);
    db.exec(seedSql);
  }

  // Runs one or more statements; returns the result of the last one.
  function runSql(sql) {
    let last = null;
    try {
      for (const stmt of db.iterateStatements(sql)) {
        const columns = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) rows.push(stmt.get());
        stmt.free();
        last = { columns, rows, changed: db.getRowsModified() };
      }
    } catch (e) {
      return { error: e.message };
    }
    if (!last) return { error: "No SQL statement to run." };
    return last;
  }

  function hintFor(message) {
    if (/no such table/i.test(message)) return "Check the table name. Tables are: " + window.TABLES.map(t => t.name).join(", ") + ".";
    if (/no such column/i.test(message)) return "Check the column name and its table alias. See the Design section for every column.";
    if (/misuse of aggregate/i.test(message)) return "Aggregate functions such as COUNT() cannot be used in WHERE. Filter groups with HAVING instead.";
    if (/syntax error/i.test(message)) return "There is a syntax error near the word shown. Look for a missing comma, quote or keyword.";
    if (/ambiguous column/i.test(message)) return "Two joined tables have this column. Prefix it with a table alias, e.g. m.member_id.";
    if (/constraint failed/i.test(message)) return "The change breaks a constraint (primary key, foreign key, UNIQUE or CHECK).";
    return "";
  }

  // ---------- rendering results ----------
  function renderTable(columns, rows) {
    const thead = el("thead", {}, el("tr", {}, ...columns.map(c => el("th", { text: c }))));
    const tbody = el("tbody");
    for (const row of rows) {
      const tr = el("tr");
      for (const v of row) {
        if (v === null) tr.append(el("td", { class: "null", text: "NULL" }));
        else tr.append(el("td", { class: typeof v === "number" ? "cell-num" : "", text: String(v) }));
      }
      tbody.append(tr);
    }
    return el("div", { class: "table-scroll" }, el("table", { class: "data-table" }, thead, tbody));
  }

  function renderResult(result) {
    const box = el("div");
    if (result.error) {
      const hint = hintFor(result.error);
      box.append(el("div", { class: "msg msg-error", role: "alert" },
        el("pre", { text: "Error: " + result.error }),
        hint ? el("div", { text: hint }) : null));
      return box;
    }
    if (result.columns.length === 0) {
      box.append(el("div", { class: "msg msg-info", text: `Statement executed. ${result.changed} row(s) changed.` }));
      return box;
    }
    box.append(renderTable(result.columns, result.rows));
    box.append(el("p", { class: "result-meta", text: `${result.rows.length} row(s)` }));
    return box;
  }

  function sameResult(a, b) {
    if (!a || !b || a.error || b.error) return Boolean(a && b && a.error && b.error);
    return JSON.stringify(a.columns) === JSON.stringify(b.columns) &&
           JSON.stringify(a.rows) === JSON.stringify(b.rows);
  }

  function editor(value, onRun) {
    const ta = el("textarea", { class: "editor", spellcheck: "false", wrap: "off" });
    ta.value = value;
    ta.rows = Math.min(Math.max(value.split("\n").length + 1, 5), 22);
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRun(); }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText("    ", s, ta.selectionEnd, "end");
      }
    });
    return ta;
  }

  function runButton(label, onClick) {
    const b = el("button", { class: "btn", type: "button", text: label, onclick: onClick });
    b.disabled = !db;
    runButtons.push(b);
    return b;
  }

  // ---------- section 2: tables ----------
  function renderTables() {
    const tabs = $("#table-tabs");
    const detail = $("#table-detail");
    tabs.innerHTML = "";

    function show(table, tabBtn) {
      tabs.querySelectorAll(".chip").forEach(c => { c.classList.remove("is-on"); c.setAttribute("aria-selected", "false"); });
      tabBtn.classList.add("is-on");
      tabBtn.setAttribute("aria-selected", "true");
      detail.innerHTML = "";
      const card = el("div", { class: "card" });
      card.append(el("h3", {}, el("code", { text: table.name })));
      card.append(el("p", { text: table.about }));
      const dict = el("table", { class: "doc-table" },
        el("thead", {}, el("tr", {}, ...["Column", "Type", "Constraints", "Description"].map(h => el("th", { text: h })))),
        el("tbody", {}, ...table.columns.map(c => el("tr", {},
          el("td", {}, el("code", { text: c[0] })), el("td", { text: c[1] }), el("td", { text: c[2] }), el("td", { text: c[3] })))));
      card.append(el("div", { class: "table-scroll" }, dict));

      if (db) {
        const total = runSql(`SELECT COUNT(*) FROM ${table.name};`);
        const count = total.error ? "?" : total.rows[0][0];
        card.append(el("p", { class: "result-label", text: `Sample data · ${count} rows in total` }));
        const area = el("div");
        const draw = all => {
          area.innerHTML = "";
          const res = runSql(`SELECT * FROM ${table.name}${all ? "" : " LIMIT " + SAMPLE_ROWS};`);
          area.append(renderResult(res));
          if (!all && count > SAMPLE_ROWS) {
            area.append(el("button", { class: "btn btn-ghost", type: "button", text: `Show all ${count} rows`, onclick: () => draw(true) }));
          }
        };
        draw(false);
        card.append(area);
      }
      detail.append(card);
    }

    window.TABLES.forEach((t, i) => {
      const b = el("button", { class: "chip", type: "button", role: "tab" }, el("code", { text: t.name }));
      b.addEventListener("click", () => show(t, b));
      tabs.append(b);
      if (i === 0) show(t, b);
    });
  }

  // ---------- section 3: queries ----------
  function renderQueries() {
    const list = $("#query-list");
    list.innerHTML = "";
    for (const q of window.QUERIES) {
      const out = el("div", { class: "result" });
      const badge = el("span");
      let ta;
      const run = () => {
        if (!db) return;
        const res = runSql(ta.value);
        out.innerHTML = "";
        out.append(el("p", { class: "result-label", text: "Actual result" }), renderResult(res));
        const ok = sameResult(res, q.expected);
        badge.className = "badge " + (ok ? "badge-ok" : "badge-diff");
        badge.textContent = ok ? "✓ Matches expected result" : "≠ Different from expected result";
      };
      ta = editor(q.sql, run);
      const reset = el("button", { class: "btn btn-ghost", type: "button", text: "Reset SQL", onclick: () => {
        ta.value = q.sql; out.innerHTML = ""; badge.className = ""; badge.textContent = "";
      } });
      const expected = el("details", { class: "expected" },
        el("summary", { text: "Expected result" }), renderResult(q.expected));

      list.append(el("article", { class: "card q-card", "data-level": q.level },
        el("div", { class: "q-head" },
          el("span", { class: "q-id", text: q.id }),
          el("span", { class: "tag tag-" + q.level, text: q.level }),
          el("span", { class: "tag", text: q.concept }),
          el("span", { class: "tag", text: "For: " + q.user })),
        el("p", { class: "q-question", text: q.question }),
        ta,
        el("div", { class: "actions" }, runButton("Run", run), reset, badge),
        expected,
        out));
    }

    $("#level-filter").addEventListener("click", e => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      $("#level-filter").querySelectorAll(".chip").forEach(c => c.classList.toggle("is-on", c === btn));
      const level = btn.dataset.level;
      list.querySelectorAll(".q-card").forEach(card => {
        card.hidden = level !== "All" && card.dataset.level !== level;
      });
    });
  }

  // ---------- section 4: comparisons ----------
  function comparePane(title, sql) {
    const out = el("div", { class: "result" });
    let ta;
    const run = () => {
      if (!db) return;
      out.innerHTML = "";
      out.append(renderResult(runSql(ta.value)));
    };
    ta = editor(sql, run);
    const pane = el("div", { class: "cmp-pane" },
      el("h4", { text: title }), ta,
      el("div", { class: "actions" },
        runButton("Run", run),
        el("button", { class: "btn btn-ghost", type: "button", text: "Reset SQL", onclick: () => { ta.value = sql; run(); } })),
      out);
    pane.run = run;
    return pane;
  }

  const comparePanes = [];

  function renderComparisons() {
    const list = $("#compare-list");
    list.innerHTML = "";
    for (const c of window.COMPARISONS) {
      const before = comparePane("Before", c.before);
      const after = comparePane("After", c.after);
      comparePanes.push(before, after);
      list.append(el("article", { class: "card" },
        el("div", { class: "q-head" },
          el("span", { class: "q-id", text: c.id }),
          el("span", { class: "tag", text: c.topic }),
          el("span", { class: "tag", text: "Related to " + c.related })),
        el("p", { class: "q-question", text: c.question }),
        el("p", {}, el("span", { class: "change", text: "Change: " + c.change })),
        el("div", { class: "cmp-grid" }, before, after),
        el("div", { class: "why" }, el("strong", { text: "Why: " }), c.why)));
    }
  }

  // ---------- playground ----------
  function renderPlayground() {
    const ta = $("#play-sql");
    const out = $("#play-result");
    const run = () => {
      if (!db) return;
      out.innerHTML = "";
      out.append(el("p", { class: "result-label", text: "Result" }), renderResult(runSql(ta.value)));
    };
    const runBtn = $("#play-run");
    runBtn.addEventListener("click", run);
    runButtons.push(runBtn);
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
    });
    const chips = $("#table-chips");
    for (const t of window.TABLES) {
      chips.append(el("button", { class: "chip", type: "button", onclick: () => {
        ta.value = `SELECT *\nFROM ${t.name}\nLIMIT 10;`;
        ta.focus();
      } }, el("code", { text: t.name })));
    }
  }

  // ---------- startup ----------
  function initMermaid() {
    if (!window.mermaid) return;
    const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", er: { useMaxWidth: true } });
    window.mermaid.run({ querySelector: ".mermaid" }).catch(() => {});
  }

  async function init() {
    initMermaid();
    renderQueries();
    renderComparisons();
    renderPlayground();
    const status = $("#engine-status");
    try {
      SQL = await window.initSqlJs({ locateFile: file => SQLJS_CDN + file });
      [schemaSql, seedSql] = await Promise.all([fetchText("data/schema.sql"), fetchText("data/seed.sql")]);
      resetDb();
    } catch (e) {
      status.className = "status status-error";
      status.textContent = "Could not start the SQL engine: " + e.message +
        (location.protocol === "file:" ? " (open this page through a web server, not as a local file)" : "");
      renderTables();
      return;
    }
    runButtons.forEach(b => { b.disabled = false; });
    const resetBtn = $("#reset-db");
    resetBtn.disabled = false;
    resetBtn.addEventListener("click", () => {
      resetDb();
      renderTables();
      comparePanes.forEach(p => p.run());
      status.textContent = "Database reset to the original sample data.";
    });
    renderTables();
    comparePanes.forEach(p => p.run());
    status.className = "status status-ready";
    status.textContent = "SQL engine ready · SQLite in your browser";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
