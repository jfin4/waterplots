package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
	"fmt"

    _ "github.com/mattn/go-sqlite3"
)

type Station struct {
    Code      string  `json:"code"`
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
}

type StationData struct {
    ID        int     `json:"id"`
    Matrix    string  `json:"matrix"`
    Project   string  `json:"project"`
    Code      string  `json:"code"`
    Pollutant string  `json:"pollutant"`
    Date      string  `json:"date"`
    Time      string  `json:"time"`
    Result    float64 `json:"result"`
    Unit      string  `json:"unit"`
}

func main() {
	fmt.Println("Hello, world!")
    http.Handle("/", http.FileServer(http.Dir("frontend")))
    http.HandleFunc("/stations", stationsHandler)
    http.HandleFunc("/station-data", stationDataHandler)
    log.Fatal(http.ListenAndServe("localhost:8080", nil))
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
    w.Header().Set("Content-Type", "application/json")
    w.Write(jsonResponse)
}

func fetchStations() ([]Station, error) {
    db, err := sql.Open("sqlite3", "data/data.db")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `SELECT * FROM stations`
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
            return nil, err }
        stations = append(stations, s)
    }
    return stations, nil
}

func fetchStationData(code string) ([]StationData, error) {
    db, err := sql.Open("sqlite3", "data/data.db")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `SELECT * FROM results WHERE code = ?`
    rows, err := db.Query(query, code)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var stationData []StationData
    for rows.Next() {
        var s StationData
        err = rows.Scan(&s.ID, &s.Matrix, &s.Project, &s.Code, &s.Pollutant, &s.Date, &s.Time, &s.Result, &s.Unit)
        if err != nil {
            return nil, err
        }
        stationData = append(stationData, s)
    }
    if err = rows.Err(); err != nil {
        return nil, err
    }
    return stationData, nil
}

func stationDataHandler(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    if code == "" {
        http.Error(w, "Missing station code", http.StatusBadRequest)
        return
    }

    stationData, err := fetchStationData(code)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    jsonResponse, err := json.Marshal(stationData)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write(jsonResponse)
}

