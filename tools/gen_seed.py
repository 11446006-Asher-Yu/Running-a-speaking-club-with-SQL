"""Generate data/seed.sql with fictional sample data.

Run from the repo root:  python tools/gen_seed.py
The random seed is fixed, so the output is the same every time.
All names, clubs and records are fictional.
"""
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(67)

OUT = Path(__file__).resolve().parent.parent / "data" / "seed.sql"
BASE_DATE = date(2026, 10, 31)  # reference date used by the queries

AREAS = [
    ("A1", "Area A1", "Division A"),
    ("A2", "Area A2", "Division A"),
    ("A3", "Area A3", "Division B"),
]

# (club_id, name, area, city, weekday, charter_date, primary members, extra dual members)
CLUBS = [
    (1, "Sunrise Speakers Club",      "A1", "Taipei",     "Tuesday",   date(2006, 5, 12), 23, 1),
    (2, "Harbor Voices Club",         "A1", "Keelung",    "Thursday",  date(2011, 9, 3),  23, 1),
    (3, "Riverside Orators Club",     "A2", "New Taipei", "Wednesday", date(2008, 2, 20), 17, 1),
    (4, "Lantern Talkers Club",       "A2", "Taoyuan",    "Monday",    date(2013, 11, 8), 14, 1),
    (5, "Summit Communicators Club",  "A3", "Hsinchu",    "Friday",    date(2014, 6, 30), 11, 1),
    (6, "Evening Star Speakers Club", "A3", "Taichung",   "Saturday",  date(2005, 3, 15), 22, 2),
]

ROLES = [
    ("TME", "Toastmaster of the Evening", "leading"),
    ("GE",  "General Evaluator",          "leading"),
    ("TTM", "Table Topics Master",        "leading"),
    ("TMR", "Timer",                      "supporting"),
    ("GRM", "Grammarian",                 "supporting"),
    ("AHC", "Ah-Counter",                 "supporting"),
]

# Roles some clubs have in addition to the core six. They are listed in the shared
# roles table and offered through club_roles, but have no assignments in the sample.
EXTRA_ROLES = [
    ("VSM", "Variety Session Master",          "leading"),
    ("BW",  "Board Writer",                    "supporting"),
    ("PHO", "Photographer",                    "supporting"),
    ("LHE", "Language and Humor Evaluator",    "supporting"),
]

# Roles each club offers, and the name the club uses when it differs from the standard one.
# Every club offers the core six, because every sample meeting uses them.
CLUB_ROLE_NAMES = {
    1: {"TME": "Toastmaster of the Day", "AHC": "Filler Word Counter", "PHO": None},
    2: {"VSM": None, "BW": None},
    3: {"TTM": "Group Table Topics Master", "GRM": "Language Evaluator", "LHE": None},
    4: {},
    5: {"PHO": None, "BW": "Whiteboard Recorder"},
    6: {"TME": "Meeting Host", "VSM": "Warm-up Host", "LHE": None, "PHO": None},
}

PATHWAYS = [
    ("PM", "Presentation Mastery"),
    ("DL", "Dynamic Leadership"),
    ("PI", "Persuasive Influence"),
    ("VC", "Visionary Communication"),
    ("EH", "Engaging Humor"),
    ("MS", "Motivational Strategies"),
]

FIRST = ["Amy", "Ben", "Cindy", "David", "Emma", "Frank", "Grace", "Henry", "Irene",
         "Jack", "Kelly", "Leo", "Mia", "Nick", "Olivia", "Peter", "Queenie", "Ryan",
         "Sophia", "Tony", "Una", "Vincent", "Wendy", "Xavier", "Yvonne", "Zack",
         "Alice", "Brian", "Claire", "Daniel", "Eva", "Felix", "Gina", "Hank", "Ivy"]
LAST = ["Lin", "Chen", "Wang", "Huang", "Chang", "Liu", "Tsai", "Yang", "Hsu", "Cheng",
        "Wu", "Lai", "Kuo", "Hung", "Tseng", "Chiu", "Lu", "Hsieh", "Yeh", "Su"]

