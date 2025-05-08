import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { markNotificationAsRead } from '../utils/notificationService';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleNotificationPress = async (notification) => {
    setVisible(false);
    
    try {
      // Check if the notification still exists in the database
      const notificationDoc = await getDoc(doc(db, 'notifications', notification.id));
      if (!notificationDoc.exists()) {
        Alert.alert('Notification Deleted', 'This notification has been deleted.');
        return;
      }

      // Navigate based on notification type
      if (notification.type === 'booking' && notification.relatedBookingId) {
        // Get the booking details to determine the navigation
        const bookingDoc = await getDoc(doc(db, 'bookings', notification.relatedBookingId));
        if (bookingDoc.exists()) {
          const booking = bookingDoc.data();
          
          // Check if current user is the provider or customer
          if (booking.providerId === userId) {
            // User is the provider, navigate to provider bookings
            navigation.navigate('BookedServices');
          } else if (booking.userId === userId) {
            // User is the customer, navigate to booking details
            navigation.navigate('BookingDetails', {
              bookingId: notification.relatedBookingId,
              serviceId: booking.serviceId,
              providerId: booking.providerId
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.date}>
        {item.createdAt?.toDate().toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    padding: 16,
  },
  notificationItem: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 12,
  },
  unreadNotification: {
    backgroundColor: '#e3f2fd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
}); 