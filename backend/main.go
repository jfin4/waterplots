package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"

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
    http.Handle("/", http.FileServer(http.Dir("frontend")))
    http.HandleFunc("/stations", stationsHandler)
    http.HandleFunc("/station-data", stationDataHandler)
    http.HandleFunc("/unique-pollutants", uniquePollutantsHandler)
    http.HandleFunc("/unique-matrices", uniqueMatricesHandler)
    log.Fatal(http.ListenAndServe("localhost:8080", nil))
    // log.Fatal(http.ListenAndServeTLS(":443",
    // "/etc/letsencrypt/live/waterplots.com/fullchain.pem",
    // "/etc/letsencrypt/live/waterplots.com/privkey.pem",
    // nil))

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
    db, err := sql.Open("sqlite3", "data/water_quality.db")
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
            return nil, err
        }
        stations = append(stations, s)
    }
    return stations, nil
}

func fetchPollutantWithMostRows(code string) (string, error) {
    db, err := sql.Open("sqlite3", "data/water_quality.db")
    if err != nil {
        return "", err
    }
    defer db.Close()

    query := `SELECT pollutant FROM results WHERE code = ? GROUP BY pollutant ORDER BY COUNT(*) DESC LIMIT 1`
    row := db.QueryRow(query, code)

    var pollutant string
    err = row.Scan(&pollutant)
    if err != nil {
        return "", err
    }
    return pollutant, nil
}

func fetchStationData(code, pollutant, matrix string) ([]StationData, error) {
    db, err := sql.Open("sqlite3", "data/water_quality.db")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `SELECT * FROM results WHERE code = ? AND pollutant = ? AND matrix = ?`
    rows, err := db.Query(query, code, pollutant, matrix)
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

    pollutant := r.URL.Query().Get("pollutant")
    matrix := r.URL.Query().Get("matrix")

    if pollutant == "" {
        var err error
        pollutant, err = fetchPollutantWithMostRows(code)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
    }

    if matrix == "" {
        matrix = "samplewater"
    }

    stationData, err := fetchStationData(code, pollutant, matrix)
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

// uniquePollutantsHandler function to handle requests for unique pollutants
func uniquePollutantsHandler(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    if code == "" {
        http.Error(w, "Missing station code", http.StatusBadRequest)
        return
    }
    matrix := r.URL.Query().Get("matrix")
    if matrix == "" {
        http.Error(w, "Missing matrix", http.StatusBadRequest)
        return
    }
    pollutants, err := fetchUniquePollutants(code, matrix)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    jsonResponse, err := json.Marshal(pollutants)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.Write(jsonResponse)
}

// fetchUniquePollutants function to get unique pollutants for a given station code
func fetchUniquePollutants(code, matrix string) ([]string, error) {
    db, err := sql.Open("sqlite3", "data/water_quality.db")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `SELECT DISTINCT pollutant FROM results WHERE code = ? AND matrix = ?`
    rows, err := db.Query(query, code, matrix)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var pollutants []string
    for rows.Next() {
        var pollutant string
        err = rows.Scan(&pollutant)
        if err != nil {
            return nil, err
        }
        pollutants = append(pollutants, pollutant)
    }
    return pollutants, nil
}

// uniqueMatricesHandler function to handle requests for unique matrices
func uniqueMatricesHandler(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    if code == "" {
        http.Error(w, "Missing station code", http.StatusBadRequest)
        return
    }
    matrices, err := fetchUniqueMatrices(code)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    jsonResponse, err := json.Marshal(matrices)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.Write(jsonResponse)
}


// fetchUniqueMatrices function to get unique matrix values for a given station code
func fetchUniqueMatrices(code string) ([]string, error) {
    db, err := sql.Open("sqlite3", "data/water_quality.db")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `SELECT DISTINCT matrix FROM results WHERE code = ? ORDER BY matrix ASC`
    rows, err := db.Query(query, code)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var matrices []string
    for rows.Next() {
        var matrix string
        err = rows.Scan(&matrix)
        if err != nil {
            return nil, err
        }
        matrices = append(matrices, matrix)
    }
    return matrices, nil
}
