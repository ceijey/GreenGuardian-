'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc,
  increment,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { createPresenceManager } from '../../lib/presenceUtils';
import CitizenOnly from '@/components/CitizenOnly';
import Header from '../../components/Header';
import GlobalAnnouncements from '../../components/GlobalAnnouncements';
import styles from './community.module.css';

interface Message {
  id: string;
  text: string;
  userId: string;
  userEmail: string;
  userName: string;
  timestamp: any;
  type: 'message' | 'announcement' | 'achievement' | 'challenge';
  likes?: number;
  likedBy?: string[];
  replies?: Reply[];
  category?: string;
}

interface Reply {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: any;
}

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  lastSeen: any;
  status: 'online' | 'away' | 'offline';
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'announcements' | 'achievements' | 'challenges'>('general');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time messages listener
  useEffect(() => {
    if (!user) return;

    const messagesRef = collection(db, 'communityMessages');
    const q = query(
      messagesRef,
      where('type', '==', activeTab === 'general' ? 'message' : activeTab.slice(0, -1)),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      // Sort by timestamp on client side to avoid composite index requirement
      newMessages.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        const aTime = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return aTime.getTime() - bTime.getTime(); // ascending order for chat messages
      });
      
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeTab]);

  // Online users presence system
  useEffect(() => {
    if (!user) return;

    // Create presence manager
    const presenceManager = createPresenceManager(
      user.uid,
      user.displayName || user.email?.split('@')[0] || 'Anonymous',
      user.email || ''
    );
    
    // Start presence tracking
    presenceManager.start();

    // Listen to online users
    const presenceQuery = query(collection(db, 'userPresence'));
    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      const users: OnlineUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const lastSeen = data.lastSeen?.toDate();
        const now = new Date();
        const timeDiff = now.getTime() - (lastSeen?.getTime() || 0);
        
        let status: 'online' | 'away' | 'offline' = 'offline';
        if (timeDiff < 60000) status = 'online'; // Less than 1 minute
        else if (timeDiff < 300000) status = 'away'; // Less than 5 minutes
        
        users.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          lastSeen: data.lastSeen,
          status
        });
      });
      
      // Sort by lastSeen on client side to avoid index requirement
      users.sort((a, b) => {
        if (!a.lastSeen || !b.lastSeen) return 0;
        const aTime = a.lastSeen.toDate ? a.lastSeen.toDate() : new Date(a.lastSeen);
        const bTime = b.lastSeen.toDate ? b.lastSeen.toDate() : new Date(b.lastSeen);
        return bTime.getTime() - aTime.getTime();
      });
      
      setOnlineUsers(users.slice(0, 20)); // Show max 20 users
    });

    return () => {
      presenceManager.stop();
      unsubscribePresence();
    };
  }, [user]);

  // Typing indicator system
  const handleTyping = () => {
    if (!user) return;

    if (!isTyping) {
      setIsTyping(true);
      addDoc(collection(db, 'typingIndicators'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        timestamp: serverTimestamp()
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, 'communityMessages'), {
        text: newMessage,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        timestamp: serverTimestamp(),
        type: activeTab === 'general' ? 'message' : activeTab.slice(0, -1),
        likes: 0,
        likedBy: [],
        replies: []
      });

      setNewMessage('');
      setIsTyping(false);
      
      // Update community stats
      const communityStatsRef = doc(db, 'communityStats', 'global');
      await updateDoc(communityStatsRef, {
        totalMessages: increment(1),
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Like message
  const likeMessage = async (messageId: string, currentLikes: number, likedBy: string[] = []) => {
    if (!user) return;

    const messageRef = doc(db, 'communityMessages', messageId);
    const hasLiked = likedBy.includes(user.uid);

    try {
      if (hasLiked) {
        await updateDoc(messageRef, {
          likes: increment(-1),
          likedBy: likedBy.filter(id => id !== user.uid)
        });
      } else {
        await updateDoc(messageRef, {
          likes: increment(1),
          likedBy: [...likedBy, user.uid]
        });
      }
    } catch (error) {
      console.error('Error liking message:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Get message icon based on type
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'achievement': return '🏆';
      case 'challenge': return '🎯';
      default: return '💬';
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loginPrompt}>
          <h2>Join the Community</h2>
          <p>Please log in to participate in community discussions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CitizenOnly />
      <Header />
      
      {/* Global Announcements Section */}
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <GlobalAnnouncements position="sidebar" maxVisible={5} showCreateButton={true} />
      </div>
      
      <div className={styles.communityLayout}>
        {/* Sidebar with online users */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3>🌱 Online Now ({onlineUsers.filter(u => u.status === 'online').length})</h3>
            <div className={styles.usersList}>
              {onlineUsers.map(user => (
                <div key={user.id} className={styles.userItem}>
                  <div className={`${styles.statusDot} ${styles[user.status]}`}></div>
                  <span className={styles.userName}>{user.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.sidebarSection}>
            <h3>📊 Community Stats</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{messages.length}</div>
                <div className={styles.statLabel}>Messages Today</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{onlineUsers.length}</div>
                <div className={styles.statLabel}>Active Members</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className={styles.chatArea}>
          {/* Tab navigation */}
          <div className={styles.tabNavigation}>
            {(['general', 'announcements', 'achievements', 'challenges'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${styles.tabButton} ${activeTab === tab ? styles.active : ''}`}
              >
                {getMessageIcon(tab)} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Messages container */}
          <div className={styles.messagesContainer}>
            {loading ? (
              <div className={styles.loading}>Loading messages...</div>
            ) : (
              <>
                {messages.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3>No messages yet</h3>
                    <p>Be the first to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={message.id} className={styles.message}>
                      <div className={styles.messageHeader}>
                        <div className={styles.userInfo}>
                          <div className={styles.avatar}>
                            {message.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className={styles.userName}>{message.userName}</span>
                          <span className={styles.timestamp}>{formatTime(message.timestamp)}</span>
                        </div>
                        <div className={styles.messageActions}>
                          <button
                            onClick={() => likeMessage(message.id, message.likes || 0, message.likedBy)}
                            className={`${styles.likeButton} ${message.likedBy?.includes(user.uid) ? styles.liked : ''}`}
                          >
                            ❤️ {message.likes || 0}
                          </button>
                        </div>
                      </div>
                      <div className={styles.messageContent}>
                        {getMessageIcon(message.type)} {message.text}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                  <div className={styles.typingIndicator}>
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className={styles.messageForm}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder={`Share with the ${activeTab} community...`}
              className={styles.messageInput}
              maxLength={500}
            />
            <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}