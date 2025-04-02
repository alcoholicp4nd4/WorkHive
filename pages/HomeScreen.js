import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase'; // make sure this exists


const headerImage = { uri: 'https://www.cisco.com/content/dam/cisco-cdc/site/images/heroes/learn/ccnp-service-provider-hero-banner-3200x1312.jpg' };
const categories = [
  {
    id: 1,
    name: 'Home Services',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400',
    count: 150,
  },
  {
    id: 2,
    name: 'Beauty & Wellness',
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&q=80&w=400',
    count: 120,
  },
  {
    id: 3,
    name: 'Professional',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=400',
    count: 85,
  },
  {
    id: 4,
    name: 'Education',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400',
    count: 95,
  },
  {
    id: 5,
    name: 'Digital Marketing',
    image: 'https://images.unsplash.com/photo-1581092336626-b7a543c67b79?auto=format&fit=crop&q=80&w=400',
    count: 110,
  },
  {
    id: 6,
    name: 'IT & Tech Support',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=400',
    count: 90,
  },
  {
    id: 7,
    name: 'Legal & Financial Services',
    image: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&q=80&w=400',
    count: 70,
  },
  {
    id: 8,
    name: 'Health & Wellness',
    image: 'https://images.unsplash.com/photo-1579722823961-dc78e3b9c63b?auto=format&fit=crop&q=80&w=400',
    count: 130,
  },
  {
    id: 9,
    name: 'Event Planning',
    image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&q=80&w=400',
    count: 80,
  },
  {
    id: 10,
    name: 'Automotive Services',
    image: 'https://images.unsplash.com/photo-1608138278428-2d469735f6eb?auto=format&fit=crop&q=80&w=400',
    count: 75,
  },
  {
    id: 11,
    name: 'Photography & Videography',
    image: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&q=80&w=400',
    count: 95,
  },
  {
    id: 12,
    name: 'Writing & Translation',
    image: 'https://images.unsplash.com/photo-1584697964192-f230d51468e7?auto=format&fit=crop&q=80&w=400',
    count: 85,
  },
  {
    id: 13,
    name: 'Home Renovation & Repairs',
    image: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a1?auto=format&fit=crop&q=80&w=400',
    count: 140,
  },
  {
    id: 14,
    name: 'Freelance Development & Design',
    image: 'https://images.unsplash.com/photo-1564866657311-e9cc905d29d2?auto=format&fit=crop&q=80&w=400',
    count: 125,
  },
  {
    id: 15,
    name: 'Music & Arts Services',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=400',
    count: 60,
  },
  {
    id: 16,
    name: 'Business Consulting',
    image: 'https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?auto=format&fit=crop&q=80&w=400',
    count: 50,
  },
  {
    id: 17,
    name: 'Pet Services',
    image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&q=80&w=400',
    count: 90,
  },
  {
    id: 18,
    name: 'Real Estate & Property Management',
    image: 'https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?auto=format&fit=crop&q=80&w=400',
    count: 100,
  },
  {
    id: 19,
    name: 'Courier & Delivery Services',
    image: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&q=80&w=400',
    count: 85,
  },
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
  const navigation = useNavigation(); // Initialize navigation
  const [providers, setProviders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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

  return (
    <ScrollView style={styles.container}>
      <ImageBackground source={headerImage} style={styles.header} resizeMode="cover">
        <Text style={styles.greeting}>Our service providers got it from here</Text>
        <Text style={styles.subtitle}>Find the perfect service provider</Text>
  </ImageBackground>

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => navigation.navigate('Category', { id: category.id })} // Use navigation.navigate
              style={styles.categoryCard}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{category.count} providers</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              console.log("Tapped on provider:", provider.username); // ✅ debug
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
  headerContainer: {
    overflow: 'hidden',
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
  categoriesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: 200,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryImage: {
    width: '100%',
    height: 120,
  },
  categoryInfo: {
    padding: 12,
    backgroundColor: '#FDDBBB',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
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