// Club Operations SQL Lab: loads SQLite (sql.js), builds the database, renders every section.
// Every piece of interface text is rendered in both English and Chinese; CSS shows the
// language chosen in <html data-ui>, so switching never re-renders or loses edited SQL.
(function () {
  "use strict";

  const SQLJS_CDN = "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/";
  const SAMPLE_ROWS = 5;
  const TITLES = { en: "Club Operations SQL Lab", zh: "分會營運 SQL 實驗室" };
  const LEVEL_ZH = { Basic: "基礎", Intermediate: "中級", Advanced: "進階" };
  const USER_ZH = {
    "VP Education": "教育副會長",
    "VP Membership": "會員副會長",
    "Area Director": "區域總監",
    "Timer": "計時員",
  };

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

  // English and Chinese versions of the same text; CSS hides the inactive one.
  function bi(en, zh) {
    const frag = document.createDocumentFragment();
    frag.append(el("span", { "data-lang": "en", text: en }), el("span", { "data-lang": "zh", text: zh }));
    return frag;
  }

  function setBi(node, en, zh) {
    node.replaceChildren(bi(en, zh));
  }

  async function fetchText(path) {
    const res = await fetch(path, { cache: "no-cache" });  // always revalidate the SQL data files
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return res.text();
  }

  // ---------- language ----------
  function setLanguage(lang) {
    const root = document.documentElement;
    root.dataset.ui = lang;
    root.lang = lang === "zh" ? "zh-Hant-TW" : "en";
    document.title = TITLES[lang];
    try { localStorage.setItem("ui-lang", lang); } catch (e) { /* storage unavailable */ }
    const url = new URL(location.href);
    if (lang === "zh") url.searchParams.set("lang", "zh");
    else url.searchParams.delete("lang");
    history.replaceState(null, "", url);
  }

  function initLanguage() {
    setLanguage(document.documentElement.dataset.ui === "zh" ? "zh" : "en");
    $("#lang-toggle").addEventListener("click", () => {
      setLanguage(document.documentElement.dataset.ui === "zh" ? "en" : "zh");
    });
  }

  // ---------- database ----------
  function resetDb() {
    if (db) db.close();
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON;");
    db.exec(schemaSql);
    db.exec(seedSql);
  }

  // Rows changed since the database was opened. getRowsModified() is not reset by
  // statements such as CREATE TABLE, so each statement's count is a difference of this.
  function totalChanges() {
    const stmt = db.prepare("SELECT total_changes()");
    stmt.step();
    const n = stmt.get()[0];
    stmt.free();
    return n;
  }

  // Runs one or more statements; returns the result of the last one.
  function runSql(sql) {
    let last = null;
    try {
      for (const stmt of db.iterateStatements(sql)) {
        const before = totalChanges();
        const columns = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) rows.push(stmt.get());
        stmt.free();
        last = { columns, rows, changed: totalChanges() - before };
      }
    } catch (e) {
      return { error: e.message };
    }
    if (!last) return { error: "No SQL statement to run." };
    return last;
  }

  // Returns [english, chinese] or null.
  function hintFor(message) {
    const tables = window.TABLES.map(t => t.name).join(", ");
    if (/no such table/i.test(message)) return [
      "Check the table name. Tables are: " + tables + ".",
      "請檢查資料表名稱。資料表有：" + tables + "。"];
    if (/no such column/i.test(message)) return [
      "Check the column name and its table alias. See the Design section for every column.",
      "請檢查欄位名稱和資料表別名。所有欄位都列在「資料庫設計」區塊。"];
    if (/misuse of aggregate/i.test(message)) return [
      "Aggregate functions such as COUNT() cannot be used in WHERE. Filter groups with HAVING instead.",
      "COUNT() 這類彙總函數不能用在 WHERE。要篩選群組，請改用 HAVING。"];
    if (/syntax error/i.test(message)) return [
      "There is a syntax error near the word shown. Look for a missing comma, quote or keyword.",
      "錯誤訊息中那個字附近有語法錯誤。請檢查是否少了逗號、引號或關鍵字。"];
    if (/ambiguous column/i.test(message)) return [
      "Two joined tables have this column. Prefix it with a table alias, e.g. m.member_id.",
      "JOIN 的兩張資料表都有這個欄位。請在欄位前加上資料表別名，例如 m.member_id。"];
    if (/constraint failed/i.test(message)) return [
      "The change breaks a constraint (primary key, foreign key, UNIQUE or CHECK).",
      "這筆修改違反了限制條件（主鍵、外鍵、UNIQUE 或 CHECK）。"];
    if (/No SQL statement/i.test(message)) return ["", "沒有可以執行的 SQL 指令。"];
    return null;
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
        el("pre", {}, bi("Error: ", "錯誤："), result.error),
        hint ? el("div", {}, bi(hint[0], hint[1])) : null));
      return box;
    }
    if (result.columns.length === 0) {
      box.append(el("div", { class: "msg msg-info" },
        bi(`Statement executed. ${result.changed} row(s) changed.`, `指令已執行，共異動 ${result.changed} 列。`)));
      return box;
    }
    box.append(renderTable(result.columns, result.rows));
    box.append(el("p", { class: "result-meta" }, bi(`${result.rows.length} row(s)`, `共 ${result.rows.length} 列`)));
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

  function runButton(onClick) {
    const b = el("button", { class: "btn", type: "button", onclick: onClick }, bi("Run", "執行"));
    b.disabled = !db;
    runButtons.push(b);
    return b;
  }

  function resetSqlButton(onClick) {
    return el("button", { class: "btn btn-ghost", type: "button", onclick: onClick }, bi("Reset SQL", "還原 SQL"));
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
      card.append(el("p", {}, bi(table.about, table.about_zh)));
      const headers = [["Column", "欄位"], ["Type", "型別"], ["Constraints", "限制"], ["Description", "說明"]];
      const dict = el("table", { class: "doc-table" },
        el("thead", {}, el("tr", {}, ...headers.map(h => el("th", {}, bi(h[0], h[1]))))),
        el("tbody", {}, ...table.columns.map(c => el("tr", {},
          el("td", {}, el("code", { text: c[0] })), el("td", { text: c[1] }), el("td", { text: c[2] }),
          el("td", {}, bi(c[3], c[4]))))));
      card.append(el("div", { class: "table-scroll" }, dict));

      if (db) {
        const total = runSql(`SELECT COUNT(*) FROM ${table.name};`);
        const count = total.error ? "?" : total.rows[0][0];
        card.append(el("p", { class: "result-label" },
          bi(`Sample data · ${count} rows in total`, `樣本資料 · 共 ${count} 列`)));
        const area = el("div");
        const draw = all => {
          area.innerHTML = "";
          const res = runSql(`SELECT * FROM ${table.name}${all ? "" : " LIMIT " + SAMPLE_ROWS};`);
          area.append(renderResult(res));
          if (!all && count > SAMPLE_ROWS) {
            area.append(el("button", { class: "btn btn-ghost", type: "button", onclick: () => draw(true) },
              bi(`Show all ${count} rows`, `顯示全部 ${count} 列`)));
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
        out.append(el("p", { class: "result-label" }, bi("Actual result", "實際結果")), renderResult(res));
        const ok = sameResult(res, q.expected);
        badge.className = "badge " + (ok ? "badge-ok" : "badge-diff");
        if (ok) setBi(badge, "✓ Matches expected result", "✓ 與預期結果相同");
        else setBi(badge, "≠ Different from expected result", "≠ 與預期結果不同");
      };
      ta = editor(q.sql, run);
      const reset = resetSqlButton(() => {
        ta.value = q.sql; out.innerHTML = ""; badge.className = ""; badge.replaceChildren();
      });
      const expected = el("details", { class: "expected" },
        el("summary", {}, bi("Expected result", "預期結果")), renderResult(q.expected));

      list.append(el("article", { class: "card q-card", "data-level": q.level },
        el("div", { class: "q-head" },
          el("span", { class: "q-id", text: q.id }),
          el("span", { class: "tag tag-" + q.level }, bi(q.level, LEVEL_ZH[q.level])),
          el("span", { class: "tag" }, bi(q.concept, q.concept_zh)),
          el("span", { class: "tag" }, bi("For: " + q.user, "使用者：" + USER_ZH[q.user]))),
        el("p", { class: "q-question" }, bi(q.question, q.question_zh)),
        ta,
        el("div", { class: "actions" }, runButton(run), reset, badge),
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
  function comparePane(titleEn, titleZh, sql) {
    const out = el("div", { class: "result" });
    let ta;
    const run = () => {
      if (!db) return;
      out.innerHTML = "";
      out.append(renderResult(runSql(ta.value)));
    };
    ta = editor(sql, run);
    const pane = el("div", { class: "cmp-pane" },
      el("h4", {}, bi(titleEn, titleZh)), ta,
      el("div", { class: "actions" },
        runButton(run),
        resetSqlButton(() => { ta.value = sql; run(); })),
      out);
    pane.run = run;
    return pane;
  }

  const comparePanes = [];

  function renderComparisons() {
    const list = $("#compare-list");
    list.innerHTML = "";
    for (const c of window.COMPARISONS) {
      const before = comparePane("Before", "修改前", c.before);
      const after = comparePane("After", "修改後", c.after);
      comparePanes.push(before, after);
      list.append(el("article", { class: "card" },
        el("div", { class: "q-head" },
          el("span", { class: "q-id", text: c.id }),
          el("span", { class: "tag" }, bi(c.topic, c.topic_zh)),
          el("span", { class: "tag" }, bi("Related to " + c.related, "對應 " + c.related))),
        el("p", { class: "q-question" }, bi(c.question, c.question_zh)),
        el("p", {}, el("span", { class: "change" }, bi("Change: " + c.change, "修改：" + c.change_zh))),
        el("div", { class: "cmp-grid" }, before, after),
        el("div", { class: "why" },
          el("strong", {}, bi("Why: ", "原因：")),
          bi(c.why, c.why_zh))));
    }
  }

  // ---------- playground ----------
  function renderPlayground() {
    const ta = $("#play-sql");
    const out = $("#play-result");
    const run = () => {
      if (!db) return;
      out.innerHTML = "";
      out.append(el("p", { class: "result-label" }, bi("Result", "結果")), renderResult(runSql(ta.value)));
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
    initLanguage();
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
      const local = location.protocol === "file:";
      setBi(status,
        "Could not start the SQL engine: " + e.message + (local ? " (open this page through a web server, not as a local file)" : ""),
        "SQL 引擎無法啟動：" + e.message + (local ? "（請透過網頁伺服器開啟，不要直接開啟本機檔案）" : ""));
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
      setBi(status, "Database reset to the original sample data.", "資料庫已還原成原始樣本資料。");
    });
    renderTables();
    comparePanes.forEach(p => p.run());
    status.className = "status status-ready";
    setBi(status, "SQL engine ready · SQLite in your browser", "SQL 引擎已就緒 · 在瀏覽器中執行 SQLite");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
