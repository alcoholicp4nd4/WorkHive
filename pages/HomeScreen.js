import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ImageBackground, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase'; // make sure this exists
import NotificationBell from '../Components/NotificationBell';

const headerImage = { uri: 'https://www.shutterstock.com/image-photo/happy-mid-aged-business-woman-600nw-2353012835.jpg' };

const categories = [
  {
    id: 'tech',
    name: 'Tech',
    subcategories: [
      { id: 'web-development', name: 'Web Development' },
      { id: 'mobile-app-development', name: 'Mobile App Development' },
      { id: 'software-engineering', name: 'Software Engineering' },
      { id: 'ui-ux-design', name: 'UI/UX Design' },
      { id: 'qa-testing', name: 'QA Testing' },
      { id: 'game-development', name: 'Game Development' },
      { id: 'devops-cloud', name: 'DevOps & Cloud' }
    ]
  },
  {
    id: 'design',
    name: 'Design',
    subcategories: [
      { id: 'graphic-design', name: 'Graphic Design' },
      { id: 'logo-design', name: 'Logo Design' },
      { id: 'animation', name: 'Animation' },
      { id: 'video-editing', name: 'Video Editing' },
      { id: 'photography', name: 'Photography' },
      { id: 'branding', name: 'Branding & Identity' },
      { id: 'illustration', name: 'Illustration' }
    ]
  },
  {
    id: 'business',
    name: 'Business',
    subcategories: [
      { id: 'seo', name: 'SEO Optimization' },
      { id: 'digital-marketing', name: 'Digital Marketing' },
      { id: 'social-media', name: 'Social Media Management' },
      { id: 'email-marketing', name: 'Email Marketing' },
      { id: 'copywriting', name: 'Copywriting' },
      { id: 'business-consulting', name: 'Business Consulting' },
      { id: 'sales-strategy', name: 'Sales Strategy' }
    ]
  },
  {
    id: 'local',
    name: 'Local Services',
    subcategories: [
      { id: 'plumbing', name: 'Plumbing' },
      { id: 'electrical', name: 'Electrical Work' },
      { id: 'cleaning', name: 'Cleaning' },
      { id: 'moving', name: 'Moving Services' },
      { id: 'handyman', name: 'Handyman Services' },
      { id: 'pest-control', name: 'Pest Control' },
      { id: 'landscaping', name: 'Landscaping' }
    ]
  },
  {
    id: 'education',
    name: 'Education',
    subcategories: [
      { id: 'tutoring', name: 'Tutoring' },
      { id: 'language-teaching', name: 'Language Teaching' },
      { id: 'life-coaching', name: 'Life Coaching' },
      { id: 'career-coaching', name: 'Career Coaching' },
      { id: 'test-prep', name: 'Test Preparation' }
    ]
  },
  {
    id: 'wellness',
    name: 'Wellness',
    subcategories: [
      { id: 'fitness-training', name: 'Fitness Training' },
      { id: 'yoga', name: 'Yoga Instruction' },
      { id: 'therapy', name: 'Therapy & Counseling' },
      { id: 'nutrition', name: 'Nutrition Planning' },
      { id: 'beauty', name: 'Beauty & Skincare' },
      { id: 'hair-styling', name: 'Hair Styling' }
    ]
  }
];

const featuredProviders = [
  {
    id: 1,
    name: 'Sarah Johnson',
    service: 'Interior Designer',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 2,
    name: 'Michael Chen',
    service: 'Personal Trainer',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=400',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [providers, setProviders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Set the NotificationBell in the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <NotificationBell navigation={navigation} />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const q = query(collection(db, "users"), where("isProvider", "==", true));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProviders(fetched);
      } catch (err) {
        console.error("❌ Firestore fetch error:", err);
      }
    };

    fetchProviders();

    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => navigation.navigate('Category', { 
        category: item.name,
        subcategories: item.subcategories 
      })}
    >
      <View style={styles.categoryContent}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.subcategoryCount}>{item.subcategories.length} services</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <ImageBackground source={headerImage} style={styles.header} resizeMode="cover">
        <Text style={styles.greeting}>Our service providers got it from here</Text>
        <Text style={styles.subtitle}>Find the perfect service provider</Text>
      </ImageBackground>

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured Providers</Text>
        {providers.length === 0 ? (
          <Text>No providers found.</Text>
        ) : (
          providers.map((provider) => (
            <TouchableOpacity
              key={provider.uid}
              style={styles.providerCard}
              onPress={() => {
                console.log("Tapped on provider:", provider.username);
                if (currentUser) {
                  navigation.navigate("Chat", {
                    currentUserId: currentUser.uid,
                    providerId: provider.uid,
                  });
                }
              }}
            >
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.username}</Text>
                <Text style={styles.providerService}>Service Provider</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.rating}>★ 5.0</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  categoriesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryContent: {
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subcategoryCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  featuredSection: {
    padding: 20,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#F0C1E1',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  providerImage: {
    width: 100,
    height: 100,
  },
  providerInfo: {
    flex: 1,
    padding: 15,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  providerService: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    marginTop: 8,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
