import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Modal, FlatList, StyleSheet, Pressable } from 'react-native';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
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

    // Listen for notifications where user is recipient (customer)
    const customerQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Listen for notifications where user is provider (services booked from them)
    // This assumes you store providerId in the booking and notification has relatedBookingId
    // We'll fetch bookings where providerId == userId, then notifications for those bookings
    let unsubscribeBookings = () => {};
    let unsubscribeCustomer = onSnapshot(customerQuery, (snapshot) => {
      const customerNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(prev => {
        // Merge with provider notifications if already loaded
        const providerNotifications = prev.filter(n => n._source === 'provider');
        return [
          ...customerNotifications.map(n => ({ ...n, _source: 'customer' })),
          ...providerNotifications
        ].sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      });
      setUnreadCount(customerNotifications.filter(n => !n.read).length);
    });

    // Fetch bookings where user is provider
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', userId)
    );
    unsubscribeBookings = onSnapshot(bookingsQuery, async (bookingSnapshot) => {
      const bookingIds = bookingSnapshot.docs.map(doc => doc.id);
      if (bookingIds.length === 0) return;

      // Listen for notifications related to these bookings
      const notificationsRef = collection(db, 'notifications');
      // Firestore doesn't support "in" queries with more than 10 items, so batch if needed
      const batches = [];
      for (let i = 0; i < bookingIds.length; i += 10) {
        const batchIds = bookingIds.slice(i, i + 10);
        batches.push(
          query(
            notificationsRef,
            where('relatedBookingId', 'in', batchIds),
            orderBy('createdAt', 'desc')
          )
        );
      }
      let providerNotifications = [];
      await Promise.all(
        batches.map(batchQuery =>
          new Promise(resolve => {
            onSnapshot(batchQuery, (snapshot) => {
              providerNotifications = providerNotifications.concat(
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _source: 'provider' }))
              );
              resolve();
            });
          })
        )
      );
      setNotifications(prev => {
        // Merge with customer notifications if already loaded
        const customerNotifications = prev.filter(n => n._source === 'customer');
        return [
          ...customerNotifications,
          ...providerNotifications
        ].sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      });
      setUnreadCount(prev => {
        // Recalculate unread count
        return notifications.filter(n => !n.read).length;
      });
    });

    return () => {
      unsubscribeCustomer();
      unsubscribeBookings();
    };
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

  const handleNotificationPress = (notification) => {
    setVisible(false);
    // Optionally mark as read here
    // navigation to booking or service details if needed
    if (notification.relatedBookingId) {
      navigation.navigate('BookingDetailsScreen', { bookingId: notification.relatedBookingId });
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
      <Text style={styles.notificationText}>{item.message}</Text>
      <Text style={styles.notificationType}>
        {item._source === 'customer' ? 'As Customer' : 'As Provider'}
      </Text>
    </Pressable>
  );

  return (
    <View>
      <TouchableOpacity onPress={handleBellPress} style={styles.bellButton}>
        <Ionicons name="notifications-outline" size={28} color="#333" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
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
                style={{ maxHeight: 300 }}
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
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  notificationItem: {
    paddingVertical: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  unreadNotification: {
    backgroundColor: '#F0F6FF',
  },
  notificationText: {
    fontSize: 14,
    color: '#222',
  },
  notificationType: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});