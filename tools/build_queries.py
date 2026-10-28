"""Run every practice query on the sample data and record the expected results.

Run from the repo root:  python tools/build_queries.py
Outputs:
  js/queries.js     window.QUERIES     (14 practice queries + expected results)
  js/compare.js     window.COMPARISONS (5 before/after comparisons)
  data/queries.sql  all SQL in one file, for checking in MySQL Workbench

All SQL is written to run on both SQLite and MySQL 8.0+.
Reference date for "active" memberships: '2026-10-31'.
"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

QUERIES = [
    {
        "id": "Q1", "level": "Basic", "concept": "SELECT, WHERE", "user": "Area Director",
        "question": "List the clubs in Area A1, with their city and meeting day.",
        "sql": """SELECT club_name, city, meeting_weekday
FROM clubs
WHERE area_id = 'A1'
ORDER BY club_name;""",
    },
    {
        "id": "Q2", "level": "Basic", "concept": "ORDER BY, LIMIT", "user": "VP Membership",
        "question": "Who are the 10 longest-serving members (earliest first join date)?",
        "sql": """SELECT member_id, display_name, first_join_date
FROM members
ORDER BY first_join_date, member_id
LIMIT 10;""",
    },
    {
        "id": "Q3", "level": "Intermediate", "concept": "JOIN, GROUP BY, COUNT", "user": "Area Director",
        "question": "How many active members does each club have? "
                    "(Active = status 'active' and dues paid through 2026-10-31 or later.)",
        "sql": """SELECT c.club_name, COUNT(ms.membership_id) AS active_members
FROM clubs c
JOIN memberships ms ON ms.club_id = c.club_id
WHERE ms.status = 'active'
  AND ms.paid_through >= '2026-10-31'
GROUP BY c.club_id, c.club_name
ORDER BY active_members DESC, c.club_name;""",
    },
    {
        "id": "Q4", "level": "Intermediate", "concept": "HAVING", "user": "Area Director",
        "question": "Which clubs have fewer than 20 active members and may need support?",
        "sql": """SELECT c.club_name, COUNT(ms.membership_id) AS active_members
FROM clubs c
JOIN memberships ms ON ms.club_id = c.club_id
WHERE ms.status = 'active'
  AND ms.paid_through >= '2026-10-31'
GROUP BY c.club_id, c.club_name
HAVING COUNT(ms.membership_id) < 20
ORDER BY active_members, c.club_name;""",
    },
    {
        "id": "Q5", "level": "Intermediate", "concept": "Multi-condition WHERE, date comparison", "user": "VP Membership",
        "question": "Which members are still in a club but have not renewed their dues "
                    "(paid through date is before 2026-10-31)?",
        "sql": """SELECT m.display_name, c.club_name, ms.paid_through
FROM memberships ms
JOIN members m ON m.member_id = ms.member_id
JOIN clubs c   ON c.club_id = ms.club_id
WHERE ms.status = 'active'
  AND ms.paid_through < '2026-10-31'
ORDER BY c.club_name, m.display_name;""",
    },
    {
        "id": "Q6", "level": "Intermediate", "concept": "Multi-table JOIN", "user": "VP Education",
        "question": "Show the full role sheet of meeting #1: date, club, role and who takes it.",
        "sql": """SELECT mt.meeting_date, c.club_name, r.role_name, m.display_name
FROM role_assignments ra
JOIN meetings mt ON mt.meeting_id = ra.meeting_id
JOIN clubs c     ON c.club_id = mt.club_id
JOIN roles r     ON r.role_code = ra.role_code
JOIN members m   ON m.member_id = ra.member_id
WHERE ra.meeting_id = 1
ORDER BY r.category, r.role_name;""",
    },
    {
        "id": "Q7", "level": "Intermediate", "concept": "LEFT JOIN ... IS NULL", "user": "VP Education",
        "question": "Which active members of Sunrise Speakers Club (club 1) have never taken a meeting role?",
        "sql": """SELECT m.member_id, m.display_name
FROM memberships ms
JOIN members m ON m.member_id = ms.member_id
LEFT JOIN role_assignments ra ON ra.member_id = m.member_id
WHERE ms.club_id = 1
  AND ms.status = 'active'
  AND ms.paid_through >= '2026-10-31'
  AND ra.member_id IS NULL
ORDER BY m.display_name;""",
    },
    {
        "id": "Q8", "level": "Intermediate", "concept": "GROUP BY, AVG, ROUND", "user": "VP Education",
        "question": "For each speaker, how many speeches have they given and what is their average length in seconds?",
        "sql": """SELECT m.display_name,
       COUNT(*) AS speeches,
       ROUND(AVG(sp.duration_sec), 1) AS avg_sec
