.echo on
.open data.db

-- results
-- ------------------------------------------------------------------------------
-- persistent
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matrix TEXT,
    project TEXT,
    code TEXT,
    pollutant TEXT,
    date TEXT,
    time TEXT,
    result REAL,
    unit TEXT
    -- UNIQUE(matrix, project, code, pollutant, date, time, result, unit) -- sets constraint for unique rows
);

-- temporary, col order must match data
CREATE TABLE IF NOT EXISTS results_new (
    matrix TEXT,
    project TEXT,
    code TEXT,
    pollutant TEXT,
    date TEXT,
    time TEXT,
    result REAL,
    unit TEXT
);

-- Import CSV data
.import --csv --skip 1 results.csv results_new
INSERT OR IGNORE INTO results (matrix, project, code, pollutant, date, time, result, unit)
SELECT matrix, project, code, pollutant, date, time, result, unit FROM results_new;
DROP TABLE results_new;

-- On results table
CREATE INDEX idx_results_station ON results(code);

-- Check the import
SELECT COUNT(*) as total_records FROM results;
SELECT * FROM results LIMIT 5;

-- stations
-- ------------------------------------------------------------------------------

-- persistent
CREATE TABLE IF NOT EXISTS stations (
    code TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL
    -- UNIQUE(code, latitude, longitude) -- sets constraint for unique rows
    );

-- temporary
CREATE TABLE IF NOT EXISTS stations_new (
    code TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL
    -- UNIQUE(code, latitude, longitude) -- sets constraint for unique rows
    );

-- Import CSV data
.import --csv --skip 1 stations.csv stations
INSERT OR IGNORE INTO stations (code, latitude, longitude)
SELECT code, latitude, longitude FROM stations_new;
DROP TABLE stations_new;

-- Check the import
SELECT COUNT(*) as total_records FROM stations;
SELECT * FROM stations LIMIT 5;


-- exit, doesn't work when sourced by repl
.exit
