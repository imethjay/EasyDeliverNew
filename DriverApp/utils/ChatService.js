import { rtdb, auth } from '../firebase/init';
import { ref, push, onValue, off, orderByChild, query, serverTimestamp, update } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

class ChatService {
  constructor() {
    this.currentUser = null;
    this.activeListeners = new Map();
    this.authUnsubscribe = null;
  }

  // Initialize chat service with current user
  initialize() {
    // Listen for auth state changes
    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
    
    // Set initial user if already authenticated
    this.currentUser = auth.currentUser;
    return this.currentUser;
  }

  // Generate chat room ID consistently between two users
  generateChatRoomId(userId1, userId2) {
    // Always put the IDs in alphabetical order to ensure consistent room ID
    return [userId1, userId2].sort().join('_');
  }

  // Send a message
  async sendMessage(recipientId, message, orderId = null) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const chatRoomId = this.generateChatRoomId(this.currentUser.uid, recipientId);
    const messagesRef = ref(rtdb, `chats/${chatRoomId}/messages`);

    const messageData = {
      text: message,
      senderId: this.currentUser.uid,
      recipientId: recipientId,
      timestamp: serverTimestamp(),
      orderId: orderId, // Link message to specific order
      isRead: false
    };

    try {
      await push(messagesRef, messageData);
      
      // Update chat room metadata
      const chatRoomRef = ref(rtdb, `chats/${chatRoomId}`);
      const chatRoomData = {
        participants: {
          [this.currentUser.uid]: true,
          [recipientId]: true
        },
        lastMessage: {
          text: message,
          senderId: this.currentUser.uid,
          timestamp: serverTimestamp()
        },
        lastActivity: serverTimestamp(),
        orderId: orderId
      };

      await update(chatRoomRef, chatRoomData);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Listen to messages in a chat room
  listenToMessages(recipientId, callback) {
    if (!this.currentUser) {
      console.error('User not authenticated');
      return null;
    }

    const chatRoomId = this.generateChatRoomId(this.currentUser.uid, recipientId);
    const messagesRef = ref(rtdb, `chats/${chatRoomId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messages = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const messageData = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          messages.push(messageData);
        });
      }

      // Sort messages by timestamp
      messages.sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return timeA - timeB;
      });

      callback(messages);
    }, (error) => {
      console.error('Error listening to messages:', error);
      callback([]);
    });

    // Store the listener to clean up later
    this.activeListeners.set(chatRoomId, unsubscribe);
    
    return () => {
      off(messagesRef, 'value', unsubscribe);
      this.activeListeners.delete(chatRoomId);
    };
  }

  // Get chat list for current user
  listenToChatList(callback) {
    if (!this.currentUser) {
      console.error('User not authenticated');
      return null;
    }

    const chatsRef = ref(rtdb, 'chats');
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const chatList = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((chatSnapshot) => {
          const chatData = chatSnapshot.val();
          const chatId = chatSnapshot.key;
          
          // Extract participants, lastMessage, lastActivity from mixed structure
          let participants = {};
          let lastMessage = null;
          let lastActivity = 0;
          let orderId = null;
          
          // Handle mixed data structure
          for (const [key, value] of Object.entries(chatData)) {
            if (key === 'participants') {
              participants = value;
            } else if (key === 'lastMessage') {
              lastMessage = value;
            } else if (key === 'lastActivity') {
              lastActivity = value;
            } else if (key === 'orderId') {
              orderId = value;
            } else if (key.startsWith('-') && typeof value === 'object') {
              // Handle auto-generated keys (old structure)
              if (value.participants) {
                participants = value.participants;
              }
              if (value.lastMessage) {
                lastMessage = value.lastMessage;
              }
              if (value.lastActivity && value.lastActivity > lastActivity) {
                lastActivity = value.lastActivity;
              }
              if (value.orderId) {
                orderId = value.orderId;
              }
            }
          }
          
          // Check if current user is a participant
          if (participants && participants[this.currentUser.uid]) {
            // Find the other participant
            const participantIds = Object.keys(participants);
            const otherParticipant = participantIds.find(id => id !== this.currentUser.uid);
            
            if (otherParticipant) {
              chatList.push({
                id: chatId,
                recipientId: otherParticipant,
                lastMessage: lastMessage,
                lastActivity: lastActivity,
                orderId: orderId
              });
            }
          }
        });
      }

      // Sort by last activity
      chatList.sort((a, b) => {
        const timeA = a.lastActivity || 0;
        const timeB = b.lastActivity || 0;
        return timeB - timeA;
      });

      callback(chatList);
    }, (error) => {
      console.error('Error listening to chat list:', error);
      callback([]);
    });

    return () => {
      off(chatsRef, 'value', unsubscribe);
    };
  }

  // Mark messages as read
  async markMessagesAsRead(recipientId) {
    if (!this.currentUser) return;

    const chatRoomId = this.generateChatRoomId(this.currentUser.uid, recipientId);
    const messagesRef = ref(rtdb, `chats/${chatRoomId}/messages`);
    
    try {
      const snapshot = await new Promise((resolve) => {
        onValue(messagesRef, resolve, { onlyOnce: true });
      });

      if (snapshot.exists()) {
        const updates = {};
        snapshot.forEach((childSnapshot) => {
          const messageData = childSnapshot.val();
          // Mark unread messages from the other user as read
          if (messageData.senderId === recipientId && !messageData.isRead) {
            updates[`chats/${chatRoomId}/messages/${childSnapshot.key}/isRead`] = true;
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb), updates);
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Clean up all listeners
  cleanup() {
    this.activeListeners.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.activeListeners.clear();
    
    // Unsubscribe from auth state changes
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }

  // Get user info for chat display
  async getUserInfo(userId) {
    try {
      // This would typically fetch user info from Firestore
      // For now, return basic info
      return {
        id: userId,
        name: 'User',
        avatar: null
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return {
        id: userId,
        name: 'Unknown User',
        avatar: null
      };
    }
  }
}

// Export singleton instance
export default new ChatService(); 