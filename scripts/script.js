var map = L.map('mapid').setView([37.17, -119.45], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap, © CartoDB',
                maxZoom: 19
            }).addTo(map);

var markers = L.markerClusterGroup(); 

fetch('/stations')
    .then(response => response.json())
    .then(data => {
        data.forEach(station => {
            var marker = L.marker([station.latitude, station.longitude])
                .bindPopup(`<b>${station.code}</b>`);
            markers.addLayer(marker);
        });
        map.addLayer(markers);
    })
    .catch(e => console.error(e));
