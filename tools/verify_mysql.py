"""Check that every practice query gives the same result on MySQL as on the web page.

Loads data/schema.sql and data/seed.sql into a fresh MySQL database, runs all SQL
from js/queries.js and js/compare.js, and compares with the recorded expected results.

Usage (from the repo root):
  pip install pymysql
  python tools/verify_mysql.py --host 127.0.0.1 --port 3306 --user root --password ...
The database named by --database is dropped and recreated.
"""
import argparse
import datetime
import decimal
import json
from pathlib import Path

import pymysql

ROOT = Path(__file__).resolve().parent.parent


def load_js(name):
    text = (ROOT / "js" / name).read_text(encoding="utf-8")
    return json.loads(text[text.index("=") + 1:].rstrip().rstrip(";"))


def statements(sql):
    return [s.strip() for s in sql.split(";") if s.strip()]


def normalize(value):
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return value


def run(conn, sql):
    try:
        with conn.cursor() as cur:
            for stmt in statements(sql):
                cur.execute(stmt)
            columns = [d[0] for d in cur.description] if cur.description else []
            rows = [[normalize(v) for v in row] for row in cur.fetchall()]
        return {"columns": columns, "rows": rows}
    except pymysql.MySQLError as e:
        return {"error": f"{e.args[0]}: {e.args[1]}"}


def describe_diff(actual, expected):
    if "error" in actual or "error" in expected:
        if "error" in actual and "error" in expected:
            return None
        return f"MySQL: {actual.get('error', 'ok')} | page: {expected.get('error', 'ok')}"
    if actual["columns"] != expected["columns"]:
        return f"columns differ: {actual['columns']} vs {expected['columns']}"
    if len(actual["rows"]) != len(expected["rows"]):
        return f"row count differs: MySQL {len(actual['rows'])} vs page {len(expected['rows'])}"
    for i, (a, e) in enumerate(zip(actual["rows"], expected["rows"])):
        if a != e:
            return f"row {i + 1} differs: MySQL {a} vs page {e}"
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=3306)
    p.add_argument("--user", default="root")
    p.add_argument("--password", default="")
    p.add_argument("--database", default="club_ops_verify")
    args = p.parse_args()

    conn = pymysql.connect(host=args.host, port=args.port, user=args.user,
                           password=args.password, charset="utf8mb4", autocommit=True)
    with conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS {args.database}")
        cur.execute(f"CREATE DATABASE {args.database} CHARACTER SET utf8mb4")
        cur.execute(f"USE {args.database}")
        cur.execute("SELECT VERSION(), @@sql_mode")
        version, sql_mode = cur.fetchone()
    print(f"MySQL {version}\nsql_mode: {sql_mode}\n")

    for name in ("schema.sql", "seed.sql"):
        result = run(conn, (ROOT / "data" / name).read_text(encoding="utf-8"))
        if "error" in result:
            print(f"Loading {name} failed: {result['error']}")
            return
    print("Loaded schema.sql and seed.sql\n")

    checks = [(q["id"], q["sql"], q["expected"]) for q in load_js("queries.js")]
    for c in load_js("compare.js"):
        checks.append((c["id"] + " before", c["before"], c["before_result"]))
        checks.append((c["id"] + " after", c["after"], c["after_result"]))

    failed = 0
    for label, sql, expected in checks:
        actual = run(conn, sql)
        diff = describe_diff(actual, expected)
        if "error" in actual and diff is None:
            print(f"OK    {label:10} (error on both, MySQL says: {actual['error']})")
        elif diff is None:
            print(f"OK    {label:10} ({len(actual['rows'])} rows)")
        else:
            failed += 1
            print(f"DIFF  {label:10} {diff}")
    print(f"\n{len(checks) - failed}/{len(checks)} match")


if __name__ == "__main__":
    main()
