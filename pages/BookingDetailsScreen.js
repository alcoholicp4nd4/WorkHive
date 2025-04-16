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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Clock, Calendar, MapPin, User, DollarSign, AlertCircle, Flag } from 'lucide-react-native';

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading booking details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
        </View>

        {/* Service Image */}
        {service?.images?.[0] && (
          <Image 
            source={{ uri: service.images[0] }} 
            style={styles.serviceImage}
            resizeMode="cover"
          />
        )}

        {/* Service Title */}
        <View style={styles.section}>
          <Text style={styles.serviceTitle}>{service?.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking?.status) }]}>
            <Text style={styles.statusText}>{booking?.status?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Booking Information */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Clock size={20} color="#6B7280" />
            <Text style={styles.infoText}>Booked on: {formatDate(booking?.createdAt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.infoText}>Delivery Time: {service?.deliveryTime}</Text>
          </View>

          <View style={styles.infoRow}>
            <DollarSign size={20} color="#6B7280" />
            <Text style={styles.infoText}>Price: ${service?.price}</Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.infoText}>Location: {service?.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <User size={20} color="#6B7280" />
            <Text style={styles.infoText}>Provider: {provider?.username}</Text>
          </View>
        </View>

        {/* Service Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Description</Text>
          <Text style={styles.description}>{service?.description}</Text>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
          <View style={styles.policyContainer}>
            <AlertCircle size={20} color="#F59E0B" />
            <Text style={styles.policyText}>
              You can cancel this booking within 24 hours of making it. After that, the cancellation period will expire.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {booking?.status === 'pending' && (
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                Alert.alert(
                  'Cancel Booking',
                  'Are you sure you want to cancel this booking?',
                  [
                    { text: 'No', style: 'cancel' },
                    { 
                      text: 'Yes', 
                      onPress: () => {
                        // Add cancel booking logic here
                        navigation.goBack();
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.button, styles.reportButton]}
            onPress={() => navigation.navigate('ReportForm', {
              bookingId,
              serviceId,
              providerId
            })}
          >
            <Flag size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  serviceImage: {
    width: '100%',
    height: 200,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoContainer: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4B5563',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
  },
  policyText: {
    marginLeft: 8,
    flex: 1,
    color: '#92400E',
    fontSize: 14,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  reportButton: {
    backgroundColor: '#F59E0B',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 