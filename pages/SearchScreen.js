import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Search as SearchIcon, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';

// Sample data for service providers
const allProviders = [
  {
    id: 1,
    name: 'Sarah Johnson',
    service: 'Interior Designer',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    location: {
      latitude: 37.78825,
      longitude: -122.4324,
      address: 'San Francisco, CA'
    },
    distance: 0, // Will be calculated
  },
  {
    id: 2,
    name: 'Michael Chen',
    service: 'Personal Trainer',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=400',
    location: {
      latitude: 37.78525,
      longitude: -122.4354,
      address: 'San Francisco, CA'
    },
    distance: 0, // Will be calculated
  },
  {
    id: 3,
    name: 'Emma Rodriguez',
    service: 'Hair Stylist',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
    location: {
      latitude: 37.78925,
      longitude: -122.4344,
      address: 'San Francisco, CA'
    },
    distance: 0, // Will be calculated
  },
  {
    id: 4,
    name: 'David Kim',
    service: 'Plumber',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    location: {
      latitude: 37.78625,
      longitude: -122.4334,
      address: 'San Francisco, CA'
    },
    distance: 0, // Will be calculated
  },
];

// Web-compatible map placeholder component
const WebMapPlaceholder = ({ location, providers }) => (
  <View style={styles.webMapPlaceholder}>
    <View style={styles.webMapContent}>
      <MapPin size={40} color="#CB9DF0" />
      <Text style={styles.webMapTitle}>Map View</Text>
      <Text style={styles.webMapText}>
        Interactive maps are available on mobile devices.
      </Text>
      <Text style={styles.webMapCoords}>
        Your coordinates: {location?.coords.latitude.toFixed(4)}, {location?.coords.longitude.toFixed(4)}
      </Text>
      <View style={styles.webMapProviders}>
        <Text style={styles.webMapProvidersTitle}>Nearby Providers:</Text>
        {providers.slice(0, 3).map(provider => (
          <Text key={provider.id} style={styles.webMapProviderItem}>
            • {provider.name} ({provider.distance.toFixed(1)} km)
          </Text>
        ))}
      </View>
    </View>
  </View>
);

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationStatus, setLocationStatus] = useState('not-started');
  const [providers, setProviders] = useState([]);
  const [showMap, setShowMap] = useState(false);

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const getLocationAsync = async () => {
    setLocationStatus('loading');
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLocationStatus('error');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      setLocationStatus('success');
      
      // Calculate distance for each provider
      const providersWithDistance = allProviders.map(provider => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          provider.location.latitude,
          provider.location.longitude
        );
        return { ...provider, distance };
      });
      
      // Sort providers by distance
      const sortedProviders = providersWithDistance.sort((a, b) => a.distance - b.distance);
      setProviders(sortedProviders);
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg(Platform.OS === 'web' 
        ? 'Location services may be restricted in your browser. Try enabling location permissions.'
        : 'Could not get your location');
      setLocationStatus('error');
      // Use unsorted providers as fallback
      setProviders(allProviders);
    }
  };

  useEffect(() => {
    getLocationAsync();
  }, []);

  const filteredProviders = providers.filter(
    provider =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMapView = () => {
    setShowMap(!showMap);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <SearchIcon size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services or providers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.mapToggleButton} 
          onPress={toggleMapView}
        >
          <Text style={styles.mapToggleText}>
            {showMap ? 'List View' : 'Map View'}
          </Text>
        </TouchableOpacity>
      </View>

      {locationStatus === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CB9DF0" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {locationStatus === 'error' && (
        <View style={styles.errorContainer}>
          <MapPin size={40} color="#F0C1E1" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={getLocationAsync}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {locationStatus === 'success' && !showMap && (
        <>
          <View style={styles.locationInfoContainer}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>
              Showing providers near you
            </Text>
          </View>

          <FlatList
            data={filteredProviders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.providerCard}>
                <Image source={{ uri: item.image }} style={styles.providerImage} />
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{item.name}</Text>
                  <Text style={styles.providerService}>{item.service}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.locationAddress}>{item.location.address}</Text>
                  </View>
                  <View style={styles.bottomRow}>
                    <Text style={styles.rating}>★ {item.rating}</Text>
                    <Text style={styles.distance}>{item.distance.toFixed(1)} km away</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}

      {locationStatus === 'success' && showMap && location && (
        Platform.OS === 'web' ? (
          <WebMapPlaceholder location={location} providers={filteredProviders} />
        ) : (
          // This code will only run on native platforms
          // We're not importing MapView here to avoid the web error
          <View style={styles.mapContainer}>
            <Text>Map view is only available on native platforms</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#CB9DF0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  mapToggleButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  mapToggleText: {
    color: '#CB9DF0',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#F0C1E1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  locationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 20,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#F0C1E1',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  providerImage: {
    width: 100,
    height: 100,
  },
  providerInfo: {
    flex: 1,
    padding: 15,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  providerService: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationAddress: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  distance: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  // Web map placeholder styles
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  webMapTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  webMapText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  webMapCoords: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
  },
  webMapProviders: {
    width: '100%',
    backgroundColor: '#F0C1E1',
    padding: 15,
    borderRadius: 10,
  },
  webMapProvidersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  webMapProviderItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  }
});