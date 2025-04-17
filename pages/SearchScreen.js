import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  Button,
  Alert,
} from 'react-native';
import { Search, MapPin, SlidersHorizontal } from 'lucide-react-native';
import * as Location from 'expo-location';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

const categoryGroups = {
  Tech: [
    'web-development',
    'mobile-app-development',
    'software-engineering',
    'ui-ux-design',
    'qa-testing',
    'game-development',
    'devops-cloud',
  ],
  Design: [
    'graphic-design',
    'logo-design',
    'animation',
    'video-editing',
    'photography',
    'branding',
    'illustration',
  ],
  Business: [
    'seo',
    'digital-marketing',
    'social-media',
    'email-marketing',
    'copywriting',
    'business-consulting',
    'sales-strategy',
  ],
  Local: [
    'plumbing',
    'electrical',
    'cleaning',
    'moving',
    'handyman',
    'pest-control',
    'landscaping',
  ],
  Education: [
    'tutoring',
    'language-teaching',
    'life-coaching',
    'career-coaching',
    'test-prep',
  ],
  Wellness: [
    'fitness-training',
    'yoga',
    'therapy',
    'nutrition',
    'beauty',
    'hair-styling',
  ],
  Other: [
    'event-planning',
    'virtual-assistance',
    'data-entry',
    'translation',
    'custom-orders',
  ],
};

// Helper: Convert a delivery time string (e.g., "3 days" or "2 months") into days.
function convertDeliveryTimeToDays(deliveryStr) {
  if (!deliveryStr) return 0;
  const parts = deliveryStr.split(' ');
  if (parts.length < 2) return parseInt(parts[0], 10) || 0;
  const value = parseInt(parts[0], 10);
  const unit = parts[1].toLowerCase();
  if (unit.startsWith('day')) return value;
  if (unit.startsWith('month')) return value * 30;
  return value;
}

export default function SearchScreen({ navigation }) {
  // Basic search & services
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // Nearby filter state
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [radius, setRadius] = useState(10);
  const [filterNearby, setFilterNearby] = useState(false);

  // Modal states for "Nearby"
  const [nearbyModalVisible, setNearbyModalVisible] = useState(false);
  const [modalLocation, setModalLocation] = useState(null);
  const [modalMapRegion, setModalMapRegion] = useState(null);
  const [modalRadius, setModalRadius] = useState(10);

  // Additional filters: category, service type, price range, delivery time range
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterDeliveryMin, setFilterDeliveryMin] = useState('');
  const [filterDeliveryMax, setFilterDeliveryMax] = useState('');
  const [filterDeliveryUnit, setFilterDeliveryUnit] = useState('days'); // 'days' or 'months'

  // Fetch services from Firestore
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Get user's current location (for the Nearby filter)
  useEffect(() => {
    getUserLocation();
  }, []);

  // Filtering useEffect
  useEffect(() => {
    let filteredList = services.filter(
      (item) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // If "Nearby" filtering is active
    if (filterNearby && location) {
      filteredList = filteredList.filter(item => {
        // If the service doesn't have a location, include it.
        if (!item.location?.latitude) return true;
        return getDistance(item.location.latitude, item.location.longitude) <= radius;
      });
    }
    

    // Category filter (exact match)
    if (filterCategory) {
      const allowedCategories = categoryGroups[filterCategory];
      if (allowedCategories && allowedCategories.length > 0) {
        filteredList = filteredList.filter(item =>
          allowedCategories.includes(item.category)
        );
      } else {
        // Fallback to exact match if mapping not found.
        filteredList = filteredList.filter(item =>
          item.category?.toLowerCase() === filterCategory.toLowerCase()
        );
      }
    }
    // Service Type filter (exact match)
    if (filterServiceType) {
      filteredList = filteredList.filter(
        (item) => item.serviceType?.toLowerCase() === filterServiceType.toLowerCase()
      );
    }
    // Price range filter (if min & max)
    if (filterMinPrice && filterMaxPrice) {
      const min = parseFloat(filterMinPrice);
      const max = parseFloat(filterMaxPrice);
      filteredList = filteredList.filter((item) => {
        const priceNum = parseFloat(item.price);
        return priceNum >= min && priceNum <= max;
      });
    }
    // Delivery time filter (convert to days)
    if (filterDeliveryMin && filterDeliveryMax) {
      const minTime =
        filterDeliveryUnit === 'months'
          ? parseInt(filterDeliveryMin, 10) * 30
          : parseInt(filterDeliveryMin, 10);
      const maxTime =
        filterDeliveryUnit === 'months'
          ? parseInt(filterDeliveryMax, 10) * 30
          : parseInt(filterDeliveryMax, 10);

      filteredList = filteredList.filter((item) => {
        const serviceDeliveryDays = convertDeliveryTimeToDays(item.deliveryTime);
        return serviceDeliveryDays >= minTime && serviceDeliveryDays <= maxTime;
      });
    }

    setFiltered(filteredList);
  }, [
    searchQuery,
    services,
    filterNearby,
    location,
    radius,
    filterCategory,
    filterServiceType,
    filterMinPrice,
    filterMaxPrice,
    filterDeliveryMin,
    filterDeliveryMax,
    filterDeliveryUnit,
  ]);

  // Get user's location for the "Nearby" filter
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (err) {
      console.warn('Location error:', err);
    }
  };

  // Haversine formula to compute distance in km
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  function getDistance(lat2, lon2) {
    const lat1 = location?.latitude;
    const lon1 = location?.longitude;
    if (!lat1 || !lon1) return Infinity;
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // "Nearby" modal logic
  const handleGetCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access location was denied.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setModalMapRegion(region);
    setModalLocation({ latitude: region.latitude, longitude: region.longitude });
  };

  const applyNearbyFilter = () => {
    if (!modalLocation) {
      Alert.alert('Location not set', 'Please set your location first.');
      return;
    }
    setLocation(modalLocation);
    setRadius(modalRadius);
    setFilterNearby(true);
    setNearbyModalVisible(false);
  };

  const resetNearbyFilter = () => {
    setFilterNearby(false);
    setLocation(null);
    setRadius(10);
  };

  // Additional Filters logic
  const applyAdditionalFilters = () => {
    setFilterModalVisible(false);
  };

  const resetAdditionalFilters = () => {
    setFilterCategory('');
    setFilterServiceType('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterDeliveryMin('');
    setFilterDeliveryMax('');
    setFilterDeliveryUnit('days');
  };

  // Render each service item with the old "card" style
  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ServiceDetails', { service: item })}
    >
      <FlatList
        data={
          item.images && item.images.length > 0
            ? item.images
            : ['https://via.placeholder.com/300']
        }
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, idx) => idx.toString()}
        renderItem={({ item: imageUri }) => (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardUsername}>by {item.username}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardPrice}>
            {item.priceType === 'hourly' ? `$${item.price}/hr` : `$${item.price}`}
          </Text>
          <Text style={styles.cardDelivery}>{item.deliveryTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={18} color="#666" />
          <TextInput
            placeholder="Search services..."
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterRow}>
          {/* Additional Filters Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterModalVisible(true)}
          >
            <SlidersHorizontal size={16} color="#B78BFA" />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
          {/* Nearby Filter Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              setNearbyModalVisible(true);
              if (location) {
                setModalLocation(location);
                setModalMapRegion({
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                });
                setModalRadius(radius);
              }
            }}
          >
            <MapPin size={16} color={filterNearby ? '#fff' : '#B78BFA'} />
            <Text style={[styles.filterText, filterNearby && styles.filterTextActive]}>
              Nearby
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reset Filter Buttons */}
      {filterNearby && (
        <TouchableOpacity style={styles.resetButton} onPress={resetNearbyFilter}>
          <Text style={styles.resetButtonText}>Reset Nearby Filter</Text>
        </TouchableOpacity>
      )}
      {(filterCategory ||
        filterServiceType ||
        filterMinPrice ||
        filterMaxPrice ||
        filterDeliveryMin ||
        filterDeliveryMax) && (
        <TouchableOpacity style={styles.resetButton} onPress={resetAdditionalFilters}>
          <Text style={styles.resetButtonText}>Reset Additional Filters</Text>
        </TouchableOpacity>
      )}

      {/* Service List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#B78BFA" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderServiceItem}
        />
      )}

      {/* Nearby Filter Modal */}
      <Modal
        visible={nearbyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNearbyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Location & Radius</Text>
            {!modalMapRegion ? (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleGetCurrentLocation}
              >
                <Text style={styles.modalButtonText}>Get Current Location</Text>
              </TouchableOpacity>
            ) : (
              <MapView
                style={styles.map}
                region={modalMapRegion}
                onRegionChangeComplete={(region) => {
                  setModalMapRegion(region);
                  setModalLocation({
                    latitude: region.latitude,
                    longitude: region.longitude,
                  });
                }}
              >
                <Marker
                  coordinate={modalMapRegion}
                  draggable
                  onDragEnd={(e) => {
                    const newCoord = e.nativeEvent.coordinate;
                    setModalLocation(newCoord);
                    setModalMapRegion({
                      ...modalMapRegion,
                      latitude: newCoord.latitude,
                      longitude: newCoord.longitude,
                    });
                  }}
                />
                <Circle
                  center={modalLocation}
                  radius={modalRadius * 1000}
                  strokeColor="rgba(0,0,255,0.5)"
                  fillColor="rgba(0,0,255,0.2)"
                />
              </MapView>
            )}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Radius: {modalRadius} km</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={modalRadius}
                onValueChange={setModalRadius}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#ccc"
              />
            </View>
            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={() => setNearbyModalVisible(false)} />
              <Button title="Apply" onPress={applyNearbyFilter} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Additional Filters Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Additional Filters</Text>

            <Text style={styles.modalLabel}>Category:</Text>
            <View style={styles.categoryOptions}>
              {['Tech', 'Design', 'Business', 'Local', 'Education', 'Wellness', 'Other'].map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      filterCategory.toLowerCase() === cat.toLowerCase() &&
                        styles.categoryOptionSelected,
                    ]}
                    onPress={() => setFilterCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        filterCategory.toLowerCase() === cat.toLowerCase() &&
                          styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.modalLabel}>Service Type:</Text>
            <View style={styles.serviceTypeRow}>
              {['remote', 'in-person'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.serviceTypeOption,
                    filterServiceType.toLowerCase() === type.toLowerCase() &&
                      styles.serviceTypeOptionSelected,
                  ]}
                  onPress={() => setFilterServiceType(type)}
                >
                  <Text
                    style={[
                      styles.serviceTypeOptionText,
                      filterServiceType.toLowerCase() === type.toLowerCase() &&
                        styles.serviceTypeOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Price Range:</Text>
            <View style={styles.priceRow}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                style={styles.priceInput}
                value={filterMinPrice}
                onChangeText={setFilterMinPrice}
              />
              <Text style={styles.priceSeparator}>-</Text>
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                style={styles.priceInput}
                value={filterMaxPrice}
                onChangeText={setFilterMaxPrice}
              />
            </View>

            <Text style={styles.modalLabel}>Delivery Time Range:</Text>
            <View style={styles.deliveryRow}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                style={styles.priceInput}
                value={filterDeliveryMin}
                onChangeText={setFilterDeliveryMin}
              />
              <Text style={styles.priceSeparator}>-</Text>
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                style={styles.priceInput}
                value={filterDeliveryMax}
                onChangeText={setFilterDeliveryMax}
              />
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    filterDeliveryUnit === 'days' && styles.unitOptionSelected,
                  ]}
                  onPress={() => setFilterDeliveryUnit('days')}
                >
                  <Text
                    style={[
                      styles.unitOptionText,
                      filterDeliveryUnit === 'days' && styles.unitOptionTextSelected,
                    ]}
                  >
                    Days
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    filterDeliveryUnit === 'months' && styles.unitOptionSelected,
                  ]}
                  onPress={() => setFilterDeliveryUnit('months')}
                >
                  <Text
                    style={[
                      styles.unitOptionText,
                      filterDeliveryUnit === 'months' && styles.unitOptionTextSelected,
                    ]}
                  >
                    Months
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={() => setFilterModalVisible(false)} />
              <Button
                title="Apply"
                onPress={() => {
                  applyAdditionalFilters();
                  setFilterModalVisible(false);
                }}
              />
            </View>
            <TouchableOpacity onPress={resetAdditionalFilters}>
              <Text style={styles.resetFilterText}>Reset Filter Options</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#F4EBFF',
  },
  searchRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    justifyContent: 'space-around',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#B78BFA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filterText: {
    fontSize: 14,
    color: '#B78BFA',
    marginLeft: 6,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  resetButton: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  resetButtonText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
  loading: { flex: 1, justifyContent: 'center' },
  list: { padding: 20 },
  // Card Styles (old style)
  card: {
    backgroundColor: '#F7F2FF',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardImage: {
    width: width - 40,
    height: 200,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardUsername: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  cardCategory: {
    fontSize: 13,
    color: '#B78BFA',
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardDelivery: {
    fontSize: 13,
    color: '#666',
  },
  // Modals
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 10,
  },
  categoryOption: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  categoryOptionSelected: {
    backgroundColor: '#B78BFA',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  serviceTypeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  serviceTypeOption: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 5,
  },
  serviceTypeOptionSelected: {
    backgroundColor: '#B78BFA',
  },
  serviceTypeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  serviceTypeOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 80,
    textAlign: 'center',
  },
  priceSeparator: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  unitSelector: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  unitOption: {
    borderColor: '#B78BFA',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  unitOptionSelected: {
    backgroundColor: '#B78BFA',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#B78BFA',
    fontWeight: '600',
  },
  unitOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  map: {
    width: '100%',
    height: 200,
    marginBottom: 10,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#D0E8FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  resetFilterText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginTop: 10,
    fontSize: 16,
  },
});
