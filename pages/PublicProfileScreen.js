import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function PublicProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState('N/A');
  const [serviceRatings, setServiceRatings] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser(userData);
          const q = query(collection(db, 'services'), where('userId', '==', userId));
          const snap = await getDocs(q);
          const fetchedServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setServices(fetchedServices);
          // Fetch ratings for these services (for provider avg and per-service avg)
          const serviceIds = fetchedServices.map(s => s.id);
          let allRatings = [];
          if (serviceIds.length > 0) {
            for (let i = 0; i < serviceIds.length; i += 10) {
              const batchIds = serviceIds.slice(i, i + 10);
              const batchQuery = query(collection(db, 'ratings'), where('serviceId', 'in', batchIds));
              const ratingsSnap = await getDocs(batchQuery);
              allRatings = allRatings.concat(ratingsSnap.docs.map(doc => doc.data()));
            }
            // Provider avg
            const ratingValues = allRatings.map(r => parseFloat(r.rating)).filter(r => !isNaN(r));
            if (ratingValues.length > 0) {
              setAvgRating((ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length).toFixed(1));
            } else {
              setAvgRating('N/A');
            }
            // Per-service avg
            const ratingsByService = {};
            serviceIds.forEach(id => {
              const ratings = allRatings.filter(r => r.serviceId === id).map(r => parseFloat(r.rating)).filter(r => !isNaN(r));
              ratingsByService[id] = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : 'N/A';
            });
            setServiceRatings(ratingsByService);
          } else {
            setAvgRating('N/A');
            setServiceRatings({});
          }
        }
      } catch (err) {
        console.error('❌ Error loading public profile:', err);
        setAvgRating('N/A');
        setServiceRatings({});
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleBookService = async (service) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'You must be logged in to book a service.');
      return;
    }

    if (currentUser.uid === service.userId) {
      Alert.alert('Not Allowed', 'You cannot book your own service.');
      return;
    }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef,
        where('serviceId', '==', service.id),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingBooking = querySnapshot.docs[0].data();
        if (existingBooking.status !== 'completed') {
          Alert.alert('Already Booked', 'You have already booked this service.');
          return;
        }
      }

      await addDoc(bookingsRef, {
        serviceId: service.id,
        providerId: service.userId,
        userId: currentUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert('✅ Success', 'Service booked successfully!');
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert('❌ Error', 'Failed to book the service.');
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#5A31F4" size="large" />;
  if (!user) return <Text style={styles.error}>User not found.</Text>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4EBFF" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#5A31F4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={user.profileImage ? { uri: user.profileImage } : require('../assets/Avatar_placeholder.png')}
          style={styles.avatar}
        />
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Icon name="star" size={20} color="#C4B5FD" />
            <Text style={{ marginLeft: 6, color: '#374151', fontWeight: '600', fontSize: 16 }}>{avgRating}</Text>
          </View>
          <Text style={{ color: '#888', fontSize: 14 }}>Provider Rating</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username || '—'}</Text>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.value}>{user.bio || '—'}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user.phone || '—'}</Text>
        </View>
        <Text style={styles.subheading}>Services Offered</Text>
        {services.length > 0 ? (
          <View style={styles.serviceList}>
            {services.map((service, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ServiceDetails', { service })}
                style={{ marginBottom: 20 }}
              >
                <View style={styles.serviceCard}>
                  {service.images && service.images.length > 0 && (
                    <Image source={{ uri: service.images[0] }} style={styles.serviceImage} />
                  )}
                  <View style={styles.serviceCardContent}>
                    <Text style={styles.serviceTitle}>{service.title}</Text>
                    <Text style={styles.serviceCategory}>{service.category}</Text>
                    <Text style={styles.serviceProvider}>by {user.username}</Text>
                    <View style={styles.serviceCardRow}>
                      <Text style={styles.servicePrice}>{service.priceType === 'hourly' ? `${service.price} TND/hr` : `${service.price} TND`}</Text>
                      <Text style={styles.serviceDelivery}>{service.deliveryTime}</Text>
                    </View>
                    <View style={styles.serviceRatingRow}>
                      <Icon name="star" size={16} color="#C4B5FD" />
                      <Text style={styles.serviceRatingText}>{serviceRatings[service.id] || 'N/A'}</Text>
                    </View>
                    <Text style={styles.serviceDesc}>{service.description}</Text>
                    <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookService(service)}>
                      <Text style={styles.bookText}>📦 Book Service</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>No services available.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
  },
  container: {
    padding: 20,
    backgroundColor: '#F4EBFF',
    paddingBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: '#eee',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2D1B5A',
    marginTop: 8,
  },
  serviceList: {
    marginTop: 0,
    marginBottom: 24,
  },
  serviceCard: {
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
  serviceImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#eee',
  },
  serviceCardContent: {
    padding: 20,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 6,
  },
  serviceCategory: {
    fontSize: 15,
    color: '#B78BFA',
    fontWeight: '600',
    marginBottom: 8,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  serviceCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  servicePrice: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D1B5A',
  },
  serviceDelivery: {
    fontSize: 14,
    color: '#6B7280',
  },
  serviceDesc: {
    fontSize: 15,
    color: '#444',
    marginBottom: 12,
  },
  serviceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceRatingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  bookBtn: {
    backgroundColor: '#B78BFA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'flex-end',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
});
