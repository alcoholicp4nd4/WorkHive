import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';

export default function ProviderBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('providerId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (bookingId, newStatus, rejectionReason = '') => {
    const updateData = { status: newStatus };
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    await updateDoc(doc(db, 'bookings', bookingId), updateData);
  };

  const handleReject = (bookingId) => {
    Alert.prompt(
      'Reject Booking',
      'Please provide a reason for rejection:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async (reason) => {
            if (reason) {
              await handleUpdateStatus(bookingId, 'rejected', reason);
            } else {
              Alert.alert('Error', 'Rejection reason cannot be empty.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text>Service ID: {item.serviceId}</Text>
      <Text>User ID: {item.userId}</Text>
      <Text>Status: {item.status}</Text>

      <View style={styles.btnRow}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity onPress={() => handleUpdateStatus(item.id, 'in progress')} style={styles.btn}>
              <Text>✅ Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleReject(item.id)} style={styles.btn}>
              <Text>❌ Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'in progress' && (
          <TouchableOpacity onPress={() => handleUpdateStatus(item.id, 'completed')} style={styles.btn}>
            <Text>🏁 Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
    backgroundColor: '#EFE3FF',
    borderRadius: 10,
    marginBottom: 15,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    backgroundColor: '#D6C3F9',
    padding: 8,
    borderRadius: 8,
  },
});