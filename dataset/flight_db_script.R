library(tidyverse)
library(lubridate)

#Import dataset
flight_data <- read_csv("flights_db.csv")

# Filtering out data (empty and non commercial)
flight_data_clean <- flight_data %>%
  mutate(
    owner = str_to_lower(owner),
    owner = str_squish(owner),
    owner = case_when(
      str_detect(owner, "delta") ~ "delta airlines",
      str_detect(owner, "american") ~ "american airlines",
      str_detect(owner, "united") ~ "united airlines",
      str_detect(owner, "spirit") ~ "spirit airlines",
      str_detect(owner, "southwest") ~ "southwest airlines",
      TRUE ~ owner
    )
  ) %>%
  filter(
    owner %in% c(
      "delta airlines",
      "american airlines",
      "united airlines",
      "spirit airlines",
      "southwest airlines"
    ),
    distance != 0
  )

# Removing unnecessary column datas
flight_data_clean_rv <- flight_data_clean %>%
  select(-arr_airport_elevation, -arr_airport_lon, -arr_airport_lat, -dep_airport_lat, -dep_airport_lon,
         -dep_airport_elevation, -calsign, -reg, -dep_airport_icao, -arr_airport_icao)

# Reformatting timestamp (removing at 'time' after date)
flight_data_clean_final <- flight_data_clean_rv %>%
  mutate(
    timestamp_clean = str_remove_all(timestamp_read, "th|st|nd|rd"),
    timestamp_clean = str_replace(timestamp_clean, " at ", " "),
    datetime = lubridate::dmy_hm(timestamp_clean),
    
    date = as.Date(datetime),
    time = format(datetime, "%I:%M %p"),
    
    # Replace 2024 or 2025 years with 2026
    date = if_else(
      lubridate::year(date) %in% c(2024, 2025),
      as.Date(paste0("2026", format(date, "-%m-%d"))),
      date
    )
  ) %>%
  select(-timestamp_clean, -datetime)

# Deleting timestamp_read
flight_data_clean_final <- flight_data_clean_final %>%
  select(-timestamp_read)

# Randomly change 1000 entries to include months 1-5
set.seed(42)
random_rows <- sample(nrow(flight_data_clean_final), 700)
random_months <- sample(c(1:5, 7:8), 700, replace = TRUE)

original_days <- as.integer(format(flight_data_clean_final$date[random_rows], "%d"))

max_days <- days_in_month(as.Date(paste0("2026-", random_months, "-01")))
clamped_days <- pmin(original_days, max_days)

flight_data_clean_final$date[random_rows] <- as.Date(paste0(
  "2026-",
  random_months,
  "-",
  clamped_days
))

# Arr time calculation
flight_data_clean_final <- flight_data_clean_final %>%
  mutate(
    # Combine date + time into datetime
    datetime_dep = ymd_hm(paste(date, time)),
    
    # Add fractional hours
    datetime_arr = datetime_dep + dhours(rough_flight_time),
    
    # Extract arrival time
    time_arr = format(datetime_arr, "%I:%M %p")
  ) %>%
  select(-datetime_dep, -datetime_arr)

# Flight cost calculation
distance_comp <- function(distance) {
  ifelse(distance < 500, distance * 0.2,
         ifelse(distance < 1500, distance * 0.14,
                distance * 0.10))
}

duration_comp <- function(time) {
  minutes <- time * 60
  minutes * 0.5
}

international_multiplier <- function(dep, arr) {
  ifelse(dep != arr, 1.25, 1.0)
}

airline_multiplier <- function(owner) {
  case_when(
    owner == "delta airlines" ~ 1.00,
    owner == "united airlines" ~ 0.98,
    owner == "american airlines" ~ 0.99,
    owner == "spirit airlines" ~ 0.75,
    owner == "southwest airlines" ~ 0.70,
    TRUE ~ 1.0
  )
}

aircraft_multiplier <- function(type) {
  case_when(
    str_detect(type, "787|777") ~ 1.15,
    str_detect(type, "737|A320") ~ 1.00,
    TRUE ~ 0.97
  )
}

flight_data_clean_final <- flight_data_clean_final %>%
  mutate(
    base_fee = 40,
    
    cost_raw = base_fee +
      distance_comp(distance) +
      duration_comp(rough_flight_time),
    
    multiplier =
      international_multiplier(dep_airport_country, arr_airport_country) *
      airline_multiplier(owner) *
      aircraft_multiplier(type),
    
    noise = runif(n(), -15, 15),
    
    cost = round(cost_raw * multiplier + noise)
  )

# Final columns removals and formating
flight_data_clean_final <- flight_data_clean_final %>%
  mutate(
    owner = case_when(
      owner == "delta airlines" ~ "Delta Airlines",
      owner == "american airlines" ~ "American Airlines",
      owner == "united airlines" ~ "United Airlines",
      owner == "spirit airlines" ~ "Spirit Airlines",
      owner == "southwest airlines" ~ "Southwest Airlines",
      TRUE ~ str_to_title(owner)
    )
  ) %>%
  select(-rough_flight_time, -distance, -noise, -multiplier, -cost_raw, -base_fee)

# Output
write_csv(flight_data_clean_final, "flight_db_cleaned.csv")