THEMES = ["New Beginnings", "Courage", "Home", "Travel Stories", "Food and Culture",
          "Change", "Gratitude", "Teamwork", "Dreams", "Challenges", "Friendship",
          "Technology", "Nature", "Time", "Lessons Learned", "Music", "Kindness",
          "Balance", "Curiosity", "Habits", "Moon Festival", "Heroes", "Leadership",
          "Harvest"]

TOPICS = ["My First Job", "Why I Run", "Lessons from My Grandmother", "The Power of No",
          "A Trip to Hualien", "Learning to Cook", "Fear of the Stage", "My Cat, My Boss",
          "Small Habits, Big Changes", "Volunteering Matters", "Digital Detox",
          "The Art of Listening", "Coffee Culture", "Failing Forward", "Night Market Memories",
          "Saving Money Smartly", "Why We Need Sleep", "Mountain Hiking Tips",
          "Leading Without a Title", "A Letter to My Younger Self", "Jokes My Dad Told",
          "The Bus Driver Who Smiled", "Planning a Team Event", "Motivating Your Friends",
          "Storytelling at Work", "One Book That Changed Me", "Rainy Day Thoughts",
          "Learning a Second Language", "Cycling Around Taiwan", "The Best Advice I Ignored"]


def weekday_index(name):
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].index(name)


def rand_date(start, end):
    return start + timedelta(days=random.randint(0, (end - start).days))


def sql_value(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int,)):
        return str(v)
    if isinstance(v, date):
        return f"'{v.isoformat()}'"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, columns, rows):
    lines = [f"INSERT INTO {table} ({', '.join(columns)}) VALUES"]
    body = [f"    ({', '.join(sql_value(v) for v in row)})" for row in rows]
    return lines[0] + "\n" + ",\n".join(body) + ";\n"


# ---- members -------------------------------------------------------------
total_primary = sum(c[6] for c in CLUBS)
names = [f"{f} {l}" for f in FIRST for l in LAST]
random.shuffle(names)
members = []
for i in range(total_primary):
    members.append((i + 1, names[i], rand_date(date(2015, 1, 1), date(2026, 7, 31))))

# ---- memberships ---------------------------------------------------------
memberships = []
primary_club = {}
ids = [m[0] for m in members]
random.shuffle(ids)
pos = 0
for club in CLUBS:
    for _ in range(club[6]):
        primary_club[ids[pos]] = club[0]
        pos += 1

join_date = {m[0]: m[2] for m in members}
pairs = [(mid, cid, join_date[mid]) for mid, cid in primary_club.items()]

# dual members: second membership in a different club, started later
dual_candidates = [mid for mid in sorted(primary_club) if join_date[mid] < date(2025, 1, 1)]
random.shuffle(dual_candidates)
for club in CLUBS:
    for _ in range(club[7]):
        mid = next(m for m in dual_candidates if primary_club[m] != club[0])
        dual_candidates.remove(mid)
        pairs.append((mid, club[0], rand_date(join_date[mid] + timedelta(days=180), date(2026, 6, 30))))

pairs.sort(key=lambda p: (p[1], p[2], p[0]))
random_order = list(range(len(pairs)))
random.shuffle(random_order)
left_idx = set(random_order[:6])       # left the club
lapsed_idx = set(random_order[6:15])   # still listed, dues not renewed
for i, (mid, cid, start) in enumerate(pairs):
    if i in left_idx:
        status, paid = "left", date(2026, 3, 31)
    elif i in lapsed_idx:
        status, paid = "active", date(2026, 9, 30)
    else:
        status, paid = "active", date(2027, 3, 31)
    memberships.append((i + 1, mid, cid, start, paid, status))

# ---- meetings ------------------------------------------------------------
meetings = []
meeting_id = 1
for club in CLUBS:
    d = date(2026, 8, 1)
    while d.weekday() != weekday_index(club[4]):
        d += timedelta(days=1)
    for k in range(4):
        meetings.append((meeting_id, club[0], d + timedelta(weeks=3 * k), random.choice(THEMES)))
        meeting_id += 1

