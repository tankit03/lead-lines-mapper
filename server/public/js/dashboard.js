// Dashboard Map Functionality
class MapDashboard {
    constructor(config) {
        this.userId = config.userId;
        this.username = config.username;
        this.googleMapsApiKey = config.googleMapsApiKey;
        this.map = null;
        this.ws = null; 

        this.currentMode = 'none';
        this.userMarkers = [];
        this.pathMarkers = [];
        this.userPolylines = [];
        this.currentPolyline = null;
    }

    async initMap() {
        console.log('MapDashboard.initMap() called');
        console.log('Starting map initialization...');
        
        // Map Initialization
        const { Map } = await google.maps.importLibrary("maps");
        const { Place } = await google.maps.importLibrary("places");
        let position = { lat: 45.5231, lng: -122.6765 };
        let zoom = 10;
        if (navigator.geolocation) {
            try {
                const userPosition = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                position = { lat: userPosition.coords.latitude, lng: userPosition.coords.longitude };
                zoom = 15;
            } catch (error) { console.warn('Could not get user location:', error.message); }
        }
        
        console.log('Creating map at position:', position);
        this.map = new Map(document.getElementById("map"), {
            center: position, zoom: zoom, mapId: "YOUR_MAP_ID",
            fullscreenControl: false, mapTypeControl: false, scaleControl: true,
            streetViewControl: true, rotateControl: true, clickableIcons: false
        });
        
        console.log('Map created successfully');

        // --- Initialize all functionalities ---
        console.log('Initializing search...');
        await this.initializeSearch();
        console.log('Initializing controls...');
        this.initializeControls();
        console.log('Initializing map listener...');
        this.initializeMapListener();
        console.log('Initializing WebSocket...');
        this.initializeWebSocket(); // NEW: Connect to WebSocket
        console.log('Loading initial data...');
        this.loadInitialData(); // NEW: Load existing data from DB
        
        console.log('All initialization complete!');
    }
    
    // Load existing waypoints and paths from the server
    async loadInitialData() {
        // Fetch and draw existing waypoints
        try {
            const responseWaypoints = await fetch('/waypoints');
            if (!responseWaypoints.ok) throw new Error('Failed to fetch waypoints');
            const waypoints = await responseWaypoints.json();
            waypoints.forEach(waypoint => this.drawMarker(waypoint));
        } catch (error) {
            console.error(error);
        }

        // Fetch and draw existing paths
        try {
            const responsePaths = await fetch('/paths');
            if (!responsePaths.ok) throw new Error('Failed to fetch paths');
            const paths = await responsePaths.json();
            paths.forEach(pathData => this.drawPath(pathData));
        } catch (error) {
            console.error(error);
        }
    }
    