FROM speeches sp
JOIN members m ON m.member_id = sp.member_id
GROUP BY m.member_id, m.display_name
ORDER BY speeches DESC, m.display_name;""",
    },
    {
        "id": "Q9", "level": "Advanced", "concept": "Subquery in HAVING", "user": "VP Education",
        "question": "Which speakers gave more speeches than the average speaker?",
        "sql": """SELECT m.display_name, COUNT(*) AS speeches
FROM speeches sp
JOIN members m ON m.member_id = sp.member_id
GROUP BY m.member_id, m.display_name
HAVING COUNT(*) > (
    SELECT COUNT(*) * 1.0 / COUNT(DISTINCT member_id)
    FROM speeches
)
ORDER BY speeches DESC, m.display_name;""",
    },
    {
        "id": "Q10", "level": "Advanced", "concept": "CASE WHEN", "user": "Timer",
        "question": "Label every October speech as Under time, Qualified, Over time or Not recorded.",
        "sql": """SELECT mt.meeting_date, m.display_name, sp.duration_sec,
       sp.min_sec, sp.max_sec,
       CASE
           WHEN sp.duration_sec IS NULL       THEN 'Not recorded'
           WHEN sp.duration_sec < sp.min_sec  THEN 'Under time'
           WHEN sp.duration_sec > sp.max_sec  THEN 'Over time'
           ELSE 'Qualified'
       END AS timing
FROM speeches sp
JOIN meetings mt ON mt.meeting_id = sp.meeting_id
JOIN members m   ON m.member_id = sp.member_id
WHERE mt.meeting_date BETWEEN '2026-10-01' AND '2026-10-31'
ORDER BY mt.meeting_date, sp.speech_id;""",
    },
    {
        "id": "Q11", "level": "Advanced", "concept": "COUNT(DISTINCT), LEFT JOIN", "user": "VP Education",
        "question": "For each Pathways path, how many different members have given a speech on it, and how many speeches?",
        "sql": """SELECT p.path_name,
       COUNT(DISTINCT sp.member_id) AS members_on_path,
       COUNT(sp.speech_id) AS speeches
FROM pathways p
LEFT JOIN speeches sp ON sp.path_code = p.path_code
GROUP BY p.path_code, p.path_name
ORDER BY members_on_path DESC, p.path_name;""",
    },
    {
        "id": "Q12", "level": "Advanced", "concept": "WITH (CTE)", "user": "Area Director",
        "question": "For each area, how many clubs and how many active members are there?",
        "sql": """WITH club_stats AS (
    SELECT c.area_id, c.club_id, COUNT(ms.membership_id) AS active_members
    FROM clubs c
    LEFT JOIN memberships ms
           ON ms.club_id = c.club_id
          AND ms.status = 'active'
          AND ms.paid_through >= '2026-10-31'
    GROUP BY c.area_id, c.club_id
)
SELECT a.area_name, a.division,
       COUNT(cs.club_id) AS clubs,
       SUM(cs.active_members) AS active_members
FROM areas a
JOIN club_stats cs ON cs.area_id = a.area_id
GROUP BY a.area_id, a.area_name, a.division
ORDER BY a.area_id;""",
    },
    {
        "id": "Q13", "level": "Advanced", "concept": "Window function RANK() OVER (PARTITION BY)", "user": "VP Education",
        "question": "Within each club, rank speakers by number of speeches.",
        "sql": """WITH counts AS (
    SELECT mt.club_id, sp.member_id, COUNT(*) AS speeches
    FROM speeches sp
    JOIN meetings mt ON mt.meeting_id = sp.meeting_id
    GROUP BY mt.club_id, sp.member_id
)
SELECT c.club_name, m.display_name, ct.speeches,
       RANK() OVER (PARTITION BY ct.club_id ORDER BY ct.speeches DESC) AS club_rank
FROM counts ct
JOIN clubs c   ON c.club_id = ct.club_id
JOIN members m ON m.member_id = ct.member_id
ORDER BY c.club_name, club_rank, m.display_name;""",
    },
    {
        "id": "Q14", "level": "Advanced", "concept": "CREATE VIEW, EXISTS", "user": "VP Membership",
        "question": "Create a view of active memberships, then use it to find members who are active in more than one club.",
        "sql": """DROP VIEW IF EXISTS active_memberships;

CREATE VIEW active_memberships AS
SELECT member_id, club_id
FROM memberships
WHERE status = 'active'
  AND paid_through >= '2026-10-31';

