import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser, updateUserProfile, uploadDocument, uploadProfileImage } from '../database/authDatabase';
import { db } from '../database/firebaseConfig';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [services, setServices] = useState([]);
  const [toDeleteServices, setToDeleteServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) return;
      setUser(u);
      setFullName(u.fullName || '');
      setBio(u.bio || '');
      setPhone(u.phone || '');
      setUploads(u.documents || []);
      if (u.profileImage) setProfileImageUri(u.profileImage);

      const q = query(collection(db, 'services'), where('userId', '==', u.uid));
      const snap = await getDocs(q);
      const userServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(userServices);
    })();
  }, []);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setProfileImageUri(res.assets[0].uri);
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      const asset = res.assets[0];
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(asset.name);
      let uri = asset.uri;
      if (isImage) {
        // Copy image to cache directory for accessibility
        const newPath = `${FileSystem.cacheDirectory}${asset.name}`;
        try {
          await FileSystem.copyAsync({ from: asset.uri, to: newPath });
          uri = newPath;
        } catch (e) {
          // fallback to original uri if copy fails
        }
        // Ensure uri starts with file://
        if (!uri.startsWith('file://')) {
          uri = 'file://' + uri;
        }
        // Log for debugging
        console.log('Image preview URI:', uri);
      }
      setUploads(prev => [...prev, { name: asset.name, uri }]);
    }
  };

  const removeUpload = (index) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteService = (serviceId) => {
    setToDeleteServices(prev => [...prev, serviceId]);
    setServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) return Alert.alert('Full name is required.');

    setLoading(true);
    try {
      let profileUrl = user.profileImage || '';
      if (profileImageUri && profileImageUri !== user.profileImage) {
        profileUrl = await uploadProfileImage(profileImageUri, user.uid);
      }

      const uploadedDocs = [];
      for (let { name, uri, url } of uploads) {
        if (url) {
          uploadedDocs.push({ name, url });
        } else {
          const realUri = Platform.OS === 'android' && uri.startsWith('content://')
            ? (await FileSystem.copyAsync({ from: uri, to: `${FileSystem.cacheDirectory}${name}` }), `${FileSystem.cacheDirectory}${name}`)
            : uri;
          const uploadedUrl = await uploadDocument(realUri, user.uid, name);
          if (uploadedUrl) uploadedDocs.push({ name, url: uploadedUrl });
        }
      }

      // Only delete now
      for (let id of toDeleteServices) {
        await deleteDoc(doc(db, 'services', id));
      }

      await updateUserProfile(user.uid, {
        fullName,
        bio,
        phone,
        profileImage: profileUrl,
        documents: uploadedDocs,
      });

      Alert.alert('✅ Profile Updated');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4EBFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#5A31F4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
          <Image
            source={profileImageUri ? { uri: profileImageUri } : require('../assets/Avatar_placeholder.png')}
            style={styles.avatar}
          />
          <Text style={styles.editAvatar}>Change Photo</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} multiline />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>

        <Text style={styles.subheading}>Documents</Text>
        <View style={styles.section}>
          <TouchableOpacity onPress={pickDocument} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Add Document</Text>
          </TouchableOpacity>

          {uploads.map((doc, index) => {
            const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.name);
            const hasError = imageLoadErrors[index];
            // Prefer url (uploaded), then uri (local image), else show filename
            if (isImage && doc.url) {
              return (
                <View key={index} style={styles.docImageContainer}>
                  <View style={styles.docImageWrapper}>
                    <Image
                      source={{ uri: doc.url }}
                      style={styles.docImageLarge}
                      resizeMode="cover"
                      onError={() => setImageLoadErrors(prev => ({ ...prev, [index]: true }))}
                    />
                  </View>
                  <View style={styles.docRemoveRow}>
                    <TouchableOpacity onPress={() => removeUpload(index)} style={styles.removeButton}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            } else if (isImage && doc.uri && !hasError) {
              return (
                <View key={index} style={styles.docImageContainer}>
                  <View style={styles.docImageWrapper}>
                    <Image
                      source={{ uri: doc.uri }}
                      style={styles.docImageLarge}
                      resizeMode="cover"
                      onError={() => setImageLoadErrors(prev => ({ ...prev, [index]: true }))}
                    />
                  </View>
                  <View style={styles.docRemoveRow}>
                    <TouchableOpacity onPress={() => removeUpload(index)} style={styles.removeButton}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            } else {
              return (
                <View key={index} style={styles.docRow}>
                  <Text style={styles.docText} numberOfLines={1} ellipsizeMode="middle">{doc.name}</Text>
                  <View style={styles.docRemoveRow}>
                    <TouchableOpacity onPress={() => removeUpload(index)} style={styles.removeButton}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
          })}
        </View>

        <Text style={styles.subheading}>Your Services</Text>
        <View style={styles.section}>
          {services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              {service.images && service.images.length > 0 && (
                <Image source={{ uri: service.images[0] }} style={styles.serviceImage} />
              )}
              <View style={styles.serviceCardContent}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceCategory}>{service.category}</Text>
                <Text style={styles.serviceProvider}>by {user?.username || 'You'}</Text>
                <View style={styles.serviceCardRow}>
                  <Text style={styles.servicePrice}>{service.priceType === 'hourly' ? `${service.price} TND/hr` : `${service.price} TND`}</Text>
                  <Text style={styles.serviceDelivery}>{service.deliveryTime}</Text>
                </View>
                <View style={styles.serviceRatingRow}>
                  <MaterialIcons name="star" size={16} color="#C4B5FD" />
                  <Text style={styles.serviceRatingText}>{typeof service.rating === 'number' ? service.rating.toFixed(1) : 'N/A'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteService(service.id)} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editAvatar: {
    marginTop: 8,
    color: '#B78BFA',
    fontSize: 16,
    fontWeight: '600',
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
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2D1B5A',
    marginTop: 8,
  },
  outlineButton: {
    backgroundColor: '#B78BFA',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  outlineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docText: {
    fontSize: 15,
    color: '#374151',
  },
  docRemoveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  removeText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  docImageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    padding: 16,
  },
  docImageWrapper: {
    width: 120,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    marginBottom: 8,
  },
  docImageLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
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
    height: 120,
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
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#B78BFA',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 50,
    alignItems: 'center',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
