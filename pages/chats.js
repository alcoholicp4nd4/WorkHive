import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase'; // make sure this exists

export default function ChatsScreen() {
  const navigation = useNavigation();
  const [providers, setProviders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const q = query(collection(db, 'users'), where('isProvider', '==', true));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProviders(fetched);
      } catch (err) {
        console.error('❌ Firestore fetch error:', err);
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
      <View style={styles.chatsSection}>
        <Text style={styles.sectionTitle}>Chats</Text>
        {providers.length === 0 ? (
          <Text>No providers found.</Text>
        ) : (
          providers.map((provider) => (
            <TouchableOpacity
              key={provider.uid}
              style={styles.chatCard}
              onPress={() => {
                if (currentUser) {
                  navigation.navigate('ChatScreen', {
                    currentUserId: currentUser.uid,
                    providerId: provider.uid,
                  });
                }
              }}
            >
              <View style={styles.chatInfo}>
                <Text style={styles.providerName}>{provider.username}</Text> {/* Render username */}
                <Text style={styles.providerService}>Service Provider</Text>
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
    padding: 20,
  },
  chatsSection: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F1F6',
    borderRadius: 15,
    marginBottom: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  providerService: {
    fontSize: 14,
    color: '#666',
  },
});
