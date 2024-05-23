# initial setup --------------------------------------------------------------
packages <- c('tidyverse',
              'forecast',
              'RSQLite',
              'nlme',
              'hms')
for (package in packages) {
  if (!require(package, character.only = TRUE)) {
    install.packages(package, repos = "https://cloud.r-project.org/")
    require(package)
  }
}

rm(list = ls())

# connect to database
con <- dbConnect(SQLite(), dbname = "./data/water_quality_all.db")

# load data
.data <- read_tsv("./data/ceden-data-2024-04-12.tsv", 
                  col_types = cols(.default = "c"))

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

# Example dataframe
df <- data.frame(
  column1 = c("This is a test", "This line has a \001 non-printable char"),
  column2 = c("Another \007 test", "All good here"),
  stringsAsFactors = FALSE
)

# Call the function with the dataframe
check_non_printable_chars_df(.data)

# manage stations table ------------------------------------------------------
# identify stations
stations <- 
  .data %>% 
  select(code = StationCode, 
         latitude = TargetLatitude,
         longitude = TargetLongitude) %>% 
  mutate(across(c(longitude, latitude), as.numeric)) %>% 
  filter(across(everything(), \(x) !is.na(x))) %>% 
  distinct()  %>%
  identity()

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
  .data %>% 
  select(matrix = MatrixName,
         project = ParentProject,
         code = StationCode, 
         pollutant = Analyte,
         date = SampleDate,
         time = CollectionTime,
         result = Result,
         unit = Unit) %>%
  # filter(code == "304-LEONA-21") %>% 
  filter(across(everything(), \(x) !is.na(x))) %>% 
  mutate(result = as.numeric(result),
         date = as.character(as_date(mdy_hms(date))),
         time = as.character(as_hms(mdy_hms(time)))) %>% 
  distinct()  %>%
  identity()

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

foo <- dbGetQuery(con, "SELECT * FROM results")
# as_tibble(foo)
dbExecute(con, "DROP TABLE results")
