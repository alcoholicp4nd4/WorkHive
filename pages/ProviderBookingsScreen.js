import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { sendNotification } from '../utils/notificationUtils';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ProviderBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});
  const [services, setServices] = useState({});
  const [groupedBookings, setGroupedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const navigation = useNavigation();
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBookingId, setRejectBookingId] = useState(null);
  

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'bookings'), where('providerId', '==', userId));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
      if (data.length === 0) setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchDetails = async () => {
      const userIds = bookings.map(booking => booking.userId).filter(Boolean);
      const serviceIds = bookings.map(booking => booking.serviceId).filter(Boolean);
      const uniqueUserIds = [...new Set(userIds)];
      const uniqueServiceIds = [...new Set(serviceIds)];

      const usersToFetch = uniqueUserIds.filter(id => !users[id]);
      const servicesToFetch = uniqueServiceIds.filter(id => !services[id]);

      const userPromises = usersToFetch.map(id => getDoc(doc(db, 'users', id)));
      const servicePromises = servicesToFetch.map(id => getDoc(doc(db, 'services', id)));

      try {
          const userSnapshots = await Promise.all(userPromises);
          const serviceSnapshots = await Promise.all(servicePromises);

          const fetchedUsers = {};
          userSnapshots.forEach(snap => {
              if (snap.exists()) fetchedUsers[snap.id] = snap.data();
          });

          const fetchedServices = {};
          serviceSnapshots.forEach(snap => {
              if (snap.exists()) fetchedServices[snap.id] = snap.data();
          });

          if (Object.keys(fetchedUsers).length > 0) {
              setUsers(prev => ({ ...prev, ...fetchedUsers }));
          }
          if (Object.keys(fetchedServices).length > 0) {
              setServices(prev => ({ ...prev, ...fetchedServices }));
          }

      } catch (error) {
          console.error("Error fetching details batch: ", error);
      } finally {
           if (bookings.length > 0 && (servicesToFetch.length > 0 || usersToFetch.length > 0)) {
               setLoading(false);
           }
      }
    };

    if (bookings.length > 0) {
      fetchDetails();
    } 
  }, [bookings]);

  useEffect(() => {
    if (bookings.length > 0 && Object.keys(services).length > 0 && Object.keys(users).length > 0) {
      setLoading(true);

      const sortedBookings = [...bookings].sort((a, b) => {
         const dateA = a.createdAt?.toDate() || new Date(0);
         const dateB = b.createdAt?.toDate() || new Date(0);
         return dateB - dateA;
      });

      const groups = sortedBookings.reduce((acc, booking) => {
        const serviceId = booking.serviceId;
        if (!serviceId || !services[serviceId]) return acc;

        if (!acc[serviceId]) {
          acc[serviceId] = {
            serviceId: serviceId,
            serviceDetails: services[serviceId],
            bookings: [],
          };
        }
        const bookingWithUser = { ...booking, userDetails: users[booking.userId] };
        acc[serviceId].bookings.push(bookingWithUser);
        return acc;
      }, {});

      const groupedArray = Object.values(groups);
      
      groupedArray.sort((a, b) => a.serviceDetails.title.localeCompare(b.serviceDetails.title));

      setGroupedBookings(groupedArray);
      setLoading(false);
    } else if (bookings.length === 0 && !loading) {
        setGroupedBookings([]);
    }
  }, [bookings, services, users]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B'; 
      case 'confirmed':
      case 'in progress': return '#10B981'; 
      case 'completed': return '#3B82F6'; 
      case 'rejected':
      case 'cancelled': return '#EF4444'; 
      default: return '#6B7280';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleUpdateStatus = async (bookingId, newStatus, rejectionReason = '') => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'rejected' && rejectionReason) {
          updateData.rejectionReason = rejectionReason;
      }
      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      const booking = bookingDoc.data();
      if (booking) {
        let message = '';
        const serviceTitle = services[booking.serviceId]?.title || 'your booking';
        if (newStatus === 'confirmed') {
          message = `Your booking for "${serviceTitle}" has been confirmed.`;
        } else if (newStatus === 'in progress') {
          message = `Your booking for "${serviceTitle}" is now in progress.`;
        } else if (newStatus === 'completed') {
          message = `Your booking for "${serviceTitle}" has been completed.`;
        } else if (newStatus === 'rejected') {
          message = `Your booking for "${serviceTitle}" was rejected.` + (rejectionReason ? ` Reason: ${rejectionReason}` : '');
        }
        if (message) {
          await sendNotification(booking.userId, 'status_update', message, bookingId);
        }
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      Alert.alert("Error", "Failed to update booking status.");
    }
  };

  const handleReject = (bookingId) => {
    setRejectBookingId(bookingId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleSubmitRejection = () => {
    handleUpdateStatus(rejectBookingId, 'rejected', rejectReason || 'Provider rejected');
    setRejectModalVisible(false);
    setRejectBookingId(null);
    setRejectReason('');
  };

  const renderIndividualBookingItem = (booking) => {
      const user = booking.userDetails;
      if (!user) return null;

      return (
          <View key={booking.id} style={styles.bookingListItem}>
              <View style={styles.bookingInfoRow}>
                <Text style={styles.bookingUserText}>User: {user.username}</Text>
                <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusTextSmall}>{booking.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.bookingDateText}>Booked on: {formatDate(booking.createdAt)}</Text>
        {booking.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>{booking.message}</Text>
          </View>
        )}
              <View style={styles.individualBookingActions}>
          <TouchableOpacity 
            style={[styles.actionButtonSmall, styles.chatButton]}
            onPress={() => navigation.navigate('Chat', {
              bookingId: booking.id,
              otherUserId: booking.userId,
              otherUsername: user.username
            })}
          >
            <Text style={styles.actionButtonTextSmall}>💬 Chat</Text>
          </TouchableOpacity>
                {booking.status === 'pending' && (
                  <>
                    <TouchableOpacity onPress={() => handleUpdateStatus(booking.id, 'confirmed')} style={[styles.actionButtonSmall, styles.confirmButton]}>
                      <Text style={styles.actionButtonTextSmall}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReject(booking.id)} style={[styles.actionButtonSmall, styles.rejectButton]}>
                      <Text style={styles.actionButtonTextSmall}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                {booking.status === 'confirmed' && (
                    <TouchableOpacity onPress={() => handleUpdateStatus(booking.id, 'in progress')} style={[styles.actionButtonSmall, styles.inProgressButton]}>
                        <Text style={styles.actionButtonTextSmall}>Start Work</Text>
                    </TouchableOpacity>
                )}
                {booking.status === 'in progress' && (
                  <TouchableOpacity onPress={() => handleUpdateStatus(booking.id, 'completed')} style={[styles.actionButtonSmall, styles.completeButton]}>
                    <Text style={styles.actionButtonTextSmall}>Mark Completed</Text>
                  </TouchableOpacity>
                )}
                 {(booking.status === 'completed' || booking.status === 'rejected' || booking.status === 'cancelled') && (
                    <Text style={styles.finalBookingStatusText}>Status: {booking.status}</Text>
                )}
              </View>
          </View>
      );
  };

  const renderServiceGroupItem = ({ item: serviceGroup }) => {
    const { serviceDetails, bookings: bookingsInGroup } = serviceGroup;

    return (
      <View style={styles.card}> 
        <FlatList
          data={ serviceDetails.images && serviceDetails.images.length > 0 ? serviceDetails.images : ['https://via.placeholder.com/300'] }
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, idx) => `img-${serviceDetails.serviceId}-${idx}`}
          renderItem={({ item: imageUri }) => (
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          )}
          listKey={`service-images-${serviceDetails.serviceId}`}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{serviceDetails.title}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardPrice}>{serviceDetails.priceType === 'hourly' ? `${serviceDetails.price} TND/hr` : `${serviceDetails.price} TND`}</Text>
            <Text style={styles.cardDelivery}>{serviceDetails.deliveryTime}</Text>
          </View>
        </View>

        <View style={styles.groupDivider} />

        <View style={styles.bookingListContainer}>
          <Text style={styles.bookingListHeader}>Bookings for this service ({bookingsInGroup.length})</Text>
          {bookingsInGroup.map(booking => renderIndividualBookingItem(booking))}
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Provider Bookings</Text>
      </View>

      <View style={styles.mainContentWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#B78BFA" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : groupedBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You have no bookings yet.</Text>
          </View>
        ) : (
          <FlatList
            data={groupedBookings}
            keyExtractor={item => item.serviceId}
            renderItem={renderServiceGroupItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%', maxWidth: 350 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2D1B5A' }}>Reject Booking</Text>
            <Text style={{ fontSize: 15, color: '#444', marginBottom: 12 }}>Please provide a reason for rejection (optional):</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 18 }}
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#E0E0E0', marginRight: 6 }}>
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitRejection} style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#EF4444' }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Submit Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F4EBFF',
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F4EBFF',
  },
  loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#5A31F4'
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
  listContainer: {
    padding: 20,
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
    height: 160,
  },
  cardContent: {
    padding: 15,
    paddingBottom: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
    marginBottom: 8,
  },
  cardUsername: {
    fontSize: 14, 
    color: '#5A31F4',
    fontWeight: '600',
    marginBottom: 8,
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
  groupDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
    marginVertical: 10,
  },
  bookingListContainer: {
    paddingHorizontal: 15, 
    paddingBottom: 10,
  },
  bookingListHeader: {
      fontSize: 15,
      fontWeight: '600',
      color: '#4A5568',
      marginBottom: 10,
      marginTop: 5,
  },
  bookingListItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
   bookingUserText: {
       fontSize: 14,
       fontWeight: '500',
       color: '#2D3748',
   },
   statusBadgeSmall: {
       paddingHorizontal: 6,
       paddingVertical: 3,
       borderRadius: 10,
       marginLeft: 8,
   },
   statusTextSmall: {
       color: '#fff',
       fontSize: 9,
       fontWeight: 'bold',
   },
   bookingDateText: {
       fontSize: 12,
       color: '#718096',
       marginTop: 2,
       marginBottom: 8,
   },
   individualBookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 4,
   },
   actionButtonSmall: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonTextSmall: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
  },
  finalBookingStatusText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6B7280',
      paddingVertical: 5,
  },
  confirmButton: { backgroundColor: '#10B981' },
  inProgressButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  completeButton: { backgroundColor: '#3B82F6' },
  messageContainer: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
  chatButton: {
    backgroundColor: '#5A31F4',
  },
});