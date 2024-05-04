package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

type Station struct {
	// strings after types are "tags"
	// utility of tags described in json.Marshal docs
	// in short, they provide for customization of json encoding
	// in this case, json object member names
	StationCode string  `json:"station_code"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}


func main() {
	http.HandleFunc("/stations", stationsHandler)
	http.Handle("/", http.FileServer(http.Dir("./")))
	log.Println("Server starting on http://localhost:8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func stationsHandler(w http.ResponseWriter, r *http.Request) {
	stations, err := fetchStations()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse, err := json.Marshal(stations)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "applications/json")
	w.Write(jsonResponse)
}

func fetchStations() ([]Station, error) {
	db, err := sql.Open("sqlite3", "./wq_data.db")
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := "SELECT station_code, latitude, longitude " +
		"FROM stations " +
		"WHERE latitude IS NOT NULL " +
		"AND longitude IS NOT NULL"

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stations []Station
	for rows.Next() {
		var s Station
		err = rows.Scan(&s.StationCode, &s.Latitude, &s.Longitude)
		if err != nil {
			return nil, err
		}
		stations = append(stations, s)
	}
	return stations, nil
}
