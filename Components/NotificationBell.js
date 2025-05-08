import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Modal, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationBell({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // Listen for notifications where user is recipient
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [userId]);

  const markNotificationsAsRead = async () => {
    if (!userId) return;

    try {
      // Get all unread notifications
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);

      // Update each notification to mark as read
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );

      await Promise.all(updatePromises);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleBellPress = () => {
    setVisible(!visible);
    if (!visible) {
      markNotificationsAsRead();
    }
  };

  const handleNotificationPress = async (notification) => {
    setVisible(false);
    
    try {
      // Check if the notification still exists in the database
      const notificationDoc = await getDoc(doc(db, 'notifications', notification.id));
      if (!notificationDoc.exists()) {
        Alert.alert('Notification Deleted', 'This notification has been deleted.');
        return;
      }

      // If the notification is for a booking cancellation, do not navigate
      if (notification.type === 'booking_cancellation') {
        Alert.alert('Booking Canceled', 'This booking has been canceled.');
        return; // Do not navigate anywhere
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

  const renderNotification = ({ item }) => (
    <Pressable
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {item.createdAt?.toLocaleString()}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  );

  return (
    <View>
      <TouchableOpacity onPress={handleBellPress} style={styles.bellButton}>
        <Ionicons name="notifications-outline" size={28} color="#333" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Notifications</Text>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderNotification}
                style={styles.notificationList}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: 2,
    top: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdown: {
    marginTop: 50,
    marginRight: 10,
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#2D1B5A',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  notificationList: {
    maxHeight: 300,
  },
  notificationItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#F0F6FF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#2D1B5A',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5A31F4',
    marginLeft: 8,
  },
});