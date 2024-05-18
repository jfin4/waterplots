const pollutantInput = document.getElementById('pollutant-input');
const pollutantDropdown = document.getElementById('pollutant-dropdown');
const pollutantMenu = document.getElementById('pollutant-menu');
let currentStation = null; // To store the current station

initializePollutantDropdown();
initializeStationMarkers();
initializeResizeListener();

document.querySelector('.close-button').addEventListener('click', function () {
    popup.style.display = 'none';
});

function initializePollutantDropdown() {
    pollutantDropdown.addEventListener('click', togglePollutantMenu);
}

function togglePollutantMenu() {
    if (pollutantMenu.classList.contains('hidden')) {
        pollutantMenu.classList.remove('hidden');
        loadPollutants();
    } else {
        pollutantMenu.classList.add('hidden');
    }
}

function loadPollutants() {
    const pollutants = ['Pollutant A', 'Pollutant B', 'Pollutant C']; // Replace with actual pollutants
    pollutantMenu.innerHTML = ''; // Clear any existing list
    pollutants.forEach(createPollutantItem);
}

function createPollutantItem(pollutant) {
    const pollutantItem = document.createElement('div');
    pollutantItem.textContent = pollutant;
    pollutantItem.classList.add('pollutant-item');
    pollutantItem.addEventListener('click', () => handlePollutantItemClick(pollutant));
    pollutantMenu.appendChild(pollutantItem);
}

function handlePollutantItemClick(pollutant) {
    pollutantInput.value = pollutant;
    pollutantMenu.classList.add('hidden');
    fetchStationData(currentStation, pollutant);
}

function initializeStationMarkers() {
    window.addEventListener('load', () => {
        const stationMarkers = window.stationMarkers || [];
        stationMarkers.forEach(({ station, marker }) => {
            marker.on('click', () => handleMarkerClick(station));
        });
    });
}

function handleMarkerClick(station) {
    openPopup(station);
    fetchStationData(station);
}

window.openPopup = function (station) {
    currentStation = station; // Store the current station in a variable for reference
    const title = document.getElementById('title');
    title.textContent = station.code;
    const popup = document.getElementById('popup');
    popup.style.display = 'flex';
};

function fetchStationData(station, pollutant = null) {
    const url = pollutant ?
        `/station-data?code=${encodeURIComponent(station.code)}&pollutant=${encodeURIComponent(pollutant)}` :
        `/station-data?code=${encodeURIComponent(station.code)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log("Received data for station:", station.code, data);
            updatePlot(data);
        })
        .catch(error => console.error('Error fetching station details:', error));
}

function updatePlot(data) {
    const dates = data.map(d => new Date(d.date).toISOString());
    const results = data.map(d => d.result);
    console.log("Plotting data:", dates, results);
    const trace1 = {
        x: dates,
        y: results,
        marker: {
            color: 'steelblue',
            size: 8,
            symbol: 'circle-open'
        },
        mode: 'markers',
        type: 'scatter'
    };
    const layout = {
        plot_bgcolor: '#eeeeee',
        xaxis: {
            title: 'Date',
            gridcolor: 'white'
        },
        yaxis: {
            range: [0, 10],
            title: 'Result',
            gridcolor: 'white',
            zerolinecolor: 'white',
            zerolinewidth: 4,
            rangemode: 'tozero'
        },
        margin: { l: 50, r: 0, b: 50, t: 0 },
    };
    const config = { 
        responsive: true, 
        displayModeBar: false, 
        scrollZoom: true 
    });
Plotly.newPlot('plot', [trace1], layout, config);
}

function initializeResizeListener() {
    window.addEventListener('resize', () => {
        Plotly.Plots.resize('plot');
    });
}

