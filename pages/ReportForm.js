import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, Upload } from 'lucide-react-native';

const ISSUE_TYPES = [
  'Service Quality',
  'Provider Behavior',
  'Payment Issues',
  'Safety Concerns',
  'Other'
];

export default function ReportForm({ route, navigation }) {
  const { bookingId, serviceId, providerId } = route.params;
  const [issueType, setIssueType] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingReport, setHasExistingReport] = useState(false);

  useEffect(() => {
    checkExistingReport();
  }, []);

  const checkExistingReport = async () => {
    try {
      const reportsRef = collection(db, 'reports');
      const q = query(reportsRef, where('bookingId', '==', bookingId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setHasExistingReport(true);
        Alert.alert(
          'Report Already Submitted',
          'You have already submitted a report for this booking.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking existing report:', error);
      Alert.alert('Error', 'Failed to check existing reports');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to allow access to photos to add an image.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to allow access to camera to take a photo.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (hasExistingReport) {
      Alert.alert('Error', 'You have already submitted a report for this booking.');
      return;
    }

    if (!issueType || !issueDetails || !description) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        bookingId,
        serviceId,
        providerId,
        issueType,
        issueDetails,
        description,
        imageUrl: image,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reports'), reportData);
      Alert.alert('Success', 'Your report has been submitted successfully.');
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (hasExistingReport) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <X size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Submit Report</Text>
          </View>
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              You have already submitted a report for this booking.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <X size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Report</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Issue Type *</Text>
          <View style={styles.issueTypes}>
            {ISSUE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.issueTypeButton,
                  issueType === type && styles.selectedIssueType,
                ]}
                onPress={() => setIssueType(type)}
              >
                <Text
                  style={[
                    styles.issueTypeText,
                    issueType === type && styles.selectedIssueTypeText,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Issue Details *</Text>
          <TextInput
            style={styles.input}
            placeholder="Briefly describe the issue"
            value={issueDetails}
            onChangeText={setIssueDetails}
            multiline
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide more details about the issue"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Add Image (Optional)</Text>
          <View style={styles.imageContainer}>
            {image ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => setImage(null)}
                >
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                >
                  <Upload size={24} color="#666" />
                  <Text style={styles.imageButtonText}>Upload Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={takePhoto}
                >
                  <Camera size={24} color="#666" />
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  issueTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  issueTypeButton: {
    padding: 8,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  selectedIssueType: {
    backgroundColor: '#B78BFA',
  },
  issueTypeText: {
    color: '#666',
  },
  selectedIssueTypeText: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  imageContainer: {
    marginBottom: 24,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  imageButtonText: {
    marginTop: 8,
    color: '#666',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#B78BFA',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 