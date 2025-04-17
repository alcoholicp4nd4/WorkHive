import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking
} from 'react-native';
import { getCurrentUser } from '../database/authDatabase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { useNavigation } from '@react-navigation/native';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Your Profile</Text>

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

      <Text style={styles.subheading}>Your Services</Text>
      {loading ? (
        <ActivityIndicator color="#B78BFA" size="large" />
      ) : services.length > 0 ? (
        <View style={styles.serviceList}>
          {services.map((service, i) => (
            <TouchableOpacity
              key={i}
              style={styles.serviceCard}
              onPress={() => navigation.navigate('ServiceDetails', { service })}
            >
              {service.images && service.images.length > 0 && (
                <Image source={{ uri: service.images[0] }} style={styles.serviceImage} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceDesc}>{service.description}</Text>
                <Text style={styles.serviceInfo}>Price: ${service.price}</Text>
                <Text style={styles.serviceInfo}>Delivery: {service.deliveryTime} days</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F4EBFF',
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 20,
    textAlign: 'center'
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#eee'
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#333'
  },
  value: {
    fontSize: 15,
    color: '#555',
    marginBottom: 6
  },
  subheading: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B5A',
    marginBottom: 10
  },
  docsGrid: {
    marginBottom: 12
  },
  docItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1
  },
  docText: {
    color: '#444',
    fontSize: 14,
    marginBottom: 4
  },
  download: {
    color: '#5A31F4',
    fontWeight: 'bold'
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12
  },
  docImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10
  },
  noText: {
    color: '#777'
  },
  serviceList: {
    marginTop: 10
  },
  serviceCard: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10
  },
  serviceTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  serviceDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4
  },
  serviceInfo: {
    fontSize: 12,
    color: '#999'
  },
  error: {
    padding: 20,
    color: 'red',
    fontSize: 16
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
    elevation: 2
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
  
});
