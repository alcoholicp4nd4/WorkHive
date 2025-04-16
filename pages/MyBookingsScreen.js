import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert, TouchableOpacity } from 'react-native';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { useNavigation } from '@react-navigation/native';

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
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchAllServiceDetails = async () => {
      const serviceIds = bookings.map(booking => booking.serviceId);
      const uniqueServiceIds = [...new Set(serviceIds)];

      const serviceDetails = {};
      for (const serviceId of uniqueServiceIds) {
        if (!services[serviceId]) {
          const serviceDoc = await getDoc(doc(db, 'services', serviceId));
          if (serviceDoc.exists()) {
            serviceDetails[serviceId] = serviceDoc.data();
          }
        }
      }
      setServices(prevServices => ({ ...prevServices, ...serviceDetails }));
    };

    if (bookings.length > 0) {
      fetchAllServiceDetails();
    }
  }, [bookings]);

  const cancelBooking = async (bookingId, createdAt) => {
    const now = new Date();
    const bookingDate = createdAt.toDate();
    const timeDifference = now - bookingDate;
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference <= 24) {
      try {
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
    const now = new Date();
    const bookingDate = createdAt.toDate();
    const endTime = new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000);
    const timeDifference = endTime - now;

    if (timeDifference <= 0) {
      return 'Expired';
    }

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

  const renderItem = ({ item }) => {
    const service = services[item.serviceId];

    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetails', {
          bookingId: item.id,
          serviceId: item.serviceId,
          providerId: item.providerId
        })}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.serviceName}>{service?.title || 'Loading...'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.bookingInfo}>
          <Text style={styles.infoText}>Booked on: {formatDate(item.createdAt)}</Text>
          <Text style={styles.infoText}>Price: ${service?.price || 'N/A'}</Text>
          <Text style={styles.infoText}>Delivery Time: {service?.deliveryTime || 'N/A'}</Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.bookingFooter}>
            <Text style={styles.countdownText}>{formatCountdown(item.createdAt)}</Text>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => cancelBooking(item.id, item.createdAt)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterBtn, sortBy === 'date' && styles.activeFilterBtn]}
          onPress={() => {
            setSortBy('date');
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Text>Sort by Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, sortBy === 'name' && styles.activeFilterBtn]}
          onPress={() => {
            setSortBy('name');
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Text>Sort by Provider {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={sortBookings()}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
  },
  filterBtn: {
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
  },
  activeFilterBtn: {
    backgroundColor: '#B78BFA',
  },
  bookingCard: {
    padding: 15,
    backgroundColor: '#FFF0FA',
    borderRadius: 10,
    marginBottom: 15,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    padding: 5,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingInfo: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  countdownText: {
    fontSize: 14,
  },
  cancelButton: {
    padding: 10,
    backgroundColor: '#FF0000',
    borderRadius: 5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