# ---- role assignments and speeches ---------------------------------------
# Only some active members are "engaged", so a number of members never take a role.
engaged = {}
for club in CLUBS:
    pool = [m[1] for m in memberships if m[2] == club[0] and m[5] == "active"]
    pool.sort()
    random.shuffle(pool)
    engaged[club[0]] = pool[: max(10, int(len(pool) * 0.6))]

assignments = []
speeches = []
speech_id = 1
for mt_id, club_id, mt_date, _ in meetings:
    starts = {m[1]: m[3] for m in memberships if m[2] == club_id}
    pool = [mid for mid in engaged[club_id] if starts[mid] <= mt_date]
    random.shuffle(pool)
    holders = pool[: len(ROLES)]
    for (code, _, _), mid in zip(ROLES, holders):
        assignments.append((mt_id, code, mid))
    # speakers never hold another role in the same meeting; evaluators may
    rest = pool[len(ROLES):]
    n_speech = min(random.choice([2, 3, 3]), len(rest))
    for j in range(n_speech):
        speaker = rest[j]
        evaluator = random.choice([mid for mid in pool if mid != speaker])
        if random.random() < 0.12:
            path, level, title = None, None, "Contest Practice: " + random.choice(TOPICS)
        else:
            path = random.choice(PATHWAYS)[0]
            level = random.randint(1, 5)
            title = random.choice(TOPICS)
        min_sec, max_sec = (240, 360) if level == 1 else (300, 420)
        if random.random() < 0.08:
            duration = None
        else:
            duration = int(random.gauss((min_sec + max_sec) / 2, 55))
        speeches.append((speech_id, mt_id, speaker, evaluator, path, level, title,
                         duration, min_sec, max_sec))
        speech_id += 1

# ---- club roles (no randomness, so the data above is unchanged) ----------
standard_name = {code: name for code, name, _ in ROLES + EXTRA_ROLES}
club_roles = []
for club in CLUBS:
    names = CLUB_ROLE_NAMES[club[0]]
    codes = [code for code, _, _ in ROLES] + [c for c in names if c not in {r[0] for r in ROLES}]
    for code in codes:
        club_roles.append((club[0], code, names.get(code) or standard_name[code]))

# ---- write ---------------------------------------------------------------
parts = [
    "-- Fictional sample data for the Toastmasters Club Operations DB.\n"
    "-- Generated by tools/gen_seed.py (random seed 67). Do not edit by hand.\n"
    f"-- Reference date for queries: '{BASE_DATE.isoformat()}'.\n",
    insert("areas", ["area_id", "area_name", "division"], AREAS),
    insert("clubs", ["club_id", "club_name", "area_id", "city", "meeting_weekday", "charter_date"],
           [c[:6] for c in CLUBS]),
    insert("members", ["member_id", "display_name", "first_join_date"], members),
    insert("memberships", ["membership_id", "member_id", "club_id", "start_date", "paid_through", "status"],
           memberships),
    insert("meetings", ["meeting_id", "club_id", "meeting_date", "theme"], meetings),
    insert("roles", ["role_code", "role_name", "category"], ROLES + EXTRA_ROLES),
    insert("club_roles", ["club_id", "role_code", "local_name"], club_roles),
    insert("role_assignments", ["meeting_id", "role_code", "member_id"], assignments),
    insert("pathways", ["path_code", "path_name"], PATHWAYS),
    insert("speeches", ["speech_id", "meeting_id", "member_id", "evaluator_id", "path_code",
                        "path_level", "title", "duration_sec", "min_sec", "max_sec", "status"],
           # every sample meeting is in the past, so every speech has been delivered
           [s + ("delivered",) for s in speeches]),
]
OUT.write_text("\n".join(parts), encoding="utf-8", newline="\n")
print(f"members={len(members)} memberships={len(memberships)} meetings={len(meetings)} "
      f"role_assignments={len(assignments)} speeches={len(speeches)} club_roles={len(club_roles)}")