    // Initialize WebSocket connection and message handling
    initializeWebSocket() {
        // Use wss:// in production with a secure server
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${wsProtocol}//${window.location.host}`);

        this.ws.onopen = () => console.log('WebSocket connection established.');
        this.ws.onerror = (error) => console.error('WebSocket Error:', error);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // Avoid re-drawing what we just sent
            if (data.payload.username === this.username) {
                // We already drew it optimistically. A more robust solution might
                // involve assigning a temporary ID and updating it upon server response.
                // For now, this prevents duplication.
                // return;
            }

            if (data.type === 'new_waypoint') {
                this.drawMarker(data.payload);
            } else if (data.type === 'new_path') {
                this.drawPath(data.payload);
            }
        };
    }

    // Controls and Listeners 
    initializeControls() {
        console.log('Initializing controls...');
        const addMarkerBtn = document.getElementById('add-marker-btn');
        const drawPathBtn = document.getElementById('draw-path-btn');
        const clearBtn = document.getElementById('clear-map-btn');

        if (!addMarkerBtn || !drawPathBtn || !clearBtn) {
            console.error('One or more control buttons not found!');
            console.log('addMarkerBtn:', addMarkerBtn);
            console.log('drawPathBtn:', drawPathBtn);
            console.log('clearBtn:', clearBtn);
            return;
        }

        addMarkerBtn.addEventListener('click', () => {
            console.log('Add marker button clicked');
            drawPathBtn.textContent = 'Draw Path';
            this.setMode('addingMarker');
        });
        
        // Clear button - now clears both map and database
        clearBtn.addEventListener('click', async () => {
            console.log('Clear button clicked');
            await this.clearOverlays();
        });

        drawPathBtn.addEventListener('click', () => {
            console.log('Draw path button clicked, current mode:', this.currentMode);
            if (this.currentMode === 'drawingPath') {
                console.log('Stopping path drawing...');
                drawPathBtn.textContent = 'Draw Path';
                
                // If the path has points, save it
                if (this.currentPolyline && this.currentPolyline.getPath().getLength() > 1) {
                    console.log('Path has', this.currentPolyline.getPath().getLength(), 'points, saving...');
                    this.saveCurrentPath();
                } else {
                    console.log('Path has insufficient points (', 
                        this.currentPolyline ? this.currentPolyline.getPath().getLength() : 'no polyline', 
                        '), not saving');
                }
                this.setMode('none');
            } else {
                console.log('Starting path drawing...');
                drawPathBtn.textContent = 'Stop Drawing Path';
                this.setMode('drawingPath');
            }
        });
        
        console.log('Controls initialized successfully');
    }

    initializeMapListener() {
        console.log('Initializing map listener...');
        this.map.addListener('click', (event) => {
            console.log('Map clicked, current mode:', this.currentMode);
            if (this.currentMode === 'addingMarker') {
                console.log('Adding marker at:', event.latLng.lat(), event.latLng.lng());
                this.addMarkerAtLocation(event.latLng);
                this.setMode('none');
            } else if (this.currentMode === 'drawingPath') {
                console.log('Adding path point at:', event.latLng.lat(), event.latLng.lng());
                this.addPathPoint(event.latLng);
            }
        });
        console.log('Map listener initialized');
    }

    setMode(mode) {
        console.log('Setting mode to:', mode);
        this.currentMode = mode;
        
        // Update cursor style based on mode
        const mapDiv = document.getElementById('map');
        if (mode === 'addingMarker') {
            mapDiv.style.cursor = 'crosshair';
        } else if (mode === 'drawingPath') {
            mapDiv.style.cursor = 'crosshair';
        } else {
            mapDiv.style.cursor = 'default';
        }
        console.log('Mode set to:', this.currentMode);
    }

    async initializeSearch() {
        // Import the places library
        const { SearchBox } = await google.maps.importLibrary("places");
        
        const searchBox = new SearchBox(document.getElementById('pac-input'));
        
        // Bias the SearchBox results towards current map's viewport
        this.map.addListener('bounds_changed', () => {
            searchBox.setBounds(this.map.getBounds());
        });

        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();
            if (places.length === 0) return;

            // For each place, get the icon, name and location
            const bounds = new google.maps.LatLngBounds();
            places.forEach((place) => {
                if (!place.geometry || !place.geometry.location) {
                    console.log("Returned place contains no geometry");
                    return;
                }

                if (place.geometry.viewport) {
                    // Only geocodes have viewport
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            this.map.fitBounds(bounds);
        });
    }

    // Drawing and Saving Logic

    // This function is now just for interactive adding
    addMarkerAtLocation(location) {
        // Optimistically draw the marker on the map
        this.drawMarker({ lat: location.lat(), lng: location.lng() });
        // Save the marker to the database
        this.saveWaypoint({ lat: location.lat(), lng: location.lng() });
    }

    // Generic function to draw a marker (used by load, websocket, and interactive add)
    drawMarker(waypoint) {
        const marker = new google.maps.Marker({
            position: { lat: waypoint.lat, lng: waypoint.lng },
            map: this.map,
            animation: google.maps.Animation.DROP,
        });
        this.userMarkers.push(marker);
    }
    
    // POSTs waypoint to the server
    async saveWaypoint(location) {
        console.log('Saving waypoint:', location);
        try {
            const response = await fetch('/waypoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(location),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Waypoint saved successfully:', result);
        } catch (error) {
            console.error('Failed to save waypoint:', error);
            // Here you could add logic to remove the optimistic marker
        }
    }
    
    // This function is now just for interactive drawing
    addPathPoint(location) {
        console.log('Adding path point at:', location.lat(), location.lng());
        
        if (!this.currentPolyline) {
            console.log('Creating new polyline...');
            // Create a new polyline but don't save it yet
            this.currentPolyline = new google.maps.Polyline({
                path: [], geodesic: true, strokeColor: '#FF0000',
                strokeOpacity: 1.0, strokeWeight: 3, map: this.map,
            });
            this.userPolylines.push(this.currentPolyline);
        }
        
        // Create vertex marker for each point
        const vertexMarker = new google.maps.Marker({
            position: location, map: this.map,
            icon: { 
                path: google.maps.SymbolPath.CIRCLE, 
                scale: 5, 
                fillColor: '#FF0000', 
                fillOpacity: 1, 
                strokeWeight: 1 
            }
        });
        this.pathMarkers.push(vertexMarker);
        
        // Add the point to the polyline
        this.currentPolyline.getPath().push(location);
        
        console.log('Current path length:', this.currentPolyline.getPath().getLength());
    }

    // NEW: Generic function to draw a path object from the server
    drawPath(pathData) {
        const polyline = new google.maps.Polyline({
            path: pathData.path, // The server now provides the path array directly
            geodesic: true, strokeColor: '#0000FF', // Use a different color for saved paths
            strokeOpacity: 0.8, strokeWeight: 3, map: this.map,
        });
        this.userPolylines.push(polyline);
    }

    // NEW: Gathers coordinates from the currently drawn path and POSTs them
    async saveCurrentPath() {
        console.log('saveCurrentPath() called');
        
        if (!this.currentPolyline) {
            console.error('No current polyline to save!');
            return;
        }
        
        const pathCoords = this.currentPolyline.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        console.log('Path coordinates to save:', pathCoords);
        console.log('Number of coordinates:', pathCoords.length);
        
        if (pathCoords.length < 2) {
            console.error('Path must have at least 2 points, got:', pathCoords.length);
            return;
        }
        
        try {
            console.log('Sending POST request to /paths...');
            const response = await fetch('/paths', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pathCoords }),
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Path saved successfully:', result);
            
            // Clear the current polyline after saving
            this.currentPolyline = null;
            
        } catch (error) {
            console.error('Failed to save path:', error);
            console.error('Error details:', error.message);
        }
    }
    
    // --- Clearing Logic ---
    async clearOverlays() {
        console.log('Clear button clicked - clearing all data...');
        
        try {
            // Call the API to delete all waypoints and paths from the database
            const response = await fetch('/clear-all', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Database cleared successfully:', result);
            
            // Clear all markers from the map
            this.userMarkers.forEach(marker => marker.setMap(null));
            this.userMarkers = [];
            
            // Clear path markers from the map
            this.pathMarkers.forEach(marker => marker.setMap(null));
            this.pathMarkers = [];
            
            // Clear all polylines from the map
            this.userPolylines.forEach(polyline => polyline.setMap(null));
            this.userPolylines = [];
            
            // Clear current polyline from the map
            if (this.currentPolyline) {
                this.currentPolyline.setMap(null);
                this.currentPolyline = null;
            }
            
            // Reset mode
            this.setMode('none');
            
            // Reset draw path button text
            const drawPathBtn = document.getElementById('draw-path-btn');
            if (drawPathBtn) {
                drawPathBtn.textContent = 'Draw Path';
            }
            
            console.log(`Successfully cleared ${result.deletedWaypoints} waypoints and ${result.deletedPaths} paths`);
            
        } catch (error) {
            console.error('Failed to clear data:', error);
            // Still clear the map display even if the database operation failed
        }
    }
}

// Global initMap function
function initMap() {
    console.log('Global initMap called');
    console.log('dashboardConfig:', window.dashboardConfig);
    
    if (window.dashboardConfig) {
        window.mapDashboard = new MapDashboard(window.dashboardConfig);
        window.mapDashboard.initMap();
    } else {
        console.error('dashboardConfig not found!');
    }
}

// Backup initialization in case the callback doesn't work
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    console.log('Google maps available:', typeof google !== 'undefined');
    
    // Test if buttons exist
    const addMarkerBtn = document.getElementById('add-marker-btn');
    const drawPathBtn = document.getElementById('draw-path-btn');
    const clearBtn = document.getElementById('clear-map-btn');
    console.log('Buttons found on DOM load:');
    console.log('- Add Marker:', addMarkerBtn);
    console.log('- Draw Path:', drawPathBtn);
    console.log('- Clear:', clearBtn);
    
    // If Google Maps is already loaded but initMap wasn't called, call it manually
    if (typeof google !== 'undefined' && !window.mapDashboard) {
        console.log('Google Maps is loaded but initMap was not called, calling manually...');
        initMap();
    }
});

// Also try to initialize when the window loads
window.addEventListener('load', function() {
    console.log('Window loaded');
    if (typeof google !== 'undefined' && !window.mapDashboard) {
        console.log('Google Maps is loaded on window load, calling initMap...');
        initMap();
    }
});