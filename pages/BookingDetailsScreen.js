import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Clock, Calendar, MapPin, User, Landmark, AlertCircle, Flag } from 'lucide-react-native';
import ServiceRating from '../Components/ServiceRating';
import { sendNotification } from '../utils/notificationUtils';

export default function BookingDetailsScreen({ route }) {
  const { bookingId, serviceId, providerId } = route.params;
  const [booking, setBooking] = useState(null);
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // Fetch booking details
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        if (bookingDoc.exists()) {
          setBooking(bookingDoc.data());
        }

        // Fetch service details
        const serviceDoc = await getDoc(doc(db, 'services', serviceId));
        if (serviceDoc.exists()) {
          setService(serviceDoc.data());
        }

        // Fetch provider details
        const providerDoc = await getDoc(doc(db, 'users', providerId));
        if (providerDoc.exists()) {
          setProvider(providerDoc.data());
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        Alert.alert('Error', 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, serviceId, providerId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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

  const formatLocation = (location) => {
    if (!location) return 'N/A';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      if (location.latitude && location.longitude) {
        return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      }
      if (location.address) return location.address;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Booking Details</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {service?.images?.[0] && (
          <Image 
            source={{ uri: service.images[0] }} 
            style={styles.serviceImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.contentPadding}>
          <View style={styles.titleSection}>
            <Text style={styles.serviceTitle}>{service?.title || 'Service Title N/A'}</Text>
            {booking?.status && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
                </View>
            )}
          </View>

          <View style={styles.cardStyle}> 
            <Text style={styles.cardHeader}>Booking Information</Text>
            <View style={styles.infoRow}>
              <Calendar size={18} color="#5A31F4" />
              <Text style={styles.infoLabel}>Booked on:</Text>
              <Text style={styles.infoValue}>{formatDate(booking?.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color="#5A31F4" />
              <Text style={styles.infoLabel}>Delivery:</Text>
              <Text style={styles.infoValue}>{service?.deliveryTime || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Landmark size={18} color="#5A31F4" /> 
              <Text style={styles.infoLabel}>Price:</Text>
              <Text style={styles.infoValue}>{service?.price ? `${service.price} TND` : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={18} color="#5A31F4" />
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{formatLocation(service?.location)}</Text>
            </View>
            <View style={styles.infoRow}>
              <User size={18} color="#5A31F4" />
              <Text style={styles.infoLabel}>Provider:</Text>
              <Text style={styles.infoValue}>{provider?.username || 'N/A'}</Text>
            </View>
          </View>

          {service?.description && (
            <View style={styles.cardStyle}>
              <Text style={styles.cardHeader}>Service Description</Text>
              <Text style={styles.descriptionText}>{service.description}</Text>
            </View>
          )}

          {booking?.status === 'completed' && (
            <View style={styles.cardStyle}>
              <ServiceRating 
                serviceId={serviceId} 
                onRatingSubmit={(rating) => {
                  Alert.alert('Success', 'Thank you for your rating!');
                }}
              />
            </View>
          )}

          <View style={styles.cardStyle}> 
            <Text style={styles.cardHeader}>Cancellation Policy</Text>
            <View style={styles.policyContainer}>
              <AlertCircle size={20} color="#F59E0B" style={{marginRight: 8}}/>
              <Text style={styles.policyText}>
                You can cancel this booking within 24 hours of making it. After that, the cancellation period will expire.
              </Text>
            </View>
          </View>

          <View style={styles.actionButtonsContainer}>
            {booking?.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.buttonBase, styles.cancelButton]}
                onPress={() => {
                  Alert.alert(
                    'Cancel Booking',
                    'Are you sure you want to cancel this booking?',
                    [
                      { text: 'No', style: 'cancel' },
                      { 
                        text: 'Yes', 
                        onPress: async () => {
                          try {
                            // Update booking status to cancelled
                            await updateDoc(doc(db, 'bookings', bookingId), {
                              status: 'cancelled'
                            });

                            // Send notification to provider
                            await sendNotification(
                              providerId,
                              'status_update',
                              `Booking for "${service?.title}" has been cancelled by the customer.`,
                              bookingId
                            );

                            navigation.goBack();
                          } catch (error) {
                            console.error('Error cancelling booking:', error);
                            Alert.alert('Error', 'Failed to cancel the booking.');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={[styles.buttonTextBase, styles.cancelButtonText]}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.buttonBase, styles.reportButton]}
              onPress={() => navigation.navigate('ReportForm', {
                bookingId,
                serviceId,
                providerId
              })}
            >
              <Flag size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={[styles.buttonTextBase, styles.reportButtonText]}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF', // Themed background for content area
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
    padding: 8, // Increased touch area
    marginRight: 12, // Spacing from title
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A', // Themed text color
  },
  scrollContainer: {
    flex: 1,
    // backgroundColor is inherited from safeArea or can be set if different needed for scroll part
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4EBFF', // Match theme
  },
  loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#5A31F4' // Themed loading text
  },
  serviceImage: {
    width: '100%',
    height: 220, // Standardized image height
    marginBottom: 16,
  },
  contentPadding: {
    paddingHorizontal: 16,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8, // Add some padding around title and badge
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B5A',
    flexShrink: 1, // Allow title to shrink
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15, // Rounded badge
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11, // Slightly smaller
  },
  cardStyle: { // New style for sections to look like cards
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05, // Softer shadow
    shadowRadius: 2.00,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B5A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    marginLeft: 10,
    fontSize: 15,
    color: '#4A5568', // Subtler label color
    marginRight: 5,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#2D3748', // Darker value text
    flexShrink: 1, // Allow text to shrink
  },
  descriptionText: { // Renamed from description for clarity
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22, // Improved readability
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7', // Lighter yellow for info/warning
    padding: 12,
    borderRadius: 8,
  },
  policyText: {
    marginLeft: 8,
    flex: 1,
    color: '#78350F', // Darker text for readability on yellow
    fontSize: 14,
  },
  actionButtonsContainer: { // Renamed from actionButtons
    marginTop: 16, // Add space above buttons
    marginBottom: 24, // Add space below buttons
    gap: 12, 
  },
  buttonBase: { // Base style for all buttons
    paddingVertical: 14, // Consistent padding
    borderRadius: 10, // Consistent border radius
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.00,
    elevation: 3,
  },
  buttonTextBase: { // Base style for button text
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#FEE2E2', // Lighter red for inactive state feel
    borderWidth: 1,
    borderColor: '#DC2626' // Red border
  },
  cancelButtonText: {
      color: '#DC2626', // Red text
  },
  reportButton: {
    backgroundColor: '#5A31F4', // Primary app color
  },
  reportButtonText: {
      color: '#FFFFFF', // White text
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 