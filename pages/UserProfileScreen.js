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
  Platform
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
      } catch (err) {
        console.error("❌ Error loading services:", err);
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
          <Text style={styles.serviceRatingText}>{getDisplayRating(service)}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
        <View style={styles.section}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{user.fullName || '—'}</Text>
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
        <View style={styles.imageGrid}>
          {imageDocs.length > 0 ? imageDocs.map((img, index) => (
            <Image key={index} source={{ uri: img.url }} style={styles.docImage} />
          )) : <Text style={styles.noText}>No image files</Text>}
        </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 0,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
    flex: 1,
    textAlign: 'center',
    marginRight: 32, // To center title with back button
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
    marginBottom: 20,
    backgroundColor: '#eee',
    borderWidth: 4,
    borderColor: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#333',
  },
  value: {
    fontSize: 14,
    color: '#555',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2D1B5A',
  },
  docsGrid: {
    marginBottom: 12,
  },
  docItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  docText: {
    color: '#444',
    fontSize: 14,
    marginBottom: 4,
  },
  download: {
    color: '#5A31F4',
    fontWeight: 'bold',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  docImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  noText: {
    color: '#777',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5A31F4',
    marginBottom: 16,
  },
  serviceList: {
    marginTop: 0,
    marginBottom: 20,
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
    height: 160,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#eee',
  },
  serviceCardContent: {
    padding: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#B78BFA',
    fontWeight: '600',
    marginBottom: 8,
  },
  serviceProvider: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  serviceCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B5A',
  },
  serviceDelivery: {
    fontSize: 13,
    color: '#666',
  },
  serviceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  serviceRatingText: {
    marginLeft: 4,
    color: '#333',
    fontWeight: '500',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: '#5A31F4',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 50,
    alignSelf: 'center',
    width: '100%',
    elevation: 2,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    padding: 20,
    color: 'red',
    fontSize: 16,
  },
});