SELECT m.display_name, c.club_name
FROM members m
JOIN active_memberships am ON am.member_id = m.member_id
JOIN clubs c ON c.club_id = am.club_id
WHERE EXISTS (
    SELECT 1
    FROM active_memberships x
    WHERE x.member_id = m.member_id
      AND x.club_id <> am.club_id
)
ORDER BY m.display_name, c.club_name;""",
    },
]

COMPARISONS = [
    {
        "id": "C1", "related": "Q7", "topic": "INNER JOIN vs LEFT JOIN",
        "question": "How many roles has each active member of club 1 taken?",
        "before": """SELECT m.display_name, COUNT(ra.role_code) AS roles_taken
FROM memberships ms
JOIN members m ON m.member_id = ms.member_id
JOIN role_assignments ra ON ra.member_id = m.member_id
WHERE ms.club_id = 1 AND ms.status = 'active'
  AND ms.paid_through >= '2026-10-31'
GROUP BY m.member_id, m.display_name
ORDER BY roles_taken DESC, m.display_name;""",
        "after": """SELECT m.display_name, COUNT(ra.role_code) AS roles_taken
FROM memberships ms
JOIN members m ON m.member_id = ms.member_id
LEFT JOIN role_assignments ra ON ra.member_id = m.member_id
WHERE ms.club_id = 1 AND ms.status = 'active'
  AND ms.paid_through >= '2026-10-31'
GROUP BY m.member_id, m.display_name
ORDER BY roles_taken DESC, m.display_name;""",
        "change": "INNER JOIN role_assignments → LEFT JOIN role_assignments",
        "why": "INNER JOIN only keeps members who have at least one matching row in role_assignments, "
               "so members with zero roles disappear. LEFT JOIN keeps every member from the left side and "
               "fills the role columns with NULL. COUNT(ra.role_code) ignores NULL, so those members show 0. "
               "If we wrote COUNT(*) instead, they would wrongly show 1, because the NULL-filled row is still a row.",
    },
    {
        "id": "C2", "related": "Q4", "topic": "WHERE vs HAVING",
        "question": "Which clubs have fewer than 20 active members?",
        "before": QUERIES[3]["sql"],
        "after": """SELECT c.club_name, COUNT(ms.membership_id) AS active_members
FROM clubs c
JOIN memberships ms ON ms.club_id = c.club_id
WHERE ms.status = 'active'
  AND ms.paid_through >= '2026-10-31'
  AND COUNT(ms.membership_id) < 20
GROUP BY c.club_id, c.club_name
ORDER BY active_members, c.club_name;""",
        "change": "Move the COUNT() condition from HAVING into WHERE",
        "why": "SQL is processed in the order FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. "
               "WHERE filters single rows before groups exist, so an aggregate like COUNT() cannot be used there "
               "and the database returns an error. HAVING filters after grouping, which is where COUNT() has a value. "
               "MySQL gives a similar error: \"Invalid use of group function\".",
    },
    {
        "id": "C3", "related": "Q8", "topic": "COUNT(*) vs COUNT(column), AVG vs SUM/COUNT(*)",
        "question": "What is the average speech length?",
        "before": """SELECT COUNT(*) AS all_speeches,
       COUNT(duration_sec) AS timed_speeches,
       ROUND(AVG(duration_sec), 1) AS avg_sec
FROM speeches;""",
        "after": """SELECT COUNT(*) AS all_speeches,
       COUNT(duration_sec) AS timed_speeches,
       ROUND(SUM(duration_sec) * 1.0 / COUNT(*), 1) AS avg_sec
FROM speeches;""",
        "change": "AVG(duration_sec) → SUM(duration_sec) * 1.0 / COUNT(*)",
        "why": "Some speeches have no recorded time (NULL). COUNT(*) counts every row, while COUNT(duration_sec) "
               "skips NULL. AVG also skips NULL, so it divides by the number of timed speeches. "
               "Dividing SUM by COUNT(*) treats untimed speeches as 0 seconds, so the average becomes too low. "
               "The * 1.0 avoids integer division in SQLite (MySQL already returns a decimal).",
    },
    {
        "id": "C4", "related": "Q11", "topic": "= NULL vs IS NULL",
        "question": "Which speeches are not part of any Pathways path?",
        "before": """SELECT speech_id, title
FROM speeches
WHERE path_code = NULL
ORDER BY speech_id;""",
        "after": """SELECT speech_id, title
