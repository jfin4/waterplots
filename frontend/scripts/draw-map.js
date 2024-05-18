// Initialize global map variable
window.map = L.map('mapid').setView([37.17, -119.45], 7);

// Array to hold station markers
window.stationMarkers = []; // Use window to make it globally accessible

// Function to create and add tile layers to the map
function addTileLayer() {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 20
    }).addTo(window.map);
}

// Function to create a marker cluster group with custom style
function createMarkerClusterGroup() {
    return L.markerClusterGroup({
        polygonOptions: {
            fillColor: 'steelblue',
            color: 'steelblue',
            opacity: 0.5,
            fillOpacity: 0.2
        },
        iconCreateFunction: function(cluster) {
            return L.divIcon({
                className: 'cluster-marker',
                html: cluster.getChildCount()
            });
        }
    });
}

// Function to create a custom icon for a station
function createCustomIcon(station) {
    return L.divIcon({
        className: 'station-marker',
        html: `
            <div class="station-label">
                ${station.code}
            </div>
            <div class="station-pointer"></div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
}

// Function to fetch station data and create markers
function fetchStationData() {
    fetch('/stations')
        .then(response => response.json())
        .then(data => {
            data.forEach(station => {
                const customIcon = createCustomIcon(station);
                const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });
                markers.addLayer(marker);
                window.stationMarkers.push({ station, marker }); // Save markers to global variable
            });
            window.map.addLayer(markers);
            // Dispatch a custom event notifying markers are ready
            const event = new Event('stationMarkersReady');
            document.dispatchEvent(event);
        })
        .catch(console.error);
}

// Create and initialize marker cluster group
const markers = createMarkerClusterGroup();

// Add tile layer to the map
addTileLayer();

fetchStationData();
