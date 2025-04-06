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
  Platform
} from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(fetched);
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup
  }, []);

  const filtered = services.filter(service =>
    service.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <SearchIcon size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CB9DF0" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <Image
                source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
                style={styles.image}
              />
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.provider}>by {item.username}</Text>
                <View style={styles.row}>
                  <Text style={styles.price}>
                    {item.priceType === 'hourly' ? `$${item.price}/hr` : `$${item.price}`}
                  </Text>
                  <Text style={styles.delivery}>{item.deliveryTime}</Text>
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
  header: { padding: 20, paddingTop: 60, backgroundColor: '#CB9DF0' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  listContainer: { padding: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F0C1E1',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  image: { width: 100, height: 100 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: '#333' },
  category: { fontSize: 14, color: '#666', marginTop: 2 },
  provider: { fontSize: 13, color: '#555', marginTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: { fontSize: 15, fontWeight: '600', color: '#333' },
  delivery: { fontSize: 13, color: '#666' },
});