FROM speeches
WHERE path_code IS NULL
ORDER BY speech_id;""",
        "change": "path_code = NULL → path_code IS NULL",
        "why": "NULL means \"unknown\". Comparing anything with NULL using = gives UNKNOWN, not TRUE, "
               "so WHERE path_code = NULL never matches a row and returns nothing. "
               "IS NULL is the operator that tests for missing values. Both SQLite and MySQL behave this way.",
    },
    {
        "id": "C5", "related": "Q13", "topic": "RANK() vs DENSE_RANK() vs ROW_NUMBER()",
        "question": "Rank the speakers of Sunrise Speakers Club (club 1) by number of speeches.",
        "before": """WITH counts AS (
    SELECT sp.member_id, COUNT(*) AS speeches
    FROM speeches sp
    JOIN meetings mt ON mt.meeting_id = sp.meeting_id
    WHERE mt.club_id = 1
    GROUP BY sp.member_id
)
SELECT m.display_name, ct.speeches,
       RANK() OVER (ORDER BY ct.speeches DESC) AS rnk
FROM counts ct
JOIN members m ON m.member_id = ct.member_id
ORDER BY ct.speeches DESC, m.display_name;""",
        "after": """WITH counts AS (
    SELECT sp.member_id, COUNT(*) AS speeches
    FROM speeches sp
    JOIN meetings mt ON mt.meeting_id = sp.meeting_id
    WHERE mt.club_id = 1
    GROUP BY sp.member_id
)
SELECT m.display_name, ct.speeches,
       RANK()       OVER (ORDER BY ct.speeches DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY ct.speeches DESC) AS dense_rnk,
       ROW_NUMBER() OVER (ORDER BY ct.speeches DESC, m.display_name) AS row_num
FROM counts ct
JOIN members m ON m.member_id = ct.member_id
ORDER BY ct.speeches DESC, m.display_name;""",
        "change": "Add DENSE_RANK() and ROW_NUMBER() next to RANK()",
        "why": "When speakers tie, RANK() gives them the same number and then skips (1, 1, 3). "
               "DENSE_RANK() gives the same number without skipping (1, 1, 2). "
               "ROW_NUMBER() always gives a different number to each row (1, 2, 3), so we add display_name "
               "to its ORDER BY to make the order of tied rows predictable.",
    },
]


def run(db, sql):
    """Run a script; return the result of the last statement or the error."""
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    try:
        for stmt in statements[:-1]:
            db.execute(stmt)
        cur = db.execute(statements[-1])
        columns = [d[0] for d in cur.description] if cur.description else []
        return {"columns": columns, "rows": [list(r) for r in cur.fetchall()]}
    except sqlite3.Error as e:
        return {"error": str(e)}


def fresh_db():
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript((ROOT / "data" / "schema.sql").read_text(encoding="utf-8"))
    db.executescript((ROOT / "data" / "seed.sql").read_text(encoding="utf-8"))
    return db


def main():
    for q in QUERIES:
        q["expected"] = run(fresh_db(), q["sql"])
    for c in COMPARISONS:
        c["before_result"] = run(fresh_db(), c["before"])
        c["after_result"] = run(fresh_db(), c["after"])

    header = "// Generated by tools/build_queries.py. Do not edit by hand.\n"
    (ROOT / "js").mkdir(exist_ok=True)
    (ROOT / "js" / "queries.js").write_text(
        header + "window.QUERIES = " + json.dumps(QUERIES, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8", newline="\n")
    (ROOT / "js" / "compare.js").write_text(
        header + "window.COMPARISONS = " + json.dumps(COMPARISONS, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8", newline="\n")

    lines = ["-- All practice SQL, for checking in MySQL 8.0+ after loading schema.sql and seed.sql.",
             "-- Generated by tools/build_queries.py.\n"]
    for q in QUERIES:
        lines += [f"-- {q['id']}: {q['question']}", q["sql"], ""]
    for c in COMPARISONS:
        lines += [f"-- {c['id']} before: {c['topic']}", c["before"], "",
                  f"-- {c['id']} after: {c['change']}", c["after"], ""]
    (ROOT / "data" / "queries.sql").write_text("\n".join(lines), encoding="utf-8", newline="\n")

    for q in QUERIES:
        e = q["expected"]
        print(q["id"], "ERROR " + e["error"] if "error" in e else f"{len(e['rows'])} rows")
    for c in COMPARISONS:
        b, a = c["before_result"], c["after_result"]
        fmt = lambda r: "ERROR " + r["error"] if "error" in r else f"{len(r['rows'])} rows"
        print(c["id"], "before:", fmt(b), "| after:", fmt(a))


if __name__ == "__main__":
    main()
