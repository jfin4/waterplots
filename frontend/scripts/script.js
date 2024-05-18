// Initialize the map and add the tile layer
const initializeMap = () => {
    const map = L.map('mapid').setView([37.17, -119.45], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '\u00a9 OpenStreetMap \u00a9 CARTO',
        maxZoom: 20
    }).addTo(map);
    return map;
};

// Create a marker cluster group with custom styles
const createMarkerClusterGroup = () => L.markerClusterGroup({
    polygonOptions: {
        fillColor: 'steelblue',
        color: 'steelblue',
        opacity: 0.5,
        fillOpacity: 0.2
    },
    iconCreateFunction: (cluster) => L.divIcon({
        className: 'cluster-marker',
        html: cluster.getChildCount()
    })
});

// Create a custom icon for a station
const createCustomIcon = (station) => L.divIcon({
    className: 'station-marker',
    html: `
        <div class="station-label">${station.code}</div>
        <div class="station-pointer"></div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
});

// Fetch station data and return it as JSON
const fetchStationData = async () => {
    const response = await fetch('/stations');
    return response.json();
};

// Fetch station-specific data and return it as JSON
const fetchStationSpecificData = async (stationCode, pollutant = '', matrix = 'samplewater') => {
    const response = await fetch(`/station-data?code=${stationCode}&pollutant=${encodeURIComponent(pollutant)}&matrix=${encodeURIComponent(matrix)}`);
    return response.json();
};

// Fetch unique pollutants for a specific station
const fetchUniquePollutants = async (stationCode) => {
    const response = await fetch(`/unique-pollutants?code=${stationCode}`);
    return response.json();
};

// Populate pollutant input field
const populatePollutantInput = (pollutant) => {
    document.getElementById('pollutant-input').value = pollutant;
};

// Fetch unique matrices for a specific station
const fetchUniqueMatrices = async (stationCode) => {
    const response = await fetch(`/unique-matrices?code=${stationCode}`);
    return response.json();
};

// Populate matrix input field
const populateMatrixInput = (matrix) => {
    document.getElementById('matrix-input').value = matrix;
};

// Populate matrices menu
const populateMatrixMenu = (matrices) => {
    const menu = document.getElementById('matrix-menu');
    menu.innerHTML = ''; // Clear any existing items

    matrices.forEach(matrix => {
        const item = document.createElement('div');
        item.className = 'matrix-item';
        item.textContent = matrix;
        item.addEventListener('click', () => handleMatrixClick(matrix)); // Attach click event listener
        menu.appendChild(item);
    });
};

// Handle matrix input click
const handleMatrixInputClick = async () => {
    const stationCode = localStorage.getItem('selected_station_code');
    if (!stationCode) return;

    const matrices = await fetchUniqueMatrices(stationCode);
    populateMatrixMenu(matrices);

    const menu = document.getElementById('matrix-menu');
    menu.style.display = 'block';
};

// Handle matrix item click
const handleMatrixClick = async (matrix) => {
    const stationCode = localStorage.getItem('selected_station_code');

    populateMatrixInput(matrix);
    const pollutant = document.getElementById('pollutant-input').value;
    await fetchAndPlotStationData(stationCode, pollutant, matrix);

    const menu = document.getElementById('matrix-menu');
    menu.style.display = 'none';
};

// Create markers and add them to the markers layer
const createMarkers = (data, markers) => {
    data.forEach(station => {
        const marker = L.marker([station.latitude, station.longitude], {
            icon: createCustomIcon(station)
        });
        marker.stationCode = station.code; // Store station code in marker
        marker.on('click', () => openPopup(marker)); // Attach click event listener
        markers.addLayer(marker);
    });
};

// Clear and setup the popup content
const setupPopupContent = (stationCode) => {
    const popupContent = document.getElementById('popup');
    popupContent.style.display = 'flex';

    const title = document.getElementById('title');
    title.textContent = `${stationCode}`;

    const chartContainer = document.getElementById('plot');
    chartContainer.innerHTML = ''; // Clear the existing chart if any
};

// Plot data using Plotly
const plotData = (dates, results, yAxisTitle) => {
    const trace = [{
        x: dates,
        y: results,
        marker: {
            color: 'steelblue',
            size: 8,
            symbol: 'circle-open',
            line: {
                width: 2
            }
        },
        mode: 'markers',
        type: 'scatter',
        name: 'Measured Sample'
    }];

    const layout = {
        plot_bgcolor: '#f0f0f0',
        dragmode: 'pan',
        showlegend: false,
        xaxis: {
            title: 'Date and Time',
            gridcolor: 'white',
            zerolinecolor: 'white',
            zerolinewidth: 5
        },
        yaxis: {
            title: yAxisTitle,
            gridcolor: 'white',
            zerolinecolor: 'white',
            zerolinewidth: 5,
            rangemode: 'tozero'
        },
        margin: {
            l: 50,
            r: 250,
            b: 50,
            t: 0
        },
        legend: {
            x: 1,
            y: 0
        },
        annotations: [{
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5,
            text: results.length === 0 ? 'No Data Available' : '',
            showarrow: false
        }]
    };

    Plotly.newPlot('plot', trace, layout, {
        responsive: true,
        displayModeBar: false,
        scrollZoom: true
    });
};

// Open popup and load Plotly chart in a div
const openPopup = async (marker) => {
    setupPopupContent(marker.stationCode);

    const stationCode = marker.stationCode;
    localStorage.setItem('selected_station_code', stationCode);

    // Populate matrix input field with the initial value "samplewater"
    const matrix = 'samplewater';
    populateMatrixInput(matrix);

    const data = await fetchStationSpecificData(stationCode, '', matrix);
    if (!data || data.length === 0) {
        // Handle case where there is no data
        plotData([], [], "No Data Available");
        return;
    }

    const mostNumerousPollutant = data[0].pollutant;
    populatePollutantInput(mostNumerousPollutant);

    const dates = data.map(item => new Date(`${item.date}T${item.time}`));
    const results = data.map(item => item.result);
    const yAxisTitle = `${data[0].unit}`;

    plotData(dates, results, yAxisTitle);

    const uniquePollutants = await fetchUniquePollutants(stationCode);
    populatePollutantMenu(uniquePollutants);
};

// Fetch and plot station data
const fetchAndPlotStationData = async (stationCode, pollutant, matrix) => {
    const data = await fetchStationSpecificData(stationCode, pollutant, matrix);
    if (!data || data.length === 0) {
        plotData([], [], "No Data Available");
        return;
    }

    const dates = data.map(item => new Date(`${item.date}T${item.time}`));
    const results = data.map(item => item.result);
    const yAxisTitle = `${data[0].unit}`;

    plotData(dates, results, yAxisTitle);
};

// Close popup (div)
const closePopup = () => {
    const popup = document.getElementById('popup');
    popup.style.display = 'none';
};

// Setup the close button
const setupCloseButton = () => {
    const closeButton = document.querySelector('.close-button');
    closeButton.addEventListener('click', closePopup);
};

// Populate pollutants menu
const populatePollutantMenu = (pollutants) => {
    const menu = document.getElementById('pollutant-menu');
    menu.innerHTML = ''; // Clear any existing items

    pollutants.forEach(pollutant => {
        const item = document.createElement('div');
        item.className = 'pollutant-item';
        item.textContent = pollutant;
        item.addEventListener('click', () => handlePollutantClick(pollutant)); // Attach click event listener
        menu.appendChild(item);
    });
};

// Handle pollutant input click
const handlePollutantInputClick = async () => {
    const stationCode = localStorage.getItem('selected_station_code');
    if (!stationCode) return;

    const pollutants = await fetchUniquePollutants(stationCode);
    populatePollutantMenu(pollutants);

    const menu = document.getElementById('pollutant-menu');
    menu.style.display = 'block';
};

// Handle pollutant item click
const handlePollutantClick = async (pollutant) => {
    const stationCode = localStorage.getItem('selected_station_code');

    populatePollutantInput(pollutant);
    const matrix = document.getElementById('matrix-input').value;
    await fetchAndPlotStationData(stationCode, pollutant, matrix);

    const menu = document.getElementById('pollutant-menu');
    menu.style.display = 'none';
};

// Close the pollutant menu when clicking outside of it
document.addEventListener('click', (event) => {
    const menu = document.getElementById('pollutant-menu');
    const input = document.getElementById('pollutant-input');
    if (menu && !menu.contains(event.target) && input && !input.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// Close the matrix menu when clicking outside of it
document.addEventListener('click', (event) => {
    const menu = document.getElementById('matrix-menu');
    const input = document.getElementById('matrix-input');
    if (menu && !menu.contains(event.target) && input && !input.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// Main initialization function
const init = async () => {
    const map = initializeMap();
    const markers = createMarkerClusterGroup();
    map.on('click', closePopup);

    const data = await fetchStationData();
    createMarkers(data, markers);

    map.addLayer(markers);
    setupCloseButton(); // Call setupCloseButton to ensure the close button works

    // Add event listener to pollutant-input element
    const pollutantInput = document.getElementById('pollutant-input');
    pollutantInput.addEventListener('click', handlePollutantInputClick);

    // Add event listener to matrix-input element
    const matrixInput = document.getElementById('matrix-input');
    matrixInput.addEventListener('click', handleMatrixInputClick);
};

// Run the initialization
init();

