
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

# .data <- read_tsv("./data/ceden-data-2024-04-12.tsv", 
#                   col_types = cols(.default = "c"))

stations <- 
  .data %>% 
  select(station_code = StationCode, 
         longitude = TargetLongitude, 
         latitude = TargetLatitude) %>% 
  mutate(across(c(longitude, latitude), as.numeric)) %>% 
  distinct() %>% 
  identity()

db_name <- "data_viewer.db"
stations_name <- "stations"

con <- dbConnect(SQLite(), dbname = db_name)

dbExecute(con, "
          CREATE TABLE IF NOT EXISTS stations (
          station_id INTEGER PRIMARY KEY AUTOINCREMENT,
          station_code TEXT,
          latitude REAL,
          longitude REAL
          );
          ")

existing_stations <- 
    dbGetQuery(con, "
               SELECT * FROM stations
               ")

stations <- 
    stations %>% 
    anti_join(existing_stations)


dbWriteTable(con, "stations", stations, append = TRUE, row.names = FALSE)

dbDisconnect(con)
