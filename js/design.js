// Data dictionary shown in the Design section.
// Each column: [name, type, constraints, description (English), description (Chinese)]
window.TABLES = [
  {
    name: "areas",
    about: "Areas group several clubs. Each area belongs to a division.",
    about_zh: "區域底下有好幾個分會，每個區域屬於一個部（division）。",
    columns: [
      ["area_id", "VARCHAR(5)", "PK", "Area code, e.g. A1", "區域代碼，例如 A1"],
      ["area_name", "VARCHAR(50)", "NOT NULL", "Display name", "顯示名稱"],
      ["division", "VARCHAR(20)", "NOT NULL", "Division the area belongs to", "區域所屬的部"],
    ],
  },
  {
    name: "clubs",
    about: "Each club meets on a fixed weekday and belongs to one area.",
    about_zh: "每個分會在固定的星期開例會，並且屬於一個區域。",
    columns: [
      ["club_id", "INTEGER", "PK", "Club number", "分會編號"],
      ["club_name", "VARCHAR(60)", "NOT NULL, UNIQUE", "Club name", "分會名稱（不可重複）"],
      ["area_id", "VARCHAR(5)", "FK → areas, NOT NULL", "Area of the club", "分會所屬的區域"],
      ["city", "VARCHAR(30)", "NOT NULL", "City where the club meets", "例會所在城市"],
      ["meeting_weekday", "VARCHAR(10)", "NOT NULL", "Regular meeting day", "固定例會星期"],
      ["charter_date", "DATE", "NOT NULL", "Date the club was chartered", "分會成立日期"],
    ],
  },
  {
    name: "members",
    about: "One row per person. Contact details are intentionally not stored.",
    about_zh: "每個人一列。刻意不存聯絡資料。",
    columns: [
      ["member_id", "INTEGER", "PK", "Member number", "會員編號"],
      ["display_name", "VARCHAR(60)", "NOT NULL", "Name shown on role sheets (fictional)", "角色表上顯示的名字（虛構）"],
      ["first_join_date", "DATE", "NOT NULL", "First day the person joined any club", "第一次加入任何分會的日期"],
    ],
  },
  {
    name: "memberships",
    about: "Links members and clubs (M:N). One person can belong to several clubs.",
    about_zh: "連接會員與分會（M:N）。一個人可以同時屬於好幾個分會。",
    columns: [
      ["membership_id", "INTEGER", "PK", "Membership number", "會籍編號"],
      ["member_id", "INTEGER", "FK → members, NOT NULL", "Who", "哪位會員"],
      ["club_id", "INTEGER", "FK → clubs, NOT NULL", "Which club", "哪個分會"],
      ["start_date", "DATE", "NOT NULL", "Joined this club on", "加入這個分會的日期"],
      ["paid_through", "DATE", "NOT NULL", "Dues paid up to this date", "會費繳到哪一天"],
      ["status", "VARCHAR(10)", "NOT NULL, CHECK in ('active','left')", "Still in the club, or left", "還在分會（active）或已離開（left）"],
      ["(member_id, club_id)", "", "UNIQUE", "A person joins the same club only once", "同一個人不會重複加入同一個分會"],
    ],
  },
  {
    name: "meetings",
    about: "Club meetings. A club holds at most one meeting per day.",
    about_zh: "分會例會。一個分會一天最多一場例會。",
    columns: [
      ["meeting_id", "INTEGER", "PK", "Meeting number", "例會編號"],
      ["club_id", "INTEGER", "FK → clubs, NOT NULL", "Host club", "主辦分會"],
      ["meeting_date", "DATE", "NOT NULL", "Meeting date", "例會日期"],
      ["theme", "VARCHAR(60)", "NOT NULL", "Meeting theme", "例會主題"],
      ["(club_id, meeting_date)", "", "UNIQUE", "No two meetings of one club on the same day", "同一個分會同一天不會有兩場例會"],
    ],
  },
  {
    name: "roles",
    about: "Lookup table of meeting roles.",
    about_zh: "例會角色的代碼表。",
    columns: [
      ["role_code", "VARCHAR(5)", "PK", "Short code, e.g. TME", "角色代碼，例如 TME（總主持人）"],
      ["role_name", "VARCHAR(40)", "NOT NULL", "Full role name", "角色完整名稱"],
      ["category", "VARCHAR(10)", "NOT NULL, CHECK in ('leading','supporting')", "Leading or supporting role", "主導角色（leading）或輔助角色（supporting）"],
    ],
  },
  {
    name: "role_assignments",
    about: "Who takes which role in which meeting. A role may have several people (e.g. co-hosts), and a person may take several roles.",
    about_zh: "哪一場例會、哪個角色、由誰擔任。一個角色可以有好幾個人（例如雙主持），一個人也可以兼任好幾個角色。",
    columns: [
      ["meeting_id", "INTEGER", "PK, FK → meetings", "Meeting", "例會"],
      ["role_code", "VARCHAR(5)", "PK, FK → roles", "Role", "角色"],
      ["member_id", "INTEGER", "PK, FK → members", "Person taking the role", "擔任者"],
    ],
  },
  {
    name: "pathways",
    about: "Learning paths a speech can belong to (sample names for demonstration).",
    about_zh: "演講可以歸屬的學習路徑（示範用的路徑名稱）。",
    columns: [
      ["path_code", "VARCHAR(5)", "PK", "Short code", "路徑代碼"],
      ["path_name", "VARCHAR(40)", "NOT NULL", "Path name", "路徑名稱"],
    ],
  },
  {
    name: "speeches",
    about: "Prepared speeches given at meetings, with timing and evaluator.",
    about_zh: "例會中的備稿演講，包含計時與講評員。",
    columns: [
      ["speech_id", "INTEGER", "PK", "Speech number", "演講編號"],
      ["meeting_id", "INTEGER", "FK → meetings, NOT NULL", "Meeting where it was given", "在哪場例會發表"],
      ["member_id", "INTEGER", "FK → members, NOT NULL", "Speaker", "講者"],
      ["evaluator_id", "INTEGER", "FK → members", "Evaluator of this speech", "這場演講的講評員"],
      ["path_code", "VARCHAR(5)", "FK → pathways", "NULL for non-Pathways speeches (e.g. contest practice)", "不屬於 Pathways 的演講（例如比賽練習）為 NULL"],
      ["path_level", "INTEGER", "CHECK 1–5", "Level on the path", "路徑階段"],
      ["title", "VARCHAR(80)", "NOT NULL", "Speech title", "講題"],
      ["duration_sec", "INTEGER", "", "Actual length in seconds; NULL if not recorded", "實際演講秒數；沒有記錄時為 NULL"],
      ["min_sec", "INTEGER", "NOT NULL", "Minimum allowed length", "規定的最短秒數"],
      ["max_sec", "INTEGER", "NOT NULL, CHECK min_sec < max_sec", "Maximum allowed length", "規定的最長秒數"],
    ],
  },
];
