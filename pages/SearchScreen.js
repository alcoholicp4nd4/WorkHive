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
import { Search, MapPin, SlidersHorizontal, X, ChevronLeft } from 'lucide-react-native';
import * as Location from 'expo-location';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialIcons';

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

export default function SearchScreen({ navigation, route }) {
  // Basic search & services
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);

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
  const [filterCategories, setFilterCategories] = useState(route.params?.initialCategory ? [route.params.initialCategory] : []);
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterDeliveryMin, setFilterDeliveryMin] = useState('');
  const [filterDeliveryMax, setFilterDeliveryMax] = useState('');
  const [filterDeliveryUnit, setFilterDeliveryUnit] = useState('days'); // 'days' or 'months'

  // Fetch services and ratings from Firestore
  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      const ratingsRef = collection(db, 'ratings');
      const [servicesSnapshot, ratingsSnapshot] = await Promise.all([
        getDocs(q),
        getDocs(ratingsRef),
      ]);
      const fetchedServices = servicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const fetchedRatings = ratingsSnapshot.docs.map(doc => doc.data());
      setServices(fetchedServices);
      setRatings(fetchedRatings);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Get user's current location (for the Nearby filter)
  useEffect(() => {
    getUserLocation();
  }, []);

  // Apply initial category filter when screen loads
  useEffect(() => {
    if (route.params?.initialCategory) {
      setFilterCategories([route.params.initialCategory]);
    }
  }, [route.params?.initialCategory]);

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
        if (!item.location?.latitude) return true;
        return getDistance(item.location.latitude, item.location.longitude) <= radius;
      });
    }
    

    // Category filter (multiple categories)
    if (filterCategories.length > 0) {
      const allowedCategories = filterCategories.flatMap(cat => categoryGroups[cat] || [cat]);
      filteredList = filteredList.filter(item =>
        allowedCategories.includes(item.category)
      );
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
    filterCategories,
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
    setFilterCategories([]);
    setFilterServiceType('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterDeliveryMin('');
    setFilterDeliveryMax('');
    setFilterDeliveryUnit('days');
  };

  const additionalFiltersActive = 
    filterCategories.length > 0 || 
    filterServiceType !== '' || 
    filterMinPrice !== '' || 
    filterMaxPrice !== '' || 
    filterDeliveryMin !== '' || 
    filterDeliveryMax !== '';

  // Helper to get average rating for a service
  const getDisplayRating = (serviceId) => {
    const serviceRatings = ratings.filter(r => r.serviceId === serviceId && typeof r.rating === 'number');
    if (serviceRatings.length === 0) return 'N/A';
    const avg = serviceRatings.reduce((sum, r) => sum + r.rating, 0) / serviceRatings.length;
    return avg.toFixed(1);
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
            {item.priceType === 'hourly' ? `${item.price} TND/hr` : `${item.price} TND`}
          </Text>
          <Text style={styles.cardDelivery}>{item.deliveryTime}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Icon name="star" size={16} color="#C4B5FD" />
          <Text style={{ marginLeft: 4, color: '#333', fontWeight: '500' }}>{getDisplayRating(item.id)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.searchRow}>
            <Search size={20} color="#666" />
            <TextInput
              placeholder="Search services..."
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterButtonGroup}>
            <TouchableOpacity
              style={[styles.filterBtn, (filterModalVisible || additionalFiltersActive) && styles.filterBtnActive]}
              onPress={() => setFilterModalVisible(true)}
            >
              <SlidersHorizontal size={18} color={(filterModalVisible || additionalFiltersActive) ? '#fff' : '#B78BFA'} />
              <Text style={[styles.filterText, (filterModalVisible || additionalFiltersActive) && styles.filterTextActive]}>
                Filters
              </Text>
            </TouchableOpacity>
            {additionalFiltersActive && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={resetAdditionalFilters}
              >
                <X size={18} color={'#B78BFA'} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterButtonGroup}>
            <TouchableOpacity
              style={[styles.filterBtn, filterNearby && styles.filterBtnActive]}
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
              <MapPin size={18} color={filterNearby ? '#fff' : '#B78BFA'} />
              <Text style={[styles.filterText, filterNearby && styles.filterTextActive]}>
                Nearby
              </Text>
            </TouchableOpacity>
            {filterNearby && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={resetNearbyFilter}
              >
                <X size={18} color={'#B78BFA'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Service List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#B78BFA" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Services Found</Text>
          <Text style={styles.emptyStateText}>
            Try adjusting your filters or search terms
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderServiceItem}
          showsVerticalScrollIndicator={false}
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
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setNearbyModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={applyNearbyFilter}
              >
                <Text style={styles.modalButtonText}>Apply</Text>
              </TouchableOpacity>
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

            <Text style={styles.modalLabel}>Categories:</Text>
            <View style={styles.categoryOptions}>
              {['Tech', 'Design', 'Business', 'Local', 'Education', 'Wellness', 'Other'].map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      filterCategories.includes(cat) && styles.categoryOptionSelected,
                    ]}
                    onPress={() => {
                      setFilterCategories(prev => 
                        prev.includes(cat)
                          ? prev.filter(c => c !== cat)
                          : [...prev, cat]
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        filterCategories.includes(cat) && styles.categoryOptionTextSelected,
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
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  applyAdditionalFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Apply</Text>
              </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#A78BFA',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  filterButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#B78BFA',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
  },
  filterBtnActive: {
    backgroundColor: '#8A2BE2',
  },
  filterText: {
    fontSize: 14,
    color: '#8A2BE2',
    marginLeft: 6,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImage: {
    width: width - 40,
    height: 200,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 14,
    color: '#B78BFA',
    fontWeight: '600',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cardDelivery: {
    fontSize: 14,
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
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
    justifyContent: 'center',
  },
  unitSelector: {
    flexDirection: 'row',
    marginLeft: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  modalButton: {
    backgroundColor: '#B78BFA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 0,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  resetFilterText: {
    color: '#B78BFA',
    textDecorationLine: 'underline',
    marginTop: 10,
    fontSize: 16,
    alignSelf: 'center',
  },
  clearFilterButton: {
    padding: 8,
    backgroundColor: '#F5F3FF',
    borderColor: '#B78BFA',
    borderWidth: 1,
    borderRadius: 20,
    marginLeft: 8,
  },
});
