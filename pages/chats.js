import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getAuth } from 'firebase/auth';

export default function ChatsScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const currentUserId = getAuth().currentUser?.uid;

  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUserId) return;

      try {
        const snapshot = await getDocs(collection(db, 'conversations'));

        const relevantDocs = snapshot.docs.filter((docSnap) =>
          docSnap.id.includes(currentUserId)
        );

        const convs = await Promise.all(
          relevantDocs.map(async (docSnap) => {
            const convoId = docSnap.id;
            const [id1, id2] = convoId.split('_');
            const otherId = id1 === currentUserId ? id2 : id1;

            // Fetch username
            let username = 'Unknown';
            try {
              const userSnap = await getDoc(doc(db, 'users', otherId));
              if (userSnap.exists()) {
                username = userSnap.data().username;
              }
            } catch (e) {
              console.warn('Failed to get username for', otherId);
            }

            // Get last message
            const messagesSnap = await getDocs(
              query(
                collection(db, 'conversations', convoId, 'messages'),
                orderBy('timestamp', 'desc'),
                limit(1)
              )
            );

            const lastMessage = messagesSnap.docs[0]?.data()?.text || 'No messages yet';
            const lastMessageTime = messagesSnap.docs[0]?.data()?.timestamp;
            const formattedTime = lastMessageTime
              ? new Date(lastMessageTime.seconds * 1000).toLocaleTimeString()
              : '';

            return {
              id: convoId,
              name: username,
              lastMessage,
              otherUserId: otherId,
              time: formattedTime,
            };
          })
        );

        setConversations(convs);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations. Please try again.');
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUserId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() =>
              navigation.navigate('Chat', {
                currentUserId,
                providerId: item.otherUserId,
              })
            }
          >
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <View style={styles.chatFooter}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Lighter background for a clean look
    paddingBottom: 10, // Adds some space at the bottom
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60, // More padding at the top for header space
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // Lighter separator
  },
  title: {
    fontSize: 30, // Larger font for the title
    fontFamily: 'Inter_600SemiBold', // Modern font style
    color: '#0f172a', // Darker color for better contrast
    marginBottom: 16,
    textAlign: 'center', // Center the title
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10, // Rounded corners for each chat item
    marginVertical: 8, // Add margin for spacing between items
    shadowColor: '#000', // Add subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4, // For Android shadow effect
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6, // Adjust space between name and time
  },
  chatName: {
    fontSize: 18, // Slightly larger font for name
    fontFamily: 'Inter_600SemiBold',
    color: '#1f2937', // Dark text color for readability
  },
  chatTime: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#94a3b8', // Lighter text for time
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 15, // Slightly larger font for last message
    fontFamily: 'Inter_400Regular',
    color: '#64748b',
    marginRight: 10,
    lineHeight: 20, // Adds space between lines
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9', // Light background to match the page
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    fontFamily: 'Inter_500Medium', // Make error text slightly bolder
  },
});
