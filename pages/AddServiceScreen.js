import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

export default function AddServiceScreen() {
  // Basic service fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [serviceType, setServiceType] = useState('remote');
  const [priceType, setPriceType] = useState('flat');
  const [price, setPrice] = useState('');
  // Delivery time is now split into a numeric value and a unit.
  const [deliveryTimeValue, setDeliveryTimeValue] = useState('');
  const [deliveryTimeUnit, setDeliveryTimeUnit] = useState('days'); // default unit

  const [images, setImages] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // DropDownPicker state for categories
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([
    { label: '--Tech--', value: 'tech-label', disabled: true },
    { label: 'Web Development', value: 'web-development' },
    { label: 'Mobile App Development', value: 'mobile-app-development' },
    { label: 'Software Engineering', value: 'software-engineering' },
    { label: 'UI/UX Design', value: 'ui-ux-design' },
    { label: 'QA Testing', value: 'qa-testing' },
    { label: 'Game Development', value: 'game-development' },
    { label: 'DevOps & Cloud', value: 'devops-cloud' },
  
    { label: '--Design--', value: 'design-label', disabled: true },
    { label: 'Graphic Design', value: 'graphic-design' },
    { label: 'Logo Design', value: 'logo-design' },
    { label: 'Animation', value: 'animation' },
    { label: 'Video Editing', value: 'video-editing' },
    { label: 'Photography', value: 'photography' },
    { label: 'Branding & Identity', value: 'branding' },
    { label: 'Illustration', value: 'illustration' },
  
    { label: '--Business--', value: 'business-label', disabled: true },
    { label: 'SEO Optimization', value: 'seo' },
    { label: 'Digital Marketing', value: 'digital-marketing' },
    { label: 'Social Media Management', value: 'social-media' },
    { label: 'Email Marketing', value: 'email-marketing' },
    { label: 'Copywriting', value: 'copywriting' },
    { label: 'Business Consulting', value: 'business-consulting' },
    { label: 'Sales Strategy', value: 'sales-strategy' },
  
    { label: '--Local--', value: 'local-label', disabled: true },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Electrical Work', value: 'electrical' },
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Moving Services', value: 'moving' },
    { label: 'Handyman Services', value: 'handyman' },
    { label: 'Pest Control', value: 'pest-control' },
    { label: 'Landscaping', value: 'landscaping' },
  
    { label: '--Education--', value: 'education-label', disabled: true },
    { label: 'Tutoring', value: 'tutoring' },
    { label: 'Language Teaching', value: 'language-teaching' },
    { label: 'Life Coaching', value: 'life-coaching' },
    { label: 'Career Coaching', value: 'career-coaching' },
    { label: 'Test Preparation', value: 'test-prep' },
  
    { label: '--Wellness--', value: 'wellness-label', disabled: true },
    { label: 'Fitness Training', value: 'fitness-training' },
    { label: 'Yoga Instruction', value: 'yoga' },
    { label: 'Therapy & Counseling', value: 'therapy' },
    { label: 'Nutrition Planning', value: 'nutrition' },
    { label: 'Beauty & Skincare', value: 'beauty' },
    { label: 'Hair Styling', value: 'hair-styling' },
  
    { label: '--Other--', value: 'other-label', disabled: true },
    { label: 'Event Planning', value: 'event-planning' },
    { label: 'Virtual Assistance', value: 'virtual-assistance' },
    { label: 'Data Entry', value: 'data-entry' },
    { label: 'Translation Services', value: 'translation' },
    { label: 'Custom Orders', value: 'custom-orders' },
  ]);

  // Location & radius state for service availability
  const [locationService, setLocationService] = useState(null);
  const [radiusService, setRadiusService] = useState(5);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUsername(user.username);
        if (!user.isProvider) {
          Alert.alert("Access Denied", "Only service providers can add services.");
        }
      }
    };
    fetchUser();
  }, []);

  // Image picker and upload functions remain the same
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.Images,
      allowsEditing: true,
      quality: 0.5,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const uploadImages = async () => {
    const uploadedURLs = [];
    for (const uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      const formData = new FormData();
      formData.append('key', '590d8c2489661a30ea77153c3d94cb7e'); // Replace with your API key
      formData.append('image', base64);
      const res = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        uploadedURLs.push(json.data.url);
      } else {
        console.warn('Upload failed:', json);
      }
    }
    return uploadedURLs;
  };

  // Helper to get current location for the map modal
  const handleGetCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Permission to access location was denied.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setMapRegion(region);
    setLocationService({ latitude: region.latitude, longitude: region.longitude });
  };

  // Validate that price is a valid number and delivery time is an integer.
  // Construct a combined deliveryTime string with unit.
  const handleSubmit = async () => {
    if (!title || !description || !category || !price || !deliveryTimeValue) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }
    // Validate price: must be a valid number.
    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber)) {
      Alert.alert('Invalid Price', 'Please enter a valid number for the price.');
      return;
    }
    // Validate delivery time value: must be an integer.
    const deliveryInt = parseInt(deliveryTimeValue, 10);
    if (isNaN(deliveryInt) || deliveryInt.toString() !== deliveryTimeValue.trim()) {
      Alert.alert('Invalid Delivery Time', 'Please enter a valid integer for the delivery time.');
      return;
    }
    // Combine delivery time with unit.
    const deliveryTimeCombined = `${deliveryInt} ${deliveryTimeUnit}`;

    setLoading(true);
    try {
      const imageUrls = await uploadImages();
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        setLoading(false);
        return;
      }
      const serviceData = {
        title,
        description,
        category,
        serviceType,
        priceType,
        price: priceNumber,
        deliveryTime: deliveryTimeCombined,
        images: imageUrls,
        username,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };
      if (locationService) {
        serviceData.location = locationService;
      }
      if (radiusService) {
        serviceData.radius = radiusService;
      }
      await addDoc(collection(db, 'services'), serviceData);
      Alert.alert('Success', 'Service added successfully!');
      // Reset all fields
      setTitle('');
      setDescription('');
      setCategory(null);
      setServiceType('remote');
      setPriceType('flat');
      setPrice('');
      setDeliveryTimeValue('');
      setDeliveryTimeUnit('days');
      setImages([]);
      setLocationService(null);
      setRadiusService(5);
      setMapRegion(null);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong while adding the service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView nestedScrollEnabled={true} contentContainerStyle={styles.container}>
      <View style={styles.formWrapper}>
        <Text style={styles.heading}>Add New Service</Text>
        <TextInput
          style={styles.input}
          placeholder="Service Title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Service Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Text style={styles.label}>Category</Text>
        {/* Wrap DropDownPicker with a View to handle zIndex */}
        <View style={{ zIndex: 3000, marginBottom: 15 }}>
          <DropDownPicker
            open={open}
            value={category}
            items={categories}
            setOpen={setOpen}
            setValue={setCategory}
            setItems={setCategories}
            placeholder="Select a category"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            searchable={true}
            searchPlaceholder="Search categories..."
            listMode="MODAL"
          />
        </View>
        <Text style={styles.label}>Service Type</Text>
        <View style={styles.row}>
          {['remote', 'in-person'].map((type) => (
            <TouchableOpacity key={type} onPress={() => setServiceType(type)}>
              <Text style={[styles.radio, serviceType === type && styles.radioSelected]}>
                {type === 'remote' ? 'Remote' : 'In-Person'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Pricing</Text>
        <View style={styles.row}>
          {['flat', 'hourly'].map((type) => (
            <TouchableOpacity key={type} onPress={() => setPriceType(type)}>
              <Text style={[styles.radio, priceType === type && styles.radioSelected]}>
                {type === 'flat' ? 'Flat Rate' : 'Hourly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter price (e.g. 50)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        {/* Delivery Time Split: Numeric value and Unit */}
        <Text style={styles.label}>Estimated Delivery Time</Text>
        <View style={styles.deliveryRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="e.g. 3"
            value={deliveryTimeValue}
            onChangeText={setDeliveryTimeValue}
            keyboardType="numeric"
          />
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[
                styles.unitOption,
                deliveryTimeUnit === 'days' && styles.unitOptionSelected,
              ]}
              onPress={() => setDeliveryTimeUnit('days')}
            >
              <Text
                style={[
                  styles.unitOptionText,
                  deliveryTimeUnit === 'days' && styles.unitOptionTextSelected,
                ]}
              >
                Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitOption,
                deliveryTimeUnit === 'months' && styles.unitOptionSelected,
              ]}
              onPress={() => setDeliveryTimeUnit('months')}
            >
              <Text
                style={[
                  styles.unitOptionText,
                  deliveryTimeUnit === 'months' && styles.unitOptionTextSelected,
                ]}
              >
                Months
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Location selection */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            // This modal opens on mobile to set location & service radius
            setLocationModalVisible(true);
          }}
        >
          <Text style={styles.locationButtonText}>Set Location & Radius</Text>
        </TouchableOpacity>
        {locationService && (
          <Text style={styles.infoText}>
            Selected Location: {locationService.latitude.toFixed(4)}, {locationService.longitude.toFixed(4)}
          </Text>
        )}
        <Text style={styles.infoText}>Service Radius: {radiusService} km</Text>
        <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
          <Text style={styles.imageButtonText}>Add Images (Max 5)</Text>
        </TouchableOpacity>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity onPress={() => setImages(images.filter((_, i) => i !== index))} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#B78BFA" />
          ) : (
            <Button title="Submit" onPress={handleSubmit} color="#B78BFA" />
          )}
        </View>
      </View>
      {/* Location Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.locationModalContainer}>
          <View style={styles.locationModal}>
            <Text style={styles.locationModalTitle}>Set Location & Radius</Text>
            {!mapRegion ? (
              <TouchableOpacity style={styles.modalButton} onPress={handleGetCurrentLocation}>
                <Text style={styles.modalButtonText}>Get Current Location</Text>
              </TouchableOpacity>
            ) : (
              <MapView
                style={styles.map}
                region={mapRegion}
                onRegionChangeComplete={(region) => {
                  setMapRegion(region);
                  setLocationService({ latitude: region.latitude, longitude: region.longitude });
                }}
              >
                <Marker
                  coordinate={mapRegion}
                  draggable
                  onDragEnd={(e) => {
                    const newCoord = e.nativeEvent.coordinate;
                    setLocationService(newCoord);
                    setMapRegion({ ...mapRegion, latitude: newCoord.latitude, longitude: newCoord.longitude });
                  }}
                />
                <Circle
                  center={locationService}
                  radius={radiusService * 1000}
                  strokeColor="rgba(0,0,255,0.5)"
                  fillColor="rgba(0,0,255,0.2)"
                />
              </MapView>
            )}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Radius: {radiusService} km</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={radiusService}
                onValueChange={setRadiusService}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#ccc"
              />
            </View>
            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={() => setLocationModalVisible(false)} />
              <Button title="Save" onPress={() => setLocationModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: isWeb ? 40 : 20,
    backgroundColor: '#f0f2f5',
    flexGrow: 1,
    alignItems: 'center',
  },
  formWrapper: {
    width: '100%',
    maxWidth: isWeb ? 700 : '100%',
  },
  heading: {
    fontSize: isWeb ? 28 : 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: isWeb ? 18 : 16,
  },
  label: {
    fontSize: isWeb ? 18 : 16,
    marginBottom: 6,
    color: '#444',
  },
  dropdown: {
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  dropdownContainer: {
    borderColor: '#ccc',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  radio: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    marginRight: 10,
    color: '#555',
  },
  radioSelected: {
    backgroundColor: '#B78BFA',
    color: '#fff',
    borderColor: '#B78BFA',
  },
  imageButton: {
    backgroundColor: '#E3D1FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageButtonText: {
    color: '#6C2D9',
    fontWeight: '600',
  },
  imageScroll: {
    marginVertical: 10,
  },
  imageThumb: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  removeText: {
    color: 'red',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: 8,
  },
  locationButton: {
    backgroundColor: '#D0E8FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  locationButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoText: {
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  unitSelector: {
    flexDirection: 'row',
  },
  unitOption: {
    borderColor: '#B78BFA',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  unitOptionSelected: {
    backgroundColor: '#B78BFA',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#B78BFA',
    fontWeight: '600',
  },
  unitOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  // Modal & Map Styles
  locationModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  locationModal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  locationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#D0E8FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sliderContainer: {
    width: '90%',
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  map: {
    width: '100%',
    height: 200,
    marginBottom: 10,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  resetFilterText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginTop: 10,
    fontSize: 16,
  },
});
