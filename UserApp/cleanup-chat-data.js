// Cleanup script for chat data structure using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "imethjay-70734",
  "private_key_id": "your_private_key_id",
  "private_key": "your_private_key",
  "client_email": "your_client_email",
  "client_id": "your_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
};

// For now, let's use a simpler approach with Firebase CLI
console.log('Please run the following Firebase CLI commands to clean up the data:');
console.log('');
console.log('1. First, backup your current data:');
console.log('   firebase database:get /chats > chat-backup.json');
console.log('');
console.log('2. Then run this script manually in Firebase Console or use the web interface');
console.log('');
console.log('The issue is that the chat data structure has mixed auto-generated keys and structured data.');
console.log('We need to consolidate all messages under the "messages" key for each chat room.');
console.log('');
console.log('For now, let\'s try a different approach - let\'s update the database rules to handle the current structure.');

// Let's create a manual cleanup function that can be run in the browser console
const cleanupFunction = `
// Run this in Firebase Console > Database > Rules tab > Simulator
// Or in browser console on a page with Firebase initialized

async function cleanupChatData() {
  const chatsRef = firebase.database().ref('chats');
  const snapshot = await chatsRef.once('value');
  const chatsData = snapshot.val();
  
  if (!chatsData) return;
  
  const updates = {};
  
  for (const [chatRoomId, chatData] of Object.entries(chatsData)) {
    const messages = {};
    let participants = {};
    let lastMessage = null;
    let lastActivity = 0;
    let orderId = null;
    
    // Extract all data
    for (const [key, value] of Object.entries(chatData)) {
      if (key === 'messages' && typeof value === 'object') {
        Object.assign(messages, value);
      } else if (key === 'participants') {
        participants = value;
      } else if (key === 'lastMessage') {
        lastMessage = value;
      } else if (key === 'lastActivity') {
        lastActivity = value;
      } else if (key === 'orderId') {
        orderId = value;
      } else if (key.startsWith('-') && typeof value === 'object') {
        if (value.text && value.senderId) {
          messages[key] = value;
        } else if (value.participants || value.lastMessage) {
          if (value.participants) participants = value.participants;
          if (value.lastMessage) lastMessage = value.lastMessage;
          if (value.lastActivity) lastActivity = value.lastActivity;
          if (value.orderId) orderId = value.orderId;
        }
      }
    }
    
    // Find most recent message
    let mostRecentTimestamp = 0;
    let mostRecentMessage = null;
    
    for (const msgData of Object.values(messages)) {
      if (msgData.timestamp > mostRecentTimestamp) {
        mostRecentTimestamp = msgData.timestamp;
        mostRecentMessage = {
          text: msgData.text,
          senderId: msgData.senderId,
          timestamp: msgData.timestamp
        };
      }
    }
    
    // Set clean structure
    updates[\`chats/\${chatRoomId}\`] = {
      participants,
      messages,
      lastMessage: mostRecentMessage || lastMessage,
      lastActivity: mostRecentTimestamp || lastActivity,
      orderId
    };
  }
  
  await firebase.database().ref().update(updates);
  console.log('Cleanup completed');
}

cleanupChatData();
`;

console.log('Manual cleanup function:');
console.log(cleanupFunction); 