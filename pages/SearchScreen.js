import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search as SearchIcon, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';


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
  },
];

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [price, setPrice] = useState(100); // Default price value
  const [category, setCategory] = useState('All'); // Default category
  const [locationStatus, setLocationStatus] = useState('not-started');
  const [radius, setRadius] = useState(5); // Default radius for search (in km)

  // Get current location
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
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg('Could not get your location');
      setLocationStatus('error');
    }
  };

  useEffect(() => {
    getLocationAsync();
  }, []);

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

  {/* Price Slider */}
  <Text style={styles.filterText}>Price: ${price}</Text>
  <Slider
    style={styles.slider}
    minimumValue={0}
    maximumValue={200}
    step={10}
    value={price}
    onValueChange={setPrice}
    minimumTrackTintColor="#CB9DF0"
    maximumTrackTintColor="#ccc"
  />

  {/* Distance Slider */}
  <Text style={styles.filterText}>Distance: {radius} km</Text>
  <Slider
    style={styles.slider}
    minimumValue={1}
    maximumValue={50}
    step={1}
    value={radius}
    onValueChange={setRadius}
    minimumTrackTintColor="#CB9DF0"
    maximumTrackTintColor="#ccc"
  />

  {/* Category Dropdown */}
  <Text style={styles.filterText}>Category</Text>
  <Picker
    selectedValue={category}
    style={styles.picker}
    onValueChange={(itemValue) => setCategory(itemValue)}
  >
    <Picker.Item label="All" value="All" />
    <Picker.Item label="Interior Designer" value="Interior Designer" />
    <Picker.Item label="Personal Trainer" value="Personal Trainer" />
    <Picker.Item label="Hair Stylist" value="Hair Stylist" />
    <Picker.Item label="Plumber" value="Plumber" />
    {/* Add more categories as needed */}
  </Picker>
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

      {locationStatus === 'success' && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation
          >
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Your Location"
            />
            <Circle
              center={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              radius={radius * 1000} // Convert radius to meters
              strokeColor="#CB9DF0"
              fillColor="rgba(203, 157, 240, 0.3)"
            />
            {allProviders.map((provider) => (
              <Marker
                key={provider.id}
                coordinate={provider.location}
                title={provider.name}
                description={provider.service}
              />
            ))}
          </MapView>
        </View>
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
    paddingTop: 10,
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
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 20,
  },
  filterText: {
    color: '#666',
    marginBottom: 5,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 25,
  }
  
});