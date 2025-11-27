'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './ContactSwapperModal.module.css';

interface ContactSwapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  swapRequest: {
    itemId: string;
    itemTitle: string;
    ownerId: string;
    requesterId: string;
  };
  currentUser: User | null;
  userRole: 'owner' | 'requester'; // Who is the current user
}

interface Message {
  id: string;
  senderId: string;
  senderEmail: string;
  message: string;
  timestamp: any;
}

export default function ContactSwapperModal({
  isOpen,
  onClose,
  swapRequest,
  currentUser,
  userRole
}: ContactSwapperModalProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [otherUserEmail, setOtherUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const otherUserId = userRole === 'owner' ? swapRequest.requesterId : swapRequest.ownerId;
  const chatId = `${swapRequest.itemId}_${swapRequest.requesterId}`;

  // Get other user's email
  useEffect(() => {
    if (!isOpen || !otherUserId) return;

    const fetchUserEmail = async () => {
      try {
        const presenceDoc = await getDoc(doc(db, 'userPresence', otherUserId));
        if (presenceDoc.exists()) {
          const userData = presenceDoc.data();
          setOtherUserEmail(userData.email || userData.name || 'User');
        } else {
          setOtherUserEmail('User');
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
        setOtherUserEmail('User');
      }
    };

    fetchUserEmail();
  }, [isOpen, otherUserId]);

  // Listen to messages
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    setLoading(true);

    // Query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, 'swapMessages'),
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesList: Message[] = [];
      querySnapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data()
        } as Message);
      });
      
      // Sort messages by timestamp on client side
      messagesList.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return aTime - bTime;
      });
      
      setMessages(messagesList);
      setLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser, chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentUser) return;

    setSending(true);

    try {
      await addDoc(collection(db, 'swapMessages'), {
        chatId: chatId,
        itemId: swapRequest.itemId,
        itemTitle: swapRequest.itemTitle,
        senderId: currentUser.uid,
        senderEmail: currentUser.email || '',
        receiverId: otherUserId,
        message: message.trim(),
        timestamp: serverTimestamp(),
        read: false
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return '';
      }
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2>
              <i className="fas fa-comments"></i>
              Contact {userRole === 'owner' ? 'Requester' : 'Owner'}
            </h2>
            <p className={styles.contactEmail}>
              <i className="fas fa-user"></i>
              {otherUserEmail.split('@')[0]}
            </p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.itemBanner}>
          <i className="fas fa-box"></i>
          <span>Regarding: <strong>{swapRequest.itemTitle}</strong></span>
        </div>

        <div className={styles.safetyReminder}>
          <i className="fas fa-shield-alt"></i>
          <span><strong>Safety Tip:</strong> Meet in public places, verify items before swapping, and trust your instincts.</span>
        </div>

        <div className={styles.chatContainer} id="chatMessages">
          {loading ? (
            <div className={styles.loadingMessages}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyChat}>
              <i className="fas fa-comment-dots"></i>
              <p>No messages yet</p>
              <small>Start the conversation to coordinate your swap!</small>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.messageWrapper} ${
                    msg.senderId === currentUser?.uid ? styles.myMessage : styles.theirMessage
                  }`}
                >
                  <div className={styles.messageBubble}>
                    <p className={styles.messageText}>{msg.message}</p>
                    <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className={styles.messageForm}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className={styles.messageInput}
            disabled={sending}
            maxLength={500}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <small>
            <i className="fas fa-info-circle"></i>
            Coordinate the details of your swap before completing the transaction
          </small>
        </div>
      </div>
    </div>
  );
}
