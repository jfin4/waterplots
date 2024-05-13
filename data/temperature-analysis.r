packages <- c('tidyverse',
              'forecast',
              'nlme',
              'hms')
for (package in packages) {
  if (!require(package, character.only = TRUE)) {
    install.packages(package, repos = "https://cloud.r-project.org/")
    require(package)
  }
}

rm(list = ls())

.flow <- read_tsv("./usgs-upstream-309dav-flow.tsv",
                 comment = "#",
                 col_types = cols(.default = "c"))

flow <- 
  .flow %>% 
  rename(flow = `8712_00060_00003`,
         date = datetime) %>% 
  mutate(date = ymd(date),
         flow = as.double(flow),
         flow = if_else(flow == 0, 0.1, flow)) %>% 
  slice(-1)

# .data <- read_tsv("./ceden-data-2024-04-12.tsv", 
#                   col_types = cols(.default = "c"))

data <- 
  .data %>% 
  filter(MatrixName == "samplewater",
         StationCode == "309DAV",
         Analyte == "Temperature") %>% 
  identity()

data <- 
  data %>% 
  mutate(date = mdy_hms(SampleDate),
         date = as_date(date),
         time = mdy_hms(CollectionTime),
         time = as_hms(time),
         across(c(Result, MDL, RL), as.double)) %>% 
  group_by(date) %>% 
  summarize(time = sum(time * Result) / sum(Result),
            across(where(is.numeric), mean),
            across(everything(), first)) %>% 
  ungroup() %>% 
  mutate(time = as_hms(time)) %>% 
  mutate(sin_day = sin(2 * pi * hour(time) / 24),
         cos_day = cos(2 * pi * hour(time) / 24)) %>% 
  mutate(sin_year = sin(2 * pi * yday(date) / 365),
         cos_year = cos(2 * pi * yday(date) / 365)) %>% 
  inner_join(flow, by = intersect(names(.), names(flow))) %>% 
  identity()

flow %>% 
  select(date) %>% 
  identity()

data %>% 
  select(date) %>% 
  identity()

# Fit the GLS model
model <- gls(Result ~ sin_year + cos_year + sin_day + cos_day + log(flow) + date,
             data = data,
             correlation = corCAR1(form = ~ date))

# Summary of the model
summary(model)

plot(model)
plot(log(flow$flow))

par(mfrow = c(2, 2))

ggplot(data, aes(x = date, y = Result, color = time)) +
geom_point() +
# scale_color_gradientn(colors = hsv(c(.167, .667), s = 1, v = 1), guide = "colourbar") +
scale_color_gradientn(colors = rainbow(4), guide = "colourbar") +
# geom_smooth(aes(y=Result), method="lm", se = FALSE, color="gray") +  # Adding a linear trend line
labs(title="Temperature", x="Date", y="Temperature") +
theme_minimal()


