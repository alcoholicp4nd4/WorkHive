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
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, doc, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('customer'); // 'customer' or 'provider'
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
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

        // Get the latest message for each booking
        const conversationsPromises = allBookings.map(async (booking) => {
          // Get the other user's details first
          const otherUserId = booking.isUser ? booking.providerId : booking.userId;
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          const otherUser = otherUserDoc.data();

          // Get the service details
          const serviceDoc = await getDoc(doc(db, 'services', booking.serviceId));
          const service = serviceDoc.data();

          // Try to get the latest message from the messages collection
          const messagesQuery = query(
            collection(db, 'messages'),
            where('bookingId', '==', booking.id),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          
          const messagesSnapshot = await getDocs(messagesQuery);
          const latestMessage = messagesSnapshot.docs[0]?.data() || null;

          // If there's no message in the messages collection but there is a booking message,
          // use the booking message as the latest message
          const finalMessage = latestMessage?.text || booking.message;
          const finalTimestamp = latestMessage?.createdAt || booking.createdAt;

          // Only include the conversation if there is either a message or a booking message
          if (finalMessage) {
            return {
              id: booking.id,
              otherUserId,
              otherUsername: otherUser?.username || 'Unknown User',
              serviceTitle: service?.title || 'Unknown Service',
              latestMessage: finalMessage,
              timestamp: finalTimestamp,
              unreadCount: 0,
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

    fetchConversations();
  }, [currentUserId, selectedRole]);

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
        <Text style={styles.avatarText}>
          {item.otherUsername.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.username}>{item.otherUsername}</Text>
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>{item.serviceTitle}</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            {item.timestamp?.toDate().toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={2}>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
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
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  serviceBadge: {
    backgroundColor: '#F0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  serviceBadgeText: {
    color: '#5A31F4',
    fontSize: 12,
    fontWeight: '500',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B5A',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#5A31F4',
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
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#5A31F4',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A31F4',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
});