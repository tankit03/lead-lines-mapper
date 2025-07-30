// Dashboard Map Functionality
class MapDashboard {
    constructor(config) {
        this.userId = config.userId;
        this.username = config.username;
        this.googleMapsApiKey = config.googleMapsApiKey;
        this.map = null;

        this.currentMode = 'none';
        this.userMarkers = [];
        this.pathMarkers = [];
        this.userPolylines = [];
        this.currentPolyline = null;
        this.existingWaypointIds = new Set(); // Track existing waypoint IDs
        this.existingPathIds = new Set(); // Track existing path IDs
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
            } catch (error) 
            { 
                console.warn('Could not get user location:', error.message); 
            }
        }
        
        console.log('Creating map at position:', position);
        this.map = new Map(document.getElementById("map"), {
            center: position, zoom: zoom, mapId: "YOUR_MAP_ID",
            fullscreenControl: false, mapTypeControl: false, scaleControl: true,
            streetViewControl: true, rotateControl: true, clickableIcons: false,
            draggableCursor: 'default'
        });
        
        console.log('Map created successfully');
        // this.map.setOptions({ draggableCursor: 'default' });

        await this.initializeSearch();  
        this.initializeControls();
        this.initializeMapListener();
        this.loadInitialData();
        
        console.log("initialized initializeSearch"); 
        console.log("initialized initializeControls"); 
        console.log("initialized initializeMapListener"); 
        console.log("initialized loadInitialData");
        console.log('All initialization complete!');
    }
    
    // Load existing waypoints and paths from the server
    async loadInitialData() {
        // Fetch and draw existing waypoints
        try {
            const responseWaypoints = await fetch('/waypoints');
            if (!responseWaypoints.ok) throw new Error('Failed to fetch waypoints');
            const waypoints = await responseWaypoints.json();
            waypoints.forEach(waypoint => {
                if (!this.existingWaypointIds.has(waypoint.id)) {
                    this.drawMarker(waypoint, false); // No animation for initial load
                    this.existingWaypointIds.add(waypoint.id);
                }
            });
        } catch (error) {
            console.error(error);
        }

        // Fetch and draw existing paths
        try {
            const responsePaths = await fetch('/paths');
            if (!responsePaths.ok) throw new Error('Failed to fetch paths');
            const paths = await responsePaths.json();
            paths.forEach(pathData => {
                if (!this.existingPathIds.has(pathData.id)) {
                    this.drawPath(pathData);
                    this.existingPathIds.add(pathData.id);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    // Load new data and only animate new items
    async loadNewData() {
        // Fetch and draw new waypoints
        try {
            const responseWaypoints = await fetch('/waypoints');
            if (!responseWaypoints.ok) throw new Error('Failed to fetch waypoints');
            const waypoints = await responseWaypoints.json();
            waypoints.forEach(waypoint => {
                if (!this.existingWaypointIds.has(waypoint.id)) {
                    this.drawMarker(waypoint, true); // Animate new markers
                    this.existingWaypointIds.add(waypoint.id);
                }
            });
        } catch (error) {
            console.error(error);
        }

        // Fetch and draw new paths
        try {
            const responsePaths = await fetch('/paths');
            if (!responsePaths.ok) throw new Error('Failed to fetch paths');
            const paths = await responsePaths.json();
            paths.forEach(pathData => {
                if (!this.existingPathIds.has(pathData.id)) {
                    this.drawPath(pathData);
                    this.existingPathIds.add(pathData.id);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    // Clear only the map overlays without making API calls
    clearMapOverlays() {
        // Clear all markers from the map
        this.userMarkers.forEach(marker => marker.setMap(null));
        this.userMarkers = [];
        
        // Clear path markers from the map
        this.pathMarkers.forEach(marker => marker.setMap(null));
        this.pathMarkers = [];
        
        // Clear all polylines from the map (except current drawing)
        this.userPolylines.forEach(polyline => {
            if (polyline !== this.currentPolyline) {
                polyline.setMap(null);
            }
        });
        this.userPolylines = this.currentPolyline ? [this.currentPolyline] : [];
        
        // Clear tracking sets
        this.existingWaypointIds.clear();
        this.existingPathIds.clear();
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
            console.log('Add marker button clicked, current mode:', this.currentMode);
            
            if (this.currentMode === 'addingMarker') {
                // Stop adding markers
                console.log('Stopping marker adding mode');
                addMarkerBtn.textContent = 'Add Marker';
                addMarkerBtn.classList.remove('active'); 
                this.setMode('none');
            } else {

                // makes sure mode is set to 
                console.log('Starting marker adding mode');
                
                // Reset draw path button
                drawPathBtn.textContent = 'Draw Path';
                drawPathBtn.classList.remove('active');
                
                // If there's a current polyline being drawn, clean it up
                if (this.currentPolyline) {
                    this.currentPolyline.setMap(null);
                    this.currentPolyline = null;
                }

                addMarkerBtn.textContent = 'Stop Adding Markers';
                addMarkerBtn.classList.add('active'); 
                this.setMode('addingMarker');

            }
        });
                
        // Clear button - now clears both map and database
        clearBtn.addEventListener('click', async () => {
            console.log('Clear button clicked');

            addMarkerBtn.textContent = 'Add Marker';
            addMarkerBtn.classList.remove('active');
            drawPathBtn.textContent = 'Draw Path';
            drawPathBtn.classList.remove('active')

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
                drawPathBtn.classList.remove('active');
                this.setMode('none');
            } else {
                console.log('Starting path drawing...');
                
                // Reset add marker button
                addMarkerBtn.textContent = 'Add Marker';
                addMarkerBtn.classList.remove('active');

                // Activate draw path button
                drawPathBtn.textContent = 'Stop Drawing Path';
                drawPathBtn.classList.add('active');
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
                // this.setMode('none');
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
        
        // Update cursor style using Google Maps options
        if (mode === 'addingMarker') {
            this.map.setOptions({ draggableCursor: 'crosshair' });
            console.log('Cursor set to crosshair for adding marker');
        } else if (mode === 'drawingPath') {
            this.map.setOptions({ draggableCursor: 'crosshair' });
            console.log('Cursor set to crosshair for drawing path');
        } else {
            this.map.setOptions({ draggableCursor: 'default' });
            console.log('Cursor reset to default grab');
        }
        console.log('Mode set to:', this.currentMode);
    }

    async initializeSearch() {
        console.log('Initializing search...');
        
        // Import the places library
        const { SearchBox } = await google.maps.importLibrary("places");
        
        // Create the search box and link it to the UI element
        const input = document.getElementById("pac-input");
        const searchBox = new SearchBox(input);

        // Bias the SearchBox results towards current map's viewport
        this.map.addListener("bounds_changed", () => {
            searchBox.setBounds(this.map.getBounds());
        });

        // Listen for place selection and center map
        searchBox.addListener("places_changed", () => {
            const places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            const place = places[0]; // Take the first place
            
            if (!place.geometry || !place.geometry.location) {
                console.log("Selected place contains no geometry");
                return;
            }

            // Center map on the selected place
            if (place.geometry.viewport) {
                this.map.fitBounds(place.geometry.viewport);
            } else {
                this.map.setCenter(place.geometry.location);
                this.map.setZoom(17);
            }
            
            console.log('Map centered on:', place.name);
        });
        
        console.log('Search initialized');
    }
 
    // Drawing and Saving Logic

    // This function is now just for interactive adding
    addMarkerAtLocation(location) {
        // Save the marker to the database first
        this.saveWaypoint({ lat: location.lat(), lng: location.lng() });
    }

    // Generic function to draw a marker (used by load and interactive add)
    drawMarker(waypoint, animate = false) {
        // Convert both to numbers for comparison
        const isCurrentUser = Number(waypoint.userId) === Number(this.userId);

        console.log("current user", isCurrentUser);

        const marker = new google.maps.Marker({
            position: { lat: waypoint.lat, lng: waypoint.lng },
            map: this.map,
            animation: animate ? google.maps.Animation.DROP : null,
            icon: isCurrentUser ? {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            } : {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }
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
            
            // Load new data to show the new waypoint with animation
            await this.loadNewData();
        } catch (error) {
            console.error('Failed to save waypoint:', error);
        }
    }
    
    // This function is now just for interactive drawing
    addPathPoint(location) {
        console.log('Adding path point at:', location.lat(), location.lng());
        
        if (!this.currentPolyline) {
            console.log('Creating new polyline...');
            // Create a new polyline but don't save it yet
            this.currentPolyline = new google.maps.Polyline({
                path: [], geodesic: true, strokeColor: '#d73f09',
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
                fillColor: '#d73f09', 
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
        const isCurrentUser = Number(pathData.userId) === Number(this.userId);
        const polyline = new google.maps.Polyline({
            path: pathData.path, // The server now provides the path array directly
            geodesic: true, strokeColor: isCurrentUser ? '#4285F4' : '#b8340a', // Use a darker shade for saved paths
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
            
            // Load new data to show the new path
            await this.loadNewData();
            
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
            
            // Clear all overlays from the map
            
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
            this.clearMapOverlays();
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
        setTimeout(initMap, 100);
    }
}