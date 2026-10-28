// Data dictionary shown in the Design section.
// Each column: [name, type, constraints, description]
window.TABLES = [
  {
    name: "areas",
    about: "Areas group several clubs. Each area belongs to a division.",
    columns: [
      ["area_id", "VARCHAR(5)", "PK", "Area code, e.g. A1"],
      ["area_name", "VARCHAR(50)", "NOT NULL", "Display name"],
      ["division", "VARCHAR(20)", "NOT NULL", "Division the area belongs to"],
    ],
  },
  {
    name: "clubs",
    about: "Each club meets on a fixed weekday and belongs to one area.",
    columns: [
      ["club_id", "INTEGER", "PK", "Club number"],
      ["club_name", "VARCHAR(60)", "NOT NULL, UNIQUE", "Club name"],
      ["area_id", "VARCHAR(5)", "FK → areas, NOT NULL", "Area of the club"],
      ["city", "VARCHAR(30)", "NOT NULL", "City where the club meets"],
      ["meeting_weekday", "VARCHAR(10)", "NOT NULL", "Regular meeting day"],
      ["charter_date", "DATE", "NOT NULL", "Date the club was chartered"],
    ],
  },
  {
    name: "members",
    about: "One row per person. Contact details are intentionally not stored.",
    columns: [
      ["member_id", "INTEGER", "PK", "Member number"],
      ["display_name", "VARCHAR(60)", "NOT NULL", "Name shown on role sheets (fictional)"],
      ["first_join_date", "DATE", "NOT NULL", "First day the person joined any club"],
    ],
  },
  {
    name: "memberships",
    about: "Links members and clubs (many-to-many). One person can belong to several clubs.",
    columns: [
      ["membership_id", "INTEGER", "PK", "Membership number"],
      ["member_id", "INTEGER", "FK → members, NOT NULL", "Who"],
      ["club_id", "INTEGER", "FK → clubs, NOT NULL", "Which club"],
      ["start_date", "DATE", "NOT NULL", "Joined this club on"],
      ["paid_through", "DATE", "NOT NULL", "Dues paid up to this date"],
      ["status", "VARCHAR(10)", "NOT NULL, CHECK in ('active','left')", "Still in the club, or left"],
      ["(member_id, club_id)", "", "UNIQUE", "A person joins the same club only once"],
    ],
  },
  {
    name: "meetings",
    about: "Club meetings. A club holds at most one meeting per day.",
    columns: [
      ["meeting_id", "INTEGER", "PK", "Meeting number"],
      ["club_id", "INTEGER", "FK → clubs, NOT NULL", "Host club"],
      ["meeting_date", "DATE", "NOT NULL", "Meeting date"],
      ["theme", "VARCHAR(60)", "NOT NULL", "Meeting theme"],
      ["(club_id, meeting_date)", "", "UNIQUE", "No two meetings of one club on the same day"],
    ],
  },
  {
    name: "roles",
    about: "Lookup table of meeting roles.",
    columns: [
      ["role_code", "VARCHAR(5)", "PK", "Short code, e.g. TME"],
      ["role_name", "VARCHAR(40)", "NOT NULL", "Full role name"],
      ["category", "VARCHAR(10)", "NOT NULL, CHECK in ('leading','supporting')", "Leading or supporting role"],
    ],
  },
  {
    name: "role_assignments",
    about: "Who takes which role in which meeting.",
    columns: [
      ["meeting_id", "INTEGER", "PK, FK → meetings", "Meeting"],
      ["role_code", "VARCHAR(5)", "PK, FK → roles", "Role"],
      ["member_id", "INTEGER", "FK → members, NOT NULL", "Person taking the role"],
    ],
  },
  {
    name: "pathways",
    about: "Learning paths a speech can belong to (sample names for demonstration).",
    columns: [
      ["path_code", "VARCHAR(5)", "PK", "Short code"],
      ["path_name", "VARCHAR(40)", "NOT NULL", "Path name"],
    ],
  },
  {
    name: "speeches",
    about: "Prepared speeches given at meetings, with timing and evaluator.",
    columns: [
      ["speech_id", "INTEGER", "PK", "Speech number"],
      ["meeting_id", "INTEGER", "FK → meetings, NOT NULL", "Meeting where it was given"],
      ["member_id", "INTEGER", "FK → members, NOT NULL", "Speaker"],
      ["evaluator_id", "INTEGER", "FK → members", "Evaluator of this speech"],
      ["path_code", "VARCHAR(5)", "FK → pathways", "NULL for non-Pathways speeches (e.g. contest practice)"],
      ["path_level", "INTEGER", "CHECK 1–5", "Level on the path"],
      ["title", "VARCHAR(80)", "NOT NULL", "Speech title"],
      ["duration_sec", "INTEGER", "", "Actual length in seconds; NULL if not recorded"],
      ["min_sec", "INTEGER", "NOT NULL", "Minimum allowed length"],
      ["max_sec", "INTEGER", "NOT NULL, CHECK min_sec < max_sec", "Maximum allowed length"],
    ],
  },
];
