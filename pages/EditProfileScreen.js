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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser, updateUserProfile, uploadDocument, uploadProfileImage } from '../database/authDatabase';
import { db } from '../database/firebaseConfig';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

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
      setUploads(prev => [...prev, { name: asset.name, uri: asset.uri }]);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Edit Profile</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
        <Image
          source={profileImageUri ? { uri: profileImageUri } : require('../assets/Avatar_placeholder.png')}
          style={styles.avatar}
        />
        <Text style={styles.editAvatar}>Change Photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} multiline />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>Documents</Text>
      <TouchableOpacity onPress={pickDocument} style={styles.outlineButton}>
        <Text style={styles.outlineButtonText}>Add Document</Text>
      </TouchableOpacity>

      {uploads.map((doc, index) => (
        <View key={index} style={styles.docRow}>
          <Text>{doc.name}</Text>
          <TouchableOpacity onPress={() => removeUpload(index)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.label}>Your Services</Text>
      {services.map((service) => (
        <View key={service.id} style={styles.serviceRow}>
          <Text>{service.title}</Text>
          <TouchableOpacity onPress={() => handleDeleteService(service.id)}>
            <Text style={styles.removeText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F4EBFF' },
  heading: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  avatarWrapper: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editAvatar: { marginTop: 8, color: '#5A31F4' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12, color: '#333' },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginTop: 4 },
  outlineButton: {
    borderColor: '#5A31F4', borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginVertical: 10
  },
  outlineButtonText: { color: '#5A31F4', fontWeight: '600' },
  docRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff',
    padding: 10, marginVertical: 4, borderRadius: 8
  },
  removeText: { color: 'red', fontWeight: 'bold' },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff',
    padding: 12, marginVertical: 6, borderRadius: 8
  },
  saveButton: {
    backgroundColor: '#5A31F4', padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center'
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
