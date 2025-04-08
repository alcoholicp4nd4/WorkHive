import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Search, MapPin, SlidersHorizontal } from 'lucide-react-native';
import * as Location from 'expo-location';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';

const { width } = Dimensions.get('window');

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterNearby, setFilterNearby] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    let filteredList = services.filter(
      item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterNearby && location) {
      filteredList = filteredList.filter(
        item =>
          item.location?.latitude &&
          getDistance(item.location.latitude, item.location.longitude) < 10
      );
    }

    setFiltered(filteredList);
  }, [searchQuery, services, filterNearby, location]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (err) {
      console.warn('Location error:', err);
    }
  };

  const deg2rad = deg => deg * (Math.PI / 180);

  const getDistance = (lat2, lon2) => {
    const lat1 = location?.coords.latitude;
    const lon1 = location?.coords.longitude;
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
  };

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
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterNearby(prev => !prev)}>
            <MapPin size={16} color={filterNearby ? '#fff' : '#B78BFA'} />
            <Text style={[styles.filterText, filterNearby && styles.filterTextActive]}>
              Nearby
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterBtn}>
            <SlidersHorizontal size={16} color="#B78BFA" />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#B78BFA" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
  style={styles.card}
  onPress={() => navigation.navigate('ServiceDetails', { service: item })}
>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {item.images && item.images.length > 0 ? (
                  item.images.map((uri, idx) => (
                    <Image
                      key={idx}
                      source={{ uri }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ))
                ) : (
                  <Image
                    source={{ uri: 'https://via.placeholder.com/300' }}
                    style={styles.cardImage}
                  />
                )}
              </ScrollView>

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
          )}
        />
      )}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: 20,
  },
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
});
