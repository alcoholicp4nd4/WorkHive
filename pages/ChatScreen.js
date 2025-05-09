import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, doc, limit, getDocs, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../database/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen({ route, navigation }) {
  const { bookingId, otherUserId, otherUsername } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInitialActions, setShowInitialActions] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const flatListRef = useRef(null);
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchUserAndServiceDetails = async () => {
      try {
        // Get other user's profile
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        setOtherUserProfile(otherUserDoc.data());

        // Get current user's profile
        const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
        setCurrentUserProfile(currentUserDoc.data());

        // Get booking and service details
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        const booking = bookingDoc.data();
        const serviceDoc = await getDoc(doc(db, 'services', booking.serviceId));
        setServiceDetails(serviceDoc.data());
      } catch (error) {
        console.error('Error fetching user and service details:', error);
      }
    };

    fetchUserAndServiceDetails();
  }, [bookingId, otherUserId, currentUserId]);

  useEffect(() => {
    const checkProviderStatus = async () => {
      try {
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        const booking = bookingDoc.data();
        
        // Check if current user is the provider
        const isUserProvider = booking.providerId === currentUserId;
        setIsProvider(isUserProvider);
        
        // Only show initial actions if user is provider and there are no messages
        if (isUserProvider) {
          const messagesQuery = query(
            collection(db, 'messages'),
            where('bookingId', '==', bookingId),
            limit(1)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          setShowInitialActions(messagesSnapshot.empty);
        }
      } catch (error) {
        console.error('Error checking provider status:', error);
      }
    };

    checkProviderStatus();
  }, [bookingId, currentUserId]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    const fetchMessages = async () => {
      try {
        // Set up the messages listener
        const q = query(
          collection(db, 'messages'),
          where('bookingId', '==', bookingId),
          orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          setMessages(messageList);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [bookingId, otherUsername]);

  useEffect(() => {
    const markMessagesAsRead = async () => {
      try {
        // Get all unread messages for this conversation
        const unreadQuery = query(
          collection(db, 'messages'),
          where('bookingId', '==', bookingId),
          where('receiverId', '==', currentUserId),
          where('read', '==', false)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        
        // Mark each message as read
        const updatePromises = unreadSnapshot.docs.map(doc => 
          updateDoc(doc.ref, { read: true })
        );
        
        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [bookingId, currentUserId]);

  const handleStartMessaging = () => {
    setShowInitialActions(false);
  };

  const handleReturn = () => {
    navigation.goBack();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        bookingId,
        senderId: currentUserId,
        receiverId: otherUserId,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        read: false, // New messages start as unread
      });
      setNewMessage('');
      // Hide initial actions after sending first message
      if (showInitialActions) {
        setShowInitialActions(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <View style={styles.headerUserInfo}>
          <Image
            source={otherUserProfile?.profileImage ? { uri: otherUserProfile.profileImage } : require('../assets/Avatar_placeholder.png')}
            style={styles.headerAvatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerUsername}>{otherUsername}</Text>
            <Text style={styles.headerService} numberOfLines={1}>{serviceDetails?.title}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <Image
            source={otherUserProfile?.profileImage ? { uri: otherUserProfile.profileImage } : require('../assets/Avatar_placeholder.png')}
            style={styles.messageAvatar}
          />
        )}
        <View style={[
          styles.messageContent,
          isCurrentUser ? styles.currentUserMessageContent : styles.otherUserMessageContent
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
          ]}>{item.text}</Text>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserMessageTime : styles.otherUserMessageTime
          ]}>
            {item.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isCurrentUser && (
          <Image
            source={currentUserProfile?.profileImage ? { uri: currentUserProfile.profileImage } : require('../assets/Avatar_placeholder.png')}
            style={styles.messageAvatar}
          />
        )}
      </View>
    );
  };

  const renderInitialActions = () => (
    <View style={styles.initialActionsContainer}>
      <Text style={styles.initialActionsTitle}>Start Conversation</Text>
      <Text style={styles.initialActionsSubtitle}>
        Would you like to start messaging with {otherUsername}?
      </Text>
      <View style={styles.initialActionsButtons}>
        <TouchableOpacity
          style={[styles.initialActionButton, styles.messageButton]}
          onPress={handleStartMessaging}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.initialActionButton, styles.returnButton]}
          onPress={handleReturn}
        >
          <Text style={styles.returnButtonText}>Return</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        {isProvider && showInitialActions ? (
          renderInitialActions()
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={24} color={newMessage.trim() ? '#5A31F4' : '#999'} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B5A',
  },
  headerService: {
    fontSize: 13,
    color: '#5A31F4',
    marginTop: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '85%',
    alignItems: 'flex-end',
  },
  messageContent: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  currentUserMessageContent: {
    backgroundColor: '#B78BFA',
  },
  otherUserMessageContent: {
    backgroundColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserMessageText: {
    color: '#fff',
  },
  otherUserMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  currentUserMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserMessageTime: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  initialActionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  initialActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginBottom: 8,
  },
  initialActionsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  initialActionsButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  initialActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: '#5A31F4',
  },
  returnButton: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#5A31F4',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  returnButtonText: {
    color: '#5A31F4',
    fontSize: 16,
    fontWeight: '600',
  },
});
