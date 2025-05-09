import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  Dimensions
} from 'react-native';
import { getCurrentUser } from '../database/authDatabase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MaterialIcons } from '@expo/vector-icons';

export default function UserProfileScreen() {
  const [user, setUser] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [avgRating, setAvgRating] = useState('N/A');
  const [serviceRatings, setServiceRatings] = useState({});
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) return;
      setUser(u);

      try {
        const q = query(collection(db, 'services'), where('userId', '==', u.uid));
        const snap = await getDocs(q);
        const userServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(userServices);
        // Fetch ratings for these services (for provider avg and per-service avg)
        const serviceIds = userServices.map(s => s.id);
        let allRatings = [];
        if (serviceIds.length > 0) {
          for (let i = 0; i < serviceIds.length; i += 10) {
            const batchIds = serviceIds.slice(i, i + 10);
            const batchQuery = query(collection(db, 'ratings'), where('serviceId', 'in', batchIds));
            const ratingsSnap = await getDocs(batchQuery);
            allRatings = allRatings.concat(ratingsSnap.docs.map(doc => doc.data()));
          }
          // Provider avg
          const ratingValues = allRatings.map(r => parseFloat(r.rating)).filter(r => !isNaN(r));
          if (ratingValues.length > 0) {
            setAvgRating((ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length).toFixed(1));
          } else {
            setAvgRating('N/A');
          }
          // Per-service avg
          const ratingsByService = {};
          serviceIds.forEach(id => {
            const ratings = allRatings.filter(r => r.serviceId === id).map(r => parseFloat(r.rating)).filter(r => !isNaN(r));
            ratingsByService[id] = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : 'N/A';
          });
          setServiceRatings(ratingsByService);
        } else {
          setAvgRating('N/A');
          setServiceRatings({});
        }
      } catch (err) {
        console.error("❌ Error loading services or ratings:", err);
        setAvgRating('N/A');
        setServiceRatings({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!user) return <Text style={styles.error}>User not found</Text>;

  const imageDocs = user?.documents?.filter(doc => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.name)) || [];
  const otherDocs = user?.documents?.filter(doc => !/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.name)) || [];

  // Helper for rating (if you want to add ratings to service cards)
  const getDisplayRating = (service) => (
    typeof service.rating === 'number' ? service.rating.toFixed(1) : 'N/A'
  );

  const renderServiceCard = (service) => (
    <TouchableOpacity
      key={service.id}
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetails', { service })}
      activeOpacity={0.9}
    >
      {service.images && service.images.length > 0 && (
        <Image source={{ uri: service.images[0] }} style={styles.serviceImage} />
      )}
      <View style={styles.serviceCardContent}>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceCategory}>{service.category}</Text>
        <Text style={styles.serviceProvider}>by {user.username}</Text>
        <View style={styles.serviceCardRow}>
          <Text style={styles.servicePrice}>{service.priceType === 'hourly' ? `${service.price} TND/hr` : `${service.price} TND`}</Text>
          <Text style={styles.serviceDelivery}>{service.deliveryTime}</Text>
        </View>
        <View style={styles.serviceRatingRow}>
          <Icon name="star" size={16} color="#C4B5FD" />
          <Text style={styles.serviceRatingText}>{serviceRatings[service.id] || 'N/A'}</Text>
        </View>
        <Text style={styles.serviceDesc}>{service.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderImagePreview = () => (
    <Modal
      visible={!!selectedImage}
      transparent={true}
      onRequestClose={() => setSelectedImage(null)}
    >
      <TouchableOpacity 
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={() => setSelectedImage(null)}
      >
        <Image
          source={{ uri: selectedImage }}
          style={styles.modalImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4EBFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#5A31F4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={user.profileImage ? { uri: user.profileImage } : require('../assets/Avatar_placeholder.png')}
          style={styles.avatar}
        />
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Icon name="star" size={20} color="#C4B5FD" />
            <Text style={{ marginLeft: 6, color: '#374151', fontWeight: '600', fontSize: 16 }}>{avgRating}</Text>
          </View>
          <Text style={{ color: '#888', fontSize: 14 }}>Provider Rating</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{user.fullName || '—'}</Text>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username || '—'}</Text>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.value}>{user.bio || '—'}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user.phone || '—'}</Text>
        </View>
        <Text style={styles.subheading}>Documents</Text>
        <View style={styles.docsGrid}>
          {otherDocs.length > 0 ? otherDocs.map((doc, index) => (
            <View key={index} style={styles.docItem}>
              <Text style={styles.docText}>{doc.name}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(doc.url)}>
                <Text style={styles.download}>Download</Text>
              </TouchableOpacity>
            </View>
          )) : <Text style={styles.noText}>No document files</Text>}
        </View>
        <Text style={styles.subheading}>Images</Text>
        <View style={styles.imagesSection}>
          {imageDocs.length > 0 ? (
            <View style={styles.imageGrid}>
              {imageDocs.map((img, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => setSelectedImage(img.url)}
                  style={styles.imageContainer}
                >
                  <Image source={{ uri: img.url }} style={styles.docImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noText}>No image files</Text>
          )}
        </View>
        {renderImagePreview()}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Your Services</Text>
        {loading ? (
          <ActivityIndicator color="#B78BFA" size="large" />
        ) : services.length > 0 ? (
          <View style={styles.serviceList}>
            {services.map(renderServiceCard)}
          </View>
        ) : (
          <Text style={styles.noText}>No services listed.</Text>
        )}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfileScreen', { user })}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');
const imageSize = (width - 44) / 2; // 44 = container padding (16) * 2 + gap between images (12)

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 0,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
  },
  container: {
    padding: 20,
    backgroundColor: '#F4EBFF',
    paddingBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: '#eee',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2D1B5A',
    marginTop: 8,
  },
  docsGrid: {
    marginBottom: 16,
  },
  docItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docText: {
    color: '#374151',
    fontSize: 15,
    marginBottom: 6,
  },
  download: {
    color: '#B78BFA',
    fontWeight: '600',
    fontSize: 15,
  },
  imagesSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  imageContainer: {
    width: '48%',
    paddingBottom: '48%', // This creates a square aspect ratio
    position: 'relative',
    marginBottom: 12,
  },
  docImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noText: {
    color: '#6B7280',
    marginBottom: 12,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 20,
  },
  serviceList: {
    marginTop: 0,
    marginBottom: 24,
  },
  serviceCard: {
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
  serviceImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#eee',
  },
  serviceCardContent: {
    padding: 20,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 6,
  },
  serviceCategory: {
    fontSize: 15,
    color: '#B78BFA',
    fontWeight: '600',
    marginBottom: 8,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  serviceCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  servicePrice: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D1B5A',
  },
  serviceDelivery: {
    fontSize: 14,
    color: '#6B7280',
  },
  serviceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  serviceRatingText: {
    marginLeft: 6,
    color: '#374151',
    fontWeight: '500',
    fontSize: 15,
  },
  serviceDesc: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 15,
  },
  editButton: {
    backgroundColor: '#B78BFA',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 50,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    padding: 20,
    color: 'red',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: height * 0.8,
  },
});
