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
con <- dbConnect(SQLite(), dbname = "./water_quality.db")

# # load data
# .data <- read_tsv("./data/ceden-data-2024-04-12.tsv", 
#                   col_types = cols(.default = "c"))

# manage stations table ------------------------------------------------------
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

dbDisconnect(con)
