var map = L.map('mapid').setView([37.17, -119.45], 7);
var popup = document.getElementById('popup');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 20
}).addTo(map);

var markers = L.markerClusterGroup();

function openPopup(station) {
        var popupTitle = document.getElementById('popup-title');
        popupTitle.textContent = station.code;
        popup.style.display = 'block';
}

map.on('click', function () {
        document.getElementById('popup').style.display = 'none';
});

function createCustomIcon(station) {
        return L.divIcon({
                    className: 'custom-icon',
                    html: '<div class="icon-content">' + station.code + '</div><div class="pointer"></div>',
                    iconSize: [2, 30],
                    iconAnchor: [1, 30]
                });
}

fetch('/stations')
    .then(response => response.json())
    .then(data => {
                data.forEach(station => {
                                var customIcon = createCustomIcon(station);
                                var marker = L.marker([station.latitude, station.longitude], { icon: customIcon })
                                    .on('click', function() {
                                                            openPopup(station);
                                                        });
                                markers.addLayer(marker);
                            });
                map.addLayer(markers);
            })
    .catch(e => console.error(e));

