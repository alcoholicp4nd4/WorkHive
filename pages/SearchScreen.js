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
import L from 'leaflet'; // Importing leaflet for web maps

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
      address: 'San Francisco, CA',
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
      address: 'San Francisco, CA',
    },
    distance: 0, // Will be calculated
  },
  // More providers...
];

// Web-compatible map placeholder component
const WebMapPlaceholder = ({ location, providers }) => {
  useEffect(() => {
    const map = L.map('webMap', {
      center: [location?.coords.latitude, location?.coords.longitude],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    providers.forEach(provider => {
      L.marker([provider.location.latitude, provider.location.longitude])
        .bindPopup(
          `<b>${provider.name}</b><br/>${provider.service}<br/>${provider.location.address}<br/>${provider.distance.toFixed(1)} km`
        )
        .addTo(map);
    });
  }, [location, providers]);

  return (
    <View style={styles.webMapPlaceholder}>
      <div id="webMap" style={{ width: '100%', height: '100%' }}></div>
      <Text style={styles.webMapCoords}>
        Your coordinates: {location?.coords.latitude.toFixed(4)}, {location?.coords.longitude.toFixed(4)}
      </Text>
    </View>
  );
};

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationStatus, setLocationStatus] = useState('not-started');
  const [providers, setProviders] = useState([]);
  const [showMap, setShowMap] = useState(false);

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
      
      const providersWithDistance = allProviders.map(provider => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          provider.location.latitude,
          provider.location.longitude
        );
        return { ...provider, distance };
      });
      
      const sortedProviders = providersWithDistance.sort((a, b) => a.distance - b.distance);
      setProviders(sortedProviders);
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg(Platform.OS === 'web' 
        ? 'Location services may be restricted in your browser. Try enabling location permissions.'
        : 'Could not get your location');
      setLocationStatus('error');
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
        <WebMapPlaceholder location={location} providers={filteredProviders} />
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
    marginTop: 12,
  },
  rating: {
    fontSize: 14,
    color: '#333',
  },
  distance: {
    fontSize: 14,
    color: '#CB9DF0',
  },
  webMapPlaceholder: {
    flex: 1,
    height: 400,
    backgroundColor: '#f5f5f5',
  },
  webMapCoords: {
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
});
