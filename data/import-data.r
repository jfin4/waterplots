# initial setup --------------------------------------------------------------
library("tidyverse")
library("lubridate")
library("hms")
library("fs")
library("readxl")
library("writexl")
library("RSQLite")
library("parallel")
library("data.table")

rm(list = ls())

# connect to database
con <- dbConnect(SQLite(), dbname = "data.db")

# Often fastest for your workflow
.data <- fread("./ceden-2025-05-30.tsv", nThread = getDTthreads())

# check for nonprintable characters
check_non_printable_chars_df <- function(df) {
  non_printable_chars_report <- list()

  for (i in seq_len(nrow(df))) {
    line <- paste(df[i, ], collapse = " ")
    non_printable_chars <- unlist(strsplit(line, NULL))
    non_printable_chars <- non_printable_chars[sapply(non_printable_chars, function(char) {
      char_code <- utf8ToInt(char)
      (char_code < 32 && !(char_code %in% c(9, 10, 13))) || char_code == 127
    })]

    if (length(non_printable_chars) > 0) {
      non_printable_chars_report[[paste("Row", i)]] <- paste(non_printable_chars, collapse = "")
    }
  }

  if (length(non_printable_chars_report) > 0) {
    for (entry in names(non_printable_chars_report)) {
      cat(sprintf("%s: %s\n", entry, repr::repr(non_printable_chars_report[[entry]])))
    }
  } else {
    cat("No non-printable characters found.\n")
  }
}

# Call the function with the dataframe
check_non_printable_chars_df(.data)

# manage stations table ------------------------------------------------------
# identify stations
stations <- 
    .data[,
          # select and rename columns, convert to numeric
          .(code = StationCode,
            latitude = as.numeric(TargetLatitude),
            longitude = as.numeric(TargetLongitude))
          ]
stations <- stations[complete.cases(stations)]
stations <- unique(stations)

# create table
query <- "
    CREATE TABLE IF NOT EXISTS stations (
    code TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    UNIQUE(code, latitude, longitude) -- sets constraint for unique rows
    );
"
dbExecute(con, query)

# insert rows
query <- "
    INSERT OR IGNORE INTO stations -- ignores duplicate rows
    (code, latitude, longitude) 
    VALUES (?, ?, ?)
"
dbExecute(con, query, params = list(stations$code, 
                                    stations$latitude, 
                                    stations$longitude))

# mangage results table ------------------------------------------------------
# identify results -----------------------------------------------------------

results <- 
    .data[,
          # select and rename columns, convert to numeric
          .(matrix = MatrixName,
            project = ParentProject,
            code = StationCode, 
            pollutant = Analyte,
            date = as.character(as_date(mdy_hms(SampleDate))),
            time = as.character(as_hms(mdy_hms(CollectionTime))),
            result = as.numeric(Result),
            unit = Unit)
          ]
results <- results[complete.cases(results)]
results <- unique(results)

# create table
query <- "
    CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matrix TEXT,
    project TEXT,
    code TEXT,
    pollutant TEXT,
    date TEXT,
    time TIME,
    result REAL,
    unit TEXT
    );
"
dbExecute(con, query)

# insert rows
query <- "
INSERT OR IGNORE INTO results (
    matrix,
    project,
    code,
    pollutant,
    date,
    time,
    result,
    unit 
)
VALUES (
    ?,  -- matrix
    ?,  -- project
    ?,  -- code
    ?,  -- pollutant
    ?,  -- date
    ?,  -- time
    ?,  -- result
    ?   -- unit
);
"
dbExecute(con, query, params = list(results$matrix, 
                                    results$project,
                                    results$code,
                                    results$pollutant,
                                    results$date,
                                    results$time,
                                    results$result,
                                    results$unit))

# clean up -------------------------------------------------------------------
dbDisconnect(con)
