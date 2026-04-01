library(tidyverse)

#Import dataset
flight_data <- read_csv("flights_db.csv")

# Airline List
airlines <- c(
  "Delta Airline", "American Airline", "United Airline", "Southwest Airlines", "Alaska Airlines", "Spirit Airline"
)

# Filtering out data (empty and non commercial)
flight_data_clean <- flight_data %>%
  filter(
    type != "-" & type != "Unknown / Various" & !is.na(type),
    type_icao != "-" & type_icao != "0000" & !is.na(type_icao),
    flight_number!= "Unknown" & flight_number != "-" & !is.na(flight_number),
    distance != "0" & !is.na(distance),
    str_detect(tolower(owner), paste(tolower(airlines), collapse = "|")),
    !str_detect(tolower(owner), "\\("),
    !str_detect(tolower(owner), "cargo")
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
    time = format(datetime, "%I:%M %p")
  ) %>%
  select(-timestamp_clean, -datetime)

# Deleting timestamp_read
flight_data_clean_final <- flight_data_clean_final %>%
  select(-timestamp_read)

# Output
write_csv(flight_data_clean_final, "flight_db_cleaned.csv")