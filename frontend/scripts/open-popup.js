let currentStation = null; // To store the current station

// Function to initialize station markers with click event handlers
function initializeStationMarkers() {
    window.stationMarkers.forEach(({ station, marker }) => {
        marker.on('click', () => handleMarkerClick(station));
    });
}

// Handle Marker Click Event
function handleMarkerClick(station) {
    openPopup(station);
}

// Open Popup
function openPopup(station) {
    currentStation = station; // Store the current station in a variable for reference
    const title = document.getElementById('title');
    title.textContent = station.code;
    const popup = document.getElementById('popup');
    popup.style.display = 'block';
}

function setupCloseButton() {
    const closeButton = document.querySelector('.close-button');
    const popup = document.getElementById('popup');

    closeButton.addEventListener('click', closePopup);
}

// Close Popup Handler
function closePopup() {
    const popup = document.getElementById('popup');
    popup.style.display = 'none';
}

// Hide popup on map click
window.map.on('click', () => {
    document.getElementById('popup').style.display = 'none';
});

// Listen for the custom event and then initialize station markers
document.addEventListener('stationMarkersReady', () => {
    initializeStationMarkers();
    setupCloseButton(); // Also setup the close button
});

