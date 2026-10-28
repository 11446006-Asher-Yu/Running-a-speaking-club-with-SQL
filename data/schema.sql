-- Toastmasters Club Operations DB
-- Portable DDL: runs on both SQLite (sql.js) and MySQL 8.0.16+.
-- Rules: VARCHAR instead of TEXT, explicit ids instead of AUTO_INCREMENT,
-- dates stored as 'YYYY-MM-DD', table-level CHECK constraints.
-- All data in this database is fictional.

DROP TABLE IF EXISTS speeches;
DROP TABLE IF EXISTS role_assignments;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS pathways;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS areas;

CREATE TABLE areas (
    area_id         VARCHAR(5)   PRIMARY KEY,
    area_name       VARCHAR(50)  NOT NULL,
    division        VARCHAR(20)  NOT NULL
);

CREATE TABLE clubs (
    club_id         INTEGER      PRIMARY KEY,
    club_name       VARCHAR(60)  NOT NULL UNIQUE,
    area_id         VARCHAR(5)   NOT NULL,
    city            VARCHAR(30)  NOT NULL,
    meeting_weekday VARCHAR(10)  NOT NULL,
    charter_date    DATE         NOT NULL,
    FOREIGN KEY (area_id) REFERENCES areas (area_id)
);

CREATE TABLE members (
    member_id       INTEGER      PRIMARY KEY,
    display_name    VARCHAR(60)  NOT NULL,
    first_join_date DATE         NOT NULL
);

-- M:N between members and clubs (a member may belong to several clubs).
-- paid_through belongs to one membership, not to the person.
CREATE TABLE memberships (
    membership_id   INTEGER      PRIMARY KEY,
    member_id       INTEGER      NOT NULL,
    club_id         INTEGER      NOT NULL,
    start_date      DATE         NOT NULL,
    paid_through    DATE         NOT NULL,
    status          VARCHAR(10)  NOT NULL,
    UNIQUE (member_id, club_id),
    CHECK (status IN ('active', 'left')),
    FOREIGN KEY (member_id) REFERENCES members (member_id),
    FOREIGN KEY (club_id)   REFERENCES clubs (club_id)
);

CREATE TABLE meetings (
    meeting_id      INTEGER      PRIMARY KEY,
    club_id         INTEGER      NOT NULL,
    meeting_date    DATE         NOT NULL,
    theme           VARCHAR(60)  NOT NULL,
    UNIQUE (club_id, meeting_date),
    FOREIGN KEY (club_id) REFERENCES clubs (club_id)
);

CREATE TABLE roles (
    role_code       VARCHAR(5)   PRIMARY KEY,
    role_name       VARCHAR(40)  NOT NULL,
    category        VARCHAR(10)  NOT NULL,
    CHECK (category IN ('leading', 'supporting'))
);

-- One person per role per meeting: enforced by the composite primary key.
CREATE TABLE role_assignments (
    meeting_id      INTEGER      NOT NULL,
    role_code       VARCHAR(5)   NOT NULL,
    member_id       INTEGER      NOT NULL,
    PRIMARY KEY (meeting_id, role_code),
    FOREIGN KEY (meeting_id) REFERENCES meetings (meeting_id),
    FOREIGN KEY (role_code)  REFERENCES roles (role_code),
    FOREIGN KEY (member_id)  REFERENCES members (member_id)
);

CREATE TABLE pathways (
    path_code       VARCHAR(5)   PRIMARY KEY,
    path_name       VARCHAR(40)  NOT NULL
);

-- path_code is NULL for non-Pathways speeches (e.g. contest practice).
-- duration_sec is NULL when the timer did not record it.
CREATE TABLE speeches (
    speech_id       INTEGER      PRIMARY KEY,
    meeting_id      INTEGER      NOT NULL,
    member_id       INTEGER      NOT NULL,
    evaluator_id    INTEGER,
    path_code       VARCHAR(5),
    path_level      INTEGER,
    title           VARCHAR(80)  NOT NULL,
    duration_sec    INTEGER,
    min_sec         INTEGER      NOT NULL,
    max_sec         INTEGER      NOT NULL,
    CHECK (path_level BETWEEN 1 AND 5),
    CHECK (min_sec < max_sec),
    FOREIGN KEY (meeting_id)   REFERENCES meetings (meeting_id),
    FOREIGN KEY (member_id)    REFERENCES members (member_id),
    FOREIGN KEY (evaluator_id) REFERENCES members (member_id),
    FOREIGN KEY (path_code)    REFERENCES pathways (path_code)
);
