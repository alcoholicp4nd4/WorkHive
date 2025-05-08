import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, SafeAreaView, Platform, StatusBar, Image, Dimensions } from 'react-native';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { sendNotification } from '../utils/notificationUtils';

const { width } = Dimensions.get('window');

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const navigation = useNavigation();

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Orange
      case 'confirmed':
        return '#10B981'; // Green
      case 'completed':
        return '#3B82F6'; // Blue
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchAllServiceDetails = async () => {
      const serviceIds = bookings.map(booking => booking.serviceId).filter(id => !!id);
      const uniqueServiceIds = [...new Set(serviceIds)];

      const serviceDetailsToFetch = uniqueServiceIds.filter(id => !services[id]);
      if (serviceDetailsToFetch.length === 0) return;

      const fetchedServiceDetails = {};
      for (const serviceId of serviceDetailsToFetch) {
        try {
            const serviceDoc = await getDoc(doc(db, 'services', serviceId));
            if (serviceDoc.exists()) {
                fetchedServiceDetails[serviceId] = serviceDoc.data();
            }
        } catch (error) {
            console.error(`Error fetching service ${serviceId}:`, error);
        }
      }
      setServices(prevServices => ({ ...prevServices, ...fetchedServiceDetails }));
    };

    if (bookings.length > 0) {
      fetchAllServiceDetails();
    }
  }, [bookings]);

  const cancelBooking = async (bookingId, createdAt) => {
    if (!createdAt || typeof createdAt.toDate !== 'function') {
      Alert.alert('Error', 'Booking creation time is missing or invalid. Cannot cancel.');
      return;
    }
    const now = new Date();
    const bookingDate = createdAt.toDate();
    const timeDifference = now - bookingDate;
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference <= 24) {
      try {
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        const booking = bookingDoc.data();
        if (booking) {
          const serviceDoc = await getDoc(doc(db, 'services', booking.serviceId));
          const service = serviceDoc.data();

          if (service) {
            await sendNotification(
              booking.providerId,
              'booking_cancellation',
              `Your booking for "${service.title}" has been canceled by the customer.`,
              bookingId
            );
          } else {
            console.error('Service not found for booking:', booking.serviceId);
          }
        }
        await deleteDoc(doc(db, 'bookings', bookingId));
        Alert.alert('Success', 'Booking cancelled successfully.');
      } catch (error) {
        console.error('Error cancelling booking:', error);
        Alert.alert('Error', 'Failed to cancel the booking.');
      }
    } else {
      Alert.alert('Error', 'Cancellation period has expired.');
    }
  };

  const formatCountdown = (createdAt) => {
    if (!createdAt || typeof createdAt.toDate !== 'function') return 'Invalid Date';
    const now = new Date();
    const bookingDate = createdAt.toDate();
    const endTime = new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000);
    const timeDifference = endTime - now;
    if (timeDifference <= 0) return 'Expired';
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s remaining`;
  };

  const sortBookings = () => {
    return [...bookings].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'name') {
        const serviceA = services[a.serviceId]?.username || '';
        const serviceB = services[b.serviceId]?.username || '';
        return sortOrder === 'asc' 
          ? serviceA.localeCompare(serviceB)
          : serviceB.localeCompare(serviceA);
      }
      return 0;
    });
  };

  const renderBookingItem = ({ item: booking }) => {
    const service = services[booking.serviceId];

    if (!service) {
        // Optionally render a placeholder or loading state for the card
        return (
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    <Text>Loading service details...</Text>
                </View>
            </View>
        );
    }

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetails', {
          bookingId: booking.id,
          serviceId: booking.serviceId,
          providerId: booking.providerId
        })}
      >
        <FlatList
          data={
            service.images && service.images.length > 0
              ? service.images
              : ['https://via.placeholder.com/300']
          }
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, idx) => uri + idx.toString()}
          renderItem={({ item: imageUri }) => (
            <Image
              source={{ uri: imageUri }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}
        />
        <View style={styles.cardContent}>
          <View style={styles.bookingHeaderRow}>
            <Text style={styles.cardTitle}>{service.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.cardUsername}>by {service.username}</Text>
          <Text style={styles.cardCategory}>{service.category}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardPrice}>
              {service.priceType === 'hourly' ? `${service.price} TND/hr` : `${service.price} TND`}
            </Text>
            <Text style={styles.cardDelivery}>{service.deliveryTime}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.infoTextStrong}>Booked on: {formatDate(booking.createdAt)}</Text>
          
          {booking.status === 'pending' && (
            <View style={styles.bookingFooter}>
              <Text style={styles.countdownText}>{formatCountdown(booking.createdAt)}</Text>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => cancelBooking(booking.id, booking.createdAt)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#2D1B5A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>
      <View style={styles.mainContentWrapper}>
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterBtn, sortBy === 'date' && styles.activeFilterBtn]}
            onPress={() => {
              setSortBy('date');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
          >
            <Text style={[styles.filterBtnText, sortBy === 'date' && styles.activeFilterBtnText]}>
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, sortBy === 'name' && styles.activeFilterBtn]}
            onPress={() => {
              setSortBy('name');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
          >
            <Text style={[styles.filterBtnText, sortBy === 'name' && styles.activeFilterBtnText]}>
              Provider {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.contentArea}>
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>You have no bookings yet.</Text>
            </View>
          ) : (
            <FlatList
                data={sortBookings()}
                keyExtractor={item => item.id}
                renderItem={renderBookingItem}
                contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginLeft: 16,
  },
  mainContentWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  activeFilterBtn: {
    backgroundColor: '#5A31F4',
  },
  filterBtnText: {
    color: '#5A31F4',
    fontWeight: '600',
  },
  activeFilterBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContainer: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    height: 180,
  },
  cardContent: {
    padding: 15,
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardUsername: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 13,
    color: '#B78BFA',
    fontWeight: '600',
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 8,
  },
  infoTextStrong: {
      fontSize: 14,
      color: '#333',
      fontWeight: '500',
      marginBottom: 8,
  },
  bookingFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFCDD2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  cancelButtonText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
