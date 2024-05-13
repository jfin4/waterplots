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
	Code string  `json:"code"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

func main() {
    http.Handle("/", http.FileServer(http.Dir("frontend")))
    http.HandleFunc("/stations", stationsHandler)

    // // local:
    // log.Fatal(http.ListenAndServe("localhost:8080", nil))
    // production:
    log.Fatal(http.ListenAndServeTLS(":443",
    "/etc/letsencrypt/live/waterplots.com/fullchain.pem",
    "/etc/letsencrypt/live/waterplots.com/privkey.pem",
    nil))
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
	db, err := sql.Open("sqlite3", "data/water_quality.db")
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := "SELECT code, latitude, longitude FROM stations"

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stations []Station
	for rows.Next() {
		var s Station
		err = rows.Scan(&s.Code, &s.Latitude, &s.Longitude)
		if err != nil {
			return nil, err
		}
		stations = append(stations, s)
	}
	return stations, nil
}
