import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBookings(prevBookings => [...prevBookings]); // Trigger re-render
    }, 1000); // Update every second for countdown
    return () => clearInterval(interval);
  }, []);

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

  const renderItem = ({ item }) => {
    if (!item.createdAt) {
      return (
        <View style={styles.card}>
          <Text>Service ID: {item.serviceId}</Text>
          <Text>Status: {item.status}</Text>
          <Text style={{ color: 'red' }}>Error: Missing creation date</Text>
        </View>
      );
    }

    const now = new Date();
    const bookingDate = item.createdAt.toDate();
    const timeDifference = now - bookingDate;
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    return (
      <View style={styles.card}>
        <Text>Service ID: {item.serviceId}</Text>
        <Text>Status: {item.status}</Text>
        {item.status === 'rejected' && item.rejectionReason && (
          <Text style={{ color: 'red' }}>Rejection Reason: {item.rejectionReason}</Text>
        )}
        <Text>Cancellation Countdown: {formatCountdown(item.createdAt)}</Text>
        {item.status === 'pending' && hoursDifference <= 24 && (
          <Button
            title="Cancel Booking"
            onPress={() => cancelBooking(item.id, item.createdAt)}
          />
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={bookings}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 20 }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    backgroundColor: '#FFF0FA',
    borderRadius: 10,
    marginBottom: 15,
  },
});