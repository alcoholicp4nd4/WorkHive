import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';

export default function ProviderBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});
  const [services, setServices] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('providerId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchDetails = async () => {
      const userIds = bookings.map(booking => booking.userId);
      const serviceIds = bookings.map(booking => booking.serviceId);
      const uniqueUserIds = [...new Set(userIds)];
      const uniqueServiceIds = [...new Set(serviceIds)];

      const userDetails = {};
      for (const id of uniqueUserIds) {
        if (!users[id]) {
          const q = query(collection(db, 'users'), where('uid', '==', id));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            userDetails[id] = querySnapshot.docs[0].data();
          }
        }
      }

      const serviceDetails = {};
      for (const id of uniqueServiceIds) {
        if (!services[id]) {
          const serviceDoc = await getDoc(doc(db, 'services', id));
          if (serviceDoc.exists()) {
            serviceDetails[id] = serviceDoc.data();
          }
        }
      }

      setUsers(prevUsers => ({ ...prevUsers, ...userDetails }));
      setServices(prevServices => ({ ...prevServices, ...serviceDetails }));
    };

    if (bookings.length > 0) {
      fetchDetails();
    }
  }, [bookings]);

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

  const sortBookings = () => {
    return [...bookings].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'name') {
        const userA = users[a.userId]?.username || '';
        const userB = users[b.userId]?.username || '';
        return sortOrder === 'asc' 
          ? userA.localeCompare(userB)
          : userB.localeCompare(userA);
      }
      return 0;
    });
  };

  const renderItem = ({ item }) => {
    const user = users[item.userId];
    const service = services[item.serviceId];

    return (
      <View style={styles.card}>
        <Text>Service Title: {service ? service.title : 'Loading...'}</Text>
        <Text>User: {user ? user.username : 'Loading...'}</Text>
        <Text>Status: {item.status}</Text>
        <Text>Date: {item.createdAt?.toDate().toLocaleString()}</Text>

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
          <Text>Sort by Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</Text>
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