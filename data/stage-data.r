library("data.table")
library("hms")
library("tidyverse")

# load, filter, select, save 
# .data <- fread("./ceden-2025-05-30.tsv")
# data <- 
#     .data[MatrixName == "samplewater", .(Date = SampleDate,
#                                          Time = CollectionTime,
#                                          Project = ParentProject,
#                                          Station = StationCode, 
#                                          Latitude = TargetLatitude,
#                                          Longitude = TargetLongitude,
#                                          Matrix = MatrixName,
#                                          Pollutant = Analyte, 
#                                          Fraction = FractionName,
#                                          Result = Result,
#                                          Unit)]
# fwrite(data, "./ceden-2025-05-30-subset.tsv")
.data <- fread("./ceden-2025-05-30-subset.tsv")

# Fraction is included in Analyte name
results <- 
    copy(.data)[
           , `:=`(Date = Date %>% mdy_hms() %>% as_date(),
                  Time = Time %>% mdy_hms() %>% as_hms(),
                  Result = Result %>% as.numeric()) ][
           , `:=`(Result = ifelse(is.na(Result), 0, Result),
                  year = Date %>% year(), 
                  week = Date %>% week()) ][
           , `:=`(Date = mean(Date, na.rm = TRUE),
                  Time = mean(Time, na.rm = TRUE),
                  Result = mean(Result, na.rm = FALSE)), by = .(Project,
                                                               Station, 
                                                               Matrix,
                                                               Pollutant, 
                                                               year, 
                                                               week) ][
           , `:=`(Date = Date %>% as.character(), # sqlite doesn't have date type
                  Time = Time %>% as.character()) ][ # TODO: convert to int
           , !c("year", "week", "Latitude", "Longitude", "Fraction")][
           , .(Matrix, Project, Station, Pollutant, Date, Time, Result, Unit) ]
results <- unique(results)
results <- na.omit(results) # NAs were converted to 0s
fwrite(results, "results.csv")

stations <- 
    copy(.data)[
                , .(Station,
                    Latitude = Latitude %>% as.numeric(),
                    Longitude = Longitude %>% as.numeric()) ]
stations <- unique(stations)
stations <- na.omit(stations)
fwrite(stations, "stations.csv")
