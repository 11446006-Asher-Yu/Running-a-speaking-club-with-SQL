# Club Operations SQL Lab

An interactive SQL practice site built on a fictional Toastmasters club operations database.
Course project for Database Management, National Taipei University of Business.
Author: 余欣嬨 (11446006)

**Live site:** https://11446006-asher-yu.github.io/Running-a-speaking-club-with-SQL/
**中文版：** https://11446006-asher-yu.github.io/Running-a-speaking-club-with-SQL/?lang=zh

The page is bilingual (English / Traditional Chinese). Use the button at the top right to switch.

> **Data notice:** every person, club, meeting and speech in this database is fictional. No real member data is used.

## What the site contains

1. **Case background**: who uses the database and which problems it solves
2. **Database design**: ERD, design decisions, column dictionary and sample data
3. **Query practice**: 14 questions with editable SQL, expected results and live execution
4. **Result comparison**: 5 before/after SQL pairs with explanations
5. **Playground**: free SQL editor and an "About the SQL engine" note

## How it works

- SQL runs in the browser with [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly), so the site works on GitHub Pages without a server.
- All SQL is written to run on both SQLite and MySQL 8.0+.
- "Active member" means `status = 'active' AND paid_through >= '2026-10-31'`. The fixed date keeps the expected results stable.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `css/`, `js/app.js` | The web page |
| `js/design.js` | Column dictionary shown in the Design section (English and Chinese) |
| `data/schema.sql` | `CREATE TABLE` statements |
| `data/seed.sql` | Sample data (generated) |
| `data/queries.sql` | All practice SQL in one file, for checking in MySQL (generated) |
| `js/queries.js`, `js/compare.js` | Questions, SQL and expected results (generated) |
| `tools/gen_seed.py` | Generates `seed.sql` with a fixed random seed |
| `tools/build_queries.py` | Holds all practice SQL and its Chinese text; runs it and writes the expected results |
| `tools/verify_mysql.py` | Runs all practice SQL on MySQL and compares with the expected results |

## Run locally

The page loads `data/*.sql` with `fetch`, so open it through a web server, not by double-clicking the file:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/.

## Check on MySQL

`tools/verify_mysql.py` loads the data into a fresh MySQL database and compares every query with the expected results.
Last run: MySQL 8.4.9 with the default `sql_mode` (including `ONLY_FULL_GROUP_BY`), 24/24 match.

```bash
pip install pymysql
python tools/verify_mysql.py --port 3306 --user root --password <your password>
```

## Rebuild the data

```bash
python tools/gen_seed.py
python tools/build_queries.py
```

## AI use

AI tools helped generate the fictional sample data, the page code and some wording.
The table design, the questions and the checking of every result were done and reviewed by the author.
