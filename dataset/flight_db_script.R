library(tidyverse)
library(lubridate)

#Import dataset
flight_data <- read_csv("flights_db.csv")

# Airline List
airlines <- c(
  "Delta Airline", "American Airline", "United Airline", "Spirit Airline", "Frontier Airlines"
)

# Filtering out data (empty and non commercial)
flight_data_clean <- flight_data %>%
  filter(
    str_detect(tolower(owner), paste(tolower(airlines), collapse = "|")),
    !str_detect(tolower(owner), "\\("),
    !str_detect(tolower(owner), "cargo"),
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
flight_data_clean_final <- flight_data_clean_final %>%
  mutate(
    cost = case_when(
      distance <= 250  ~ distance * 0.009,
      distance <= 999  ~ distance * 0.007,
      distance <= 1999 ~ distance * 0.004,
      distance >= 2000 ~ distance * 0.05
    ) + 50 + 25,  # service + food costs
    cost = round(cost)
  )

# Final columns removals
flight_data_clean_final <- flight_data_clean_final %>%
  select(-rough_flight_time, -distance)

# Output
write_csv(flight_data_clean_final, "flight_db_cleaned.csv")