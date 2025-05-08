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
} from 'react-native';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, doc } from 'firebase/firestore';
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
  const flatListRef = useRef(null);
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const checkProviderStatus = async () => {
      try {
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        const booking = bookingDoc.data();
        
        // Check if current user is the provider
        const isUserProvider = booking.providerId === currentUserId;
        setIsProvider(isUserProvider);
        
        // If user is provider, show initial actions
        if (isUserProvider) {
          setShowInitialActions(true);
        }
      } catch (error) {
        console.error('Error checking provider status:', error);
      }
    };

    checkProviderStatus();
  }, [bookingId, currentUserId]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: `Chat with ${otherUsername}`,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
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

          // Get the booking to add initial message
          getDoc(doc(db, 'bookings', bookingId)).then(bookingDoc => {
            const booking = bookingDoc.data();
            if (booking?.message) {
              const hasInitialMessage = messageList.some(msg => msg.isInitialMessage);
              if (!hasInitialMessage) {
                messageList.unshift({
                  id: 'initial-message',
                  bookingId,
                  senderId: booking.userId,
                  text: booking.message,
                  createdAt: booking.createdAt,
                  isInitialMessage: true
                });
              }
            }
            setMessages(messageList);
            setLoading(false);
          });
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [bookingId, otherUsername]);

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
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
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
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#5A31F4',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserMessageText: {
    color: '#fff',
  },
  otherUserMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 12,
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
