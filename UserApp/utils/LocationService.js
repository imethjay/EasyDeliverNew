import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Google Maps API Key - Replace with your actual API key
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

class LocationService {
    static instance = null;
    
    constructor() {
        this.watchId = null;
        this.currentLocation = null;
        this.locationCallbacks = [];
    }

    static getInstance() {
        if (!LocationService.instance) {
            LocationService.instance = new LocationService();
        }
        return LocationService.instance;
    }

    // Request location permissions
    async requestPermissions() {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location permissions to use navigation features.',
                    [{ text: 'OK' }]
                );
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error requesting location permissions:', error);
            return false;
        }
    }

    // Get current location
    async getCurrentLocation() {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) return null;

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 10000,
                maximumAge: 60000, // 1 minute
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                heading: location.coords.heading,
                speed: location.coords.speed,
                timestamp: location.timestamp
            };

            this.currentLocation = coords;
            this.notifyLocationCallbacks(coords);
            
            return coords;
        } catch (error) {
            console.error('Error getting current location:', error);
            return null;
        }
    }

    // Start watching location changes
    async startLocationTracking(callback, options = {}) {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) return null;

            // Add callback to list
            if (callback && !this.locationCallbacks.includes(callback)) {
                this.locationCallbacks.push(callback);
            }

            // If already watching, return existing watch ID
            if (this.watchId) {
                return this.watchId;
            }

            const defaultOptions = {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000, // 5 seconds
                distanceInterval: 10, // 10 meters
                ...options
            };

            this.watchId = await Location.watchPositionAsync(
                defaultOptions,
                (location) => {
                    const coords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        heading: location.coords.heading,
                        speed: location.coords.speed,
                        timestamp: location.timestamp
                    };

                    this.currentLocation = coords;
                    this.notifyLocationCallbacks(coords);
                }
            );

            return this.watchId;
        } catch (error) {
            console.error('Error starting location tracking:', error);
            return null;
        }
    }

    // Stop location tracking
    stopLocationTracking(callback = null) {
        if (callback) {
            // Remove specific callback
            this.locationCallbacks = this.locationCallbacks.filter(cb => cb !== callback);
        } else {
            // Clear all callbacks
            this.locationCallbacks = [];
        }

        // Stop watching if no more callbacks
        if (this.locationCallbacks.length === 0 && this.watchId) {
            this.watchId.remove();
            this.watchId = null;
        }
    }

    // Notify all location callbacks
    notifyLocationCallbacks(location) {
        this.locationCallbacks.forEach(callback => {
            try {
                callback(location);
            } catch (error) {
                console.error('Error in location callback:', error);
            }
        });
    }

    // Geocode address to coordinates
    async geocodeAddress(address) {
        try {
            if (GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
                console.warn('Google Maps API key not configured for geocoding');
                return null;
            }

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return {
                    latitude: location.lat,
                    longitude: location.lng,
                    address: data.results[0].formatted_address
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    // Reverse geocode coordinates to address
    async reverseGeocode(latitude, longitude) {
        try {
            if (GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
                console.warn('Google Maps API key not configured for reverse geocoding');
                return null;
            }

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return {
                    address: data.results[0].formatted_address,
                    components: data.results[0].address_components
                };
            }
            return null;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in kilometers
        return distance;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // Calculate bearing between two points
    calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = this.deg2rad(lon2 - lon1);
        const lat1Rad = this.deg2rad(lat1);
        const lat2Rad = this.deg2rad(lat2);
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        const bearing = Math.atan2(y, x);
        return (bearing * 180 / Math.PI + 360) % 360; // Convert to degrees
    }

    // Get directions between two points
    async getDirections(origin, destination, mode = 'driving') {
        try {
            if (GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
                console.warn('Google Maps API key not configured for directions');
                return null;
            }

            const originStr = `${origin.latitude},${origin.longitude}`;
            const destinationStr = `${destination.latitude},${destination.longitude}`;
            
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const leg = route.legs[0];
                
                return {
                    distance: leg.distance,
                    duration: leg.duration,
                    steps: leg.steps,
                    polyline: route.overview_polyline.points,
                    bounds: route.bounds
                };
            }
            return null;
        } catch (error) {
            console.error('Directions error:', error);
            return null;
        }
    }

    // Check if location is within a certain radius of target
    isWithinRadius(currentLat, currentLon, targetLat, targetLon, radiusKm = 0.1) {
        const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon);
        return distance <= radiusKm;
    }

    // Format location for display
    formatLocation(location) {
        if (!location) return 'Unknown location';
        
        return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }

    // Get location accuracy description
    getAccuracyDescription(accuracy) {
        if (!accuracy) return 'Unknown';
        
        if (accuracy <= 5) return 'Excellent';
        if (accuracy <= 10) return 'Good';
        if (accuracy <= 20) return 'Fair';
        return 'Poor';
    }
}

// Navigation helper functions
export const NavigationHelpers = {
    // Open external navigation app
    openExternalNavigation: (destination, mode = 'driving') => {
        const { Linking } = require('react-native');
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`;
        
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open navigation app');
        });
    },

    // Open location in maps
    openLocationInMaps: (location) => {
        const { Linking } = require('react-native');
        const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
        
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open maps app');
        });
    },

    // Generate map region from coordinates
    generateMapRegion: (coordinates, padding = 0.01) => {
        if (!coordinates || coordinates.length === 0) return null;

        if (coordinates.length === 1) {
            return {
                latitude: coordinates[0].latitude,
                longitude: coordinates[0].longitude,
                latitudeDelta: padding,
                longitudeDelta: padding,
            };
        }

        const latitudes = coordinates.map(coord => coord.latitude);
        const longitudes = coordinates.map(coord => coord.longitude);

        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const deltaLat = (maxLat - minLat) + padding;
        const deltaLng = (maxLng - minLng) + padding;

        return {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: deltaLat,
            longitudeDelta: deltaLng,
        };
    }
};

export default LocationService; 