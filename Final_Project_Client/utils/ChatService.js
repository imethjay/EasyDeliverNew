import { rtdb, auth } from '../firebase/init';
import { ref, push, onValue, off, orderByChild, query, serverTimestamp, update } from 'firebase/database';

class ChatService {
  constructor() {
    this.currentUser = null;
    this.activeListeners = new Map();
  }

  // Initialize chat service with current user
  initialize() {
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

      await push(chatRoomRef, chatRoomData);
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
          
          // Check if current user is a participant
          if (chatData.participants && chatData.participants[this.currentUser.uid]) {
            // Find the other participant
            const participants = Object.keys(chatData.participants);
            const otherParticipant = participants.find(id => id !== this.currentUser.uid);
            
            if (otherParticipant) {
              chatList.push({
                id: chatId,
                recipientId: otherParticipant,
                lastMessage: chatData.lastMessage,
                lastActivity: chatData.lastActivity,
                orderId: chatData.orderId
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