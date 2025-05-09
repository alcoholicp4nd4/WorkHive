import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase';
import NotificationBell from '../Components/NotificationBell';
import { Search } from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

// Purple-centric palette
const COLORS = {
  primary: '#8A2BE2',    // vibrant purple
  secondary: '#A78BFA',  // light purple
  accent: '#C4B5FD',     // very light purple
  background: '#F5F3FF', // lightest purple background
  surface: '#FFFFFF',    // white
  text: {
    primary: '#4B5563',  // medium gray
    secondary: '#6B7280', // light gray
    light: '#FFFFFF',    // white
  },
  border: '#E2E8F0',     // light gray
  success: '#48BB78',    // green
  error: '#F56565',      // red
  warning: '#ED8936',    // orange
  shadow: 'rgba(138, 43, 226, 0.15)', // purple shadow
};

const headerImage = { uri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80' };

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
      { id: 'devops-cloud', name: 'DevOps & Cloud' },
    ],
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
      { id: 'illustration', name: 'Illustration' },
    ],
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
      { id: 'sales-strategy', name: 'Sales Strategy' },
    ],
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
      { id: 'landscaping', name: 'Landscaping' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    subcategories: [
      { id: 'tutoring', name: 'Tutoring' },
      { id: 'language-teaching', name: 'Language Teaching' },
      { id: 'life-coaching', name: 'Life Coaching' },
      { id: 'career-coaching', name: 'Career Coaching' },
      { id: 'test-prep', name: 'Test Preparation' },
    ],
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
      { id: 'hair-styling', name: 'Hair Styling' },
    ],
  },
];

const trendingSearches = [
  'Web Development',
  'Graphic Design',
  'Digital Marketing',
  'UI/UX Design',
  'Mobile Apps',
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [topServices, setTopServices] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [searchText, setSearchText] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    navigation.setOptions({ headerRight: () => <NotificationBell navigation={navigation} /> });
  }, [navigation]);

  useEffect(() => {
    // Fetch top rated services with ratings
    const fetchTopServices = async () => {
      try {
        const servicesRef = collection(db, 'services');
        const ratingsRef = collection(db, 'ratings');
        const [servicesSnapshot, ratingsSnapshot] = await Promise.all([
          getDocs(servicesRef),
          getDocs(ratingsRef),
        ]);
        let services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const ratings = ratingsSnapshot.docs.map(doc => doc.data());

        // Calculate average rating for each service
        services = services.map(service => {
          const serviceRatings = ratings.filter(r => r.serviceId === service.id && typeof r.rating === 'number');
          const avgRating = serviceRatings.length > 0
            ? serviceRatings.reduce((sum, r) => sum + r.rating, 0) / serviceRatings.length
            : null;
          return { ...service, rating: avgRating };
        });
        // Sort by average rating (descending), fallback to 0 if no rating
        services = services.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setTopServices(services);
      } catch (err) {
        console.error('❌ Error fetching top services or ratings:', err);
      }
    };

    // Fetch category counts
    const fetchCategoryCounts = async () => {
      try {
        const servicesRef = collection(db, 'services');
        const snapshot = await getDocs(servicesRef);
        const services = snapshot.docs.map(doc => doc.data());
        const counts = {};
        categories.forEach(cat => { counts[cat.id] = 0; });
        services.forEach(svc => {
          if (svc.category) {
            const mainCat = categories.find(c => c.subcategories.some(sc => sc.id === svc.category));
            if (mainCat) counts[mainCat.id] += 1;
          }
        });
        setCategoryCounts(counts);
      } catch (err) {
        console.error('❌ Error fetching category counts:', err);
      }
    };

    // Fetch current user
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };

    fetchTopServices();
    fetchCategoryCounts();
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
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.subcategoryCount}>{categoryCounts[item.id] || 0} services</Text>
    </TouchableOpacity>
  );

  const renderTrending = (term, idx) => (
    <TouchableOpacity key={idx} style={styles.trendChip} onPress={() => setSearchText(term)}>
      <Text style={styles.trendText}>{term}</Text>
    </TouchableOpacity>
  );

  const getDisplayRating = (service) => (
    typeof service.rating === 'number' ? service.rating.toFixed(1) : 'N/A'
  );

  const renderServiceCard = (service) => (
    <TouchableOpacity
      key={service.id}
      style={styles.providerCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ServiceDetails', { service })}
    >
      <Image source={{ uri: service.images?.[0] || 'https://via.placeholder.com/300' }} style={styles.providerImage} />
      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{service.title}</Text>
        <Text style={styles.providerService}>{service.category}</Text>
        <Text style={styles.providerService}>by {service.username}</Text>
        <Text style={styles.providerService}>{service.priceType === 'hourly' ? `${service.price} TND/hr` : `${service.price} TND`}</Text>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color={COLORS.accent} />
          <Text style={styles.rating}>{getDisplayRating(service)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ImageBackground source={headerImage} style={styles.header} resizeMode="cover">
        <View style={styles.overlay} />
        <Text style={styles.greeting}>Find the Perfect Service</Text>
        <Text style={styles.subtitle}>Our professionals are here to help</Text>
      </ImageBackground>


      <View style={styles.section}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Rated Services</Text>
        {topServices.length === 0 ? (
          <Text style={styles.emptyText}>No top rated services found.</Text>
        ) : (
          <>
            {topServices.slice(0, visibleCount).map(renderServiceCard)}
            {visibleCount < topServices.length && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={() => setVisibleCount(v => v + 5)}>
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    width, 
    height: 260, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(138, 43, 226, 0.15)'
  },
  greeting: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: COLORS.text.light, 
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: { 
    fontSize: 16, 
    color: COLORS.text.light, 
    textAlign: 'center',
    opacity: 0.9
  },

  trendingContainer: { 
    paddingHorizontal: 20, 
    marginTop: 20,
    marginBottom: 8
  },
  trendChip: { 
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  trendText: { 
    fontSize: 14, 
    color: COLORS.text.light,
    fontWeight: '500'
  },

  section: { 
    marginTop: 24,
    paddingHorizontal: 20,
    marginBottom: 16
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.primary, 
    marginBottom: 16 
  },

  categoriesList: { 
    paddingVertical: 8 
  },
  categoryCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 150,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text.light, 
    textAlign: 'center',
    marginBottom: 8
  },
  subcategoryCount: { 
    fontSize: 13, 
    color: COLORS.text.light,
    opacity: 0.8,
    fontWeight: '500'
  },

  providerCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerImage: { 
    width: 110, 
    height: 110, 
    borderTopLeftRadius: 16, 
    borderBottomLeftRadius: 16 
  },
  providerInfo: { 
    flex: 1, 
    padding: 16, 
    justifyContent: 'center' 
  },
  providerName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.text.primary,
    marginBottom: 4
  },
  providerService: { 
    fontSize: 14, 
    color: COLORS.text.secondary,
    marginBottom: 8
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  rating: { 
    marginLeft: 4, 
    fontSize: 14, 
    color: COLORS.text.secondary,
    fontWeight: '500'
  },
  emptyText: { 
    textAlign: 'center', 
    color: COLORS.text.secondary, 
    fontSize: 16,
    marginTop: 16
  },
  loadMoreButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  loadMoreButtonText: {
    color: COLORS.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
