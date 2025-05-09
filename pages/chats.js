import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, doc, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('customer'); // 'customer' or 'provider'
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  const fetchConversations = async () => {
    try {
      setLoading(true);
      // Get bookings based on selected role
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where(selectedRole === 'customer' ? 'userId' : 'providerId', '==', currentUserId)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const allBookings = bookingsSnapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        isUser: selectedRole === 'customer' 
      }));

      // Get the latest message and unread count for each booking
      const conversationsPromises = allBookings.map(async (booking) => {
        // Get the other user's details first
        const otherUserId = booking.isUser ? booking.providerId : booking.userId;
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        const otherUser = otherUserDoc.data();

        // Get the service details
        const serviceDoc = await getDoc(doc(db, 'services', booking.serviceId));
        const service = serviceDoc.data();

        // Get unread messages count
        const unreadQuery = query(
          collection(db, 'messages'),
          where('bookingId', '==', booking.id),
          where('receiverId', '==', currentUserId),
          where('read', '==', false)
        );
        const unreadSnapshot = await getDocs(unreadQuery);
        const unreadCount = unreadSnapshot.docs.length;

        // Try to get the latest message from the messages collection
        const messagesQuery = query(
          collection(db, 'messages'),
          where('bookingId', '==', booking.id),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const latestMessage = messagesSnapshot.docs[0]?.data() || null;

        // Only include the conversation if there is a message in the messages collection
        if (latestMessage) {
          return {
            id: booking.id,
            otherUserId,
            otherUsername: otherUser?.username || 'Unknown User',
            otherUserProfileImage: otherUser?.profileImage,
            serviceTitle: service?.title || 'Unknown Service',
            latestMessage: latestMessage.text,
            timestamp: latestMessage.createdAt,
            unreadCount,
          };
        }
        return null;
      });

      const conversationsData = (await Promise.all(conversationsPromises))
        .filter(conversation => conversation !== null); // Remove null entries
      
      // Sort conversations by most recent message
      conversationsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || new Date(0);
        const timeB = b.timestamp?.toDate() || new Date(0);
        return timeB - timeA;
      });

      setConversations(conversationsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  // Use useFocusEffect to refresh conversations when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchConversations();
    }, [currentUserId, selectedRole])
  );

  const renderRoleSelector = () => (
    <View style={styles.roleSelector}>
      <TouchableOpacity
        style={[
          styles.roleButton,
          selectedRole === 'customer' && styles.roleButtonActive
        ]}
        onPress={() => setSelectedRole('customer')}
      >
        <Text style={[
          styles.roleButtonText,
          selectedRole === 'customer' && styles.roleButtonTextActive
        ]}>As Customer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.roleButton,
          selectedRole === 'provider' && styles.roleButtonActive
        ]}
        onPress={() => setSelectedRole('provider')}
      >
        <Text style={[
          styles.roleButtonText,
          selectedRole === 'provider' && styles.roleButtonTextActive
        ]}>As Provider</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('Chat', {
        bookingId: item.id,
        otherUserId: item.otherUserId,
        otherUsername: item.otherUsername
      })}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={item.otherUserProfileImage ? { uri: item.otherUserProfileImage } : require('../assets/Avatar_placeholder.png')}
          style={styles.avatar}
        />
        {item.unreadCount > 0 && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.headerLeft}>
            <Text style={[
              styles.username,
              item.unreadCount > 0 && styles.unreadUsername
            ]}>{item.otherUsername}</Text>
            <Text style={styles.timestamp}>
              {item.timestamp?.toDate().toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.serviceInfo}>
          <Ionicons name="briefcase-outline" size={14} color="#5A31F4" />
          <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
        </View>
        <Text style={[
          styles.lastMessage,
          item.unreadCount > 0 && styles.unreadMessage
        ]} numberOfLines={2}>
          {item.latestMessage}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderRoleSelector()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5A31F4" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {selectedRole === 'customer' ? 'customer' : 'provider'} conversations yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B5A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#5A31F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B5A',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: 13,
    color: '#5A31F4',
    marginLeft: 4,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadUsername: {
    fontWeight: '700',
    color: '#2D1B5A',
  },
  unreadMessage: {
    fontWeight: '500',
    color: '#2D1B5A',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  roleSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#B78BFA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#B78BFA',
    alignItems: 'center',
    borderWidth: 0,
  },
  roleButtonActive: {
    backgroundColor: '#8A2BE2',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#8A2BE2',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});