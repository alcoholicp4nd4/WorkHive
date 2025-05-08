import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { sendNotification } from '../utils/notificationUtils';
import ServiceRating from '../Components/ServiceRating';
import FavoriteButton from '../Components/FavoriteButton';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ServiceDetailsScreen({ route, navigation }) {
  const { service } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handleBookService = async () => {
    if (!service.userId) {
      Alert.alert("Error", "Service provider ID is missing.");
      return;
    }
    if (currentUser?.uid === service.userId) {
      Alert.alert("You cannot book your own service.");
      return;
    }
    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('serviceId', '==', service.id), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingBooking = querySnapshot.docs[0].data();
        if (existingBooking.status !== 'completed') {
          Alert.alert('Error', 'You have already booked this service.');
          return;
        }
      }
      await sendNotification(
        service.userId,
        'booking',
        `You have a new booking for "${service.title}".`
      );
      await addDoc(bookingsRef, {
        serviceId: service.id,
        providerId: service.userId,
        userId: currentUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Service booked successfully!');
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book the service.');
    }
  };

  return (
    <View style={styles.screenBg}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageCarousel}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {service.images?.length > 0 ? (
              service.images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.image} />
              ))
            ) : (
              <Image source={{ uri: 'https://via.placeholder.com/300' }} style={styles.image} />
            )}
          </ScrollView>
          <View style={styles.favBtnWrap}>
            <FavoriteButton serviceId={service.id} />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{service.title}</Text>
          <View style={styles.ratingWrap}>
            <ServiceRating serviceId={service.id} readOnly={true} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subtitle}>by <Text style={styles.username}>{service.username}</Text></Text>
            <Text style={styles.category}><Text style={styles.categoryText}>{service.category}</Text></Text>
          </View>
          <View style={styles.sectionSpacing} />
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons name="payments" size={20} color="#5A31F4" />
              <Text style={styles.infoText}>{service.priceType === 'hourly' ? `${service.price} TND/hr` : `${service.price} TND`}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="timer" size={20} color="#5A31F4" />
              <Text style={styles.infoText}>{service.deliveryTime}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{service.description}</Text>
          <View style={styles.sectionSpacing} />
          <TouchableOpacity style={styles.lightButton}>
            <Text style={styles.lightButtonText}>💬 Contact Provider</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lightButton} onPress={handleBookService}>
            <Text style={styles.lightButtonText}>📦 Book Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.lightButton}
            onPress={() => {
              if (currentUser && currentUser.uid === service.userId) {
                navigation.navigate('UserProfileScreen');
              } else {
                navigation.navigate('PublicProfileScreen', { userId: service.userId });
              }
            }}
          >
            <Text style={styles.lightButtonText}>View Provider Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#5A31F4" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: '#F4EBFF',
  },
  scrollContent: {
    padding: 0,
    alignItems: 'center',
    paddingBottom: 40,
  },
  imageCarousel: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#fff',
    marginTop: 24,
  },
  image: {
    width: width,
    height: 300,
    borderRadius: 16,
  },
  favBtnWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
  },
  username: {
    color: '#5A31F4',
    fontWeight: '600',
  },
  category: {
    fontSize: 14,
    color: '#888',
  },
  categoryText: {
    color: '#B78BFA',
    fontWeight: '500',
  },
  ratingWrap: {
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFE3FF',
    marginVertical: 12,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B5A',
    marginBottom: 2,
  },
  description: {
    fontSize: 15,
    color: '#444',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#2D1B5A',
    marginLeft: 2,
  },
  lightButton: {
    backgroundColor: '#B78BFA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
    shadowColor: '#5A31F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  lightButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  sectionSpacing: {
    height: 8,
  },
  backButton: {
    position: 'absolute',
    top: 32,
    left: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});
