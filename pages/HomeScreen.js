import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';

const categories = [
  {
    id: 1,
    name: 'Home Services',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400',
    count: 150,
  },
  {
    id: 2,
    name: 'Beauty & Wellness',
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&q=80&w=400',
    count: 120,
  },
  {
    id: 3,
    name: 'Professional',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=400',
    count: 85,
  },
  {
    id: 4,
    name: 'Education',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400',
    count: 95,
  },
];

export default function HomeScreen() {
  const navigation = useNavigation(); // Initialize navigation
  const [services, setServices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch services from Firestore
  const fetchServices = async () => {
    setIsRefreshing(true);
    try {
      // Query the Firestore services collection
      const q = query(collection(db, 'services'));
      const snapshot = await getDocs(q);
      
      // Map the fetched data to an array of services
      const fetchedServices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Set the services in state
      setServices(fetchedServices);
    } catch (err) {
      console.error('❌ Firestore fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={fetchServices} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, User! 👋</Text>
        <Text style={styles.subtitle}>Find the perfect service provider</Text>
      </View>

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => navigation.navigate('Category', { id: category.id })}
              style={styles.categoryCard}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{category.count} providers</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured Services</Text>
        {services.length === 0 ? (
          <Text>No services found.</Text>
        ) : (
          services.map((service) => (
            <TouchableOpacity
              key={service.id}
              onPress={() => {
                navigation.navigate('ServiceDetails', {
                  service: service, // Pass the full service data
                });
              }}
              style={styles.providerCard}
            >
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{service.username}</Text>
                <Text style={styles.providerService}>{service.category}</Text>
                <Text style={styles.providerDescription}>{service.serviceDescription}</Text>
                <Text style={styles.providerDescription}>{service.providerDescription}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  categoriesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoriesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: 200,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryImage: {
    width: '100%',
    height: 120,
  },
  categoryInfo: {
    padding: 12,
    backgroundColor: '#FDDBBB',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  featuredSection: {
    padding: 20,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#F0C1E1',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  providerDescription: {
    fontSize: 12,
    color: '#333',
    marginTop: 6,
  },
});
