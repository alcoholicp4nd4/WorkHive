import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';

export default function PublicProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

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
        }
      } catch (err) {
        console.error('❌ Error loading public profile:', err);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{user.fullName}'s Profile</Text>

      <Image
        source={user.profileImage ? { uri: user.profileImage } : require('../assets/Avatar_placeholder.png')}
        style={styles.avatar}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        <Text style={styles.value}>{user.bio || '—'}</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{user.phone || '—'}</Text>
      </View>

      <Text style={styles.subheading}>Services Offered</Text>
      {services.length > 0 ? (
        services.map((service, index) => (
          <View key={index} style={styles.serviceCard}>
            {service.images && service.images.length > 0 && (
              <Image source={{ uri: service.images[0] }} style={styles.serviceImage} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDesc}>{service.description}</Text>
              <Text style={styles.serviceInfo}>Price: ${service.price}</Text>
              <Text style={styles.serviceInfo}>Delivery: {service.deliveryTime} days</Text>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookService(service)}>
              <Text style={styles.bookText}>📦 Book Service</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <Text style={styles.value}>No services available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F4EBFF',
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D1B5A',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#eee',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#333',
  },
  value: {
    fontSize: 14,
    color: '#555',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2D1B5A',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  serviceInfo: {
    fontSize: 12,
    color: '#999',
  },
  bookBtn: {
    backgroundColor: '#5A31F4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  bookText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  error: {
    color: 'red',
    fontSize: 16,
    padding: 20,
    textAlign: 'center',
  },
});
