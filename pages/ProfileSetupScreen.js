import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import {
  getCurrentUser,
  uploadProfileImage,
  uploadDocument,
  updateUserProfile,
} from '../database/authDatabase';

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [uploads, setUploads] = useState([]); // { name, uri }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) navigation.replace('Login');
      else setUser(u);
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Photo access is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setProfileImageUri(res.assets[0].uri);
  };

  const pickDocument = async () => {
    if (loading) return;
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!res.canceled && res.assets?.length > 0) {
      const asset = res.assets[0];
      setUploads((prev) => [...prev, { name: asset.name, uri: asset.uri }]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) return Alert.alert('Full name is required.');
    setLoading(true);
    try {
      let profileUrl = null;
      if (profileImageUri) {
        profileUrl = await uploadProfileImage(profileImageUri, user.uid);
        if (!profileUrl) throw new Error('Profile image upload failed');
      }

      const uploadedDocs = [];
      for (let { name, uri } of uploads) {
        let uploadUri = uri;
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
          const dest = `${FileSystem.cacheDirectory}${name}`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uploadUri = dest;
        }
        const url = await uploadDocument(uploadUri, user.uid, name);
        if (url) uploadedDocs.push({ name, url });
      }

      const payload = {
        fullName,
        bio,
        phone,
        profileImage: profileUrl || '',
        documents: uploadedDocs,
      };

      const success = await updateUserProfile(user.uid, payload);
      if (!success) throw new Error('Failed to update profile');
      Alert.alert('✅ Success', 'Profile setup complete!');
      navigation.replace('MainApp');
    } catch (err) {
      console.error('🚨 Profile Setup Error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Set Up Your Profile</Text>

          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
            <Image
              source={
                profileImageUri
                  ? { uri: profileImageUri }
                  : require('../assets/Avatar_placeholder.png')
              }
              style={styles.avatar}
            />
            <Text style={styles.avatarText}>Tap to change photo</Text>
          </TouchableOpacity>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Jane Doe"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#aaa"
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +1 555 1234"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Documents / Certificates</Text>
          <TouchableOpacity style={styles.outlineButton} onPress={pickDocument} disabled={loading}>
            <Text style={styles.outlineButtonText}>Add File</Text>
          </TouchableOpacity>
          {uploads.map((doc, i) => (
            <Text key={i} style={styles.docItem}>• {doc.name}</Text>
          ))}

          {loading ? (
            <ActivityIndicator color="#C89BFF" size="large" style={{ marginTop: 30 }} />
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1B1129',
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DAB4FF',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    marginBottom: 8,
  },
  avatarText: {
    color: '#AAA',
    fontSize: 14,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#DDD',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2C1D3B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3F2C5C',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#3F2C5C',
    marginVertical: 25,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#C89BFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  outlineButtonText: {
    color: '#C89BFF',
    fontSize: 16,
    fontWeight: '600',
  },
  docItem: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#C89BFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  saveButtonText: {
    color: '#1B1129',
    fontSize: 18,
    fontWeight: '700',
  },
});
