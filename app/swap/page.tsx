'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '../../components/Header';
import SwapItem from '../../components/SwapItem';
import AddItemModal from '../../components/AddItemModal';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './swap.module.css';

interface SwapItemData {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  imageUrl: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  isAvailable: boolean;
  estimatedValue: number;
  swapRequests?: string[];
}

export default function SwapPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SwapItemData[]>([]);
  const [filteredItems, setFilteredItems] = useState<SwapItemData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [landfillSavings, setLandfillSavings] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const categories = [
    'all',
    'electronics',
    'clothing',
    'books',
    'furniture',
    'kitchenware',
    'sports',
    'toys',
    'other'
  ];

  // Load items from Firestore
  useEffect(() => {
    const q = query(collection(db, 'swapItems'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData: SwapItemData[] = [];
      querySnapshot.forEach((doc) => {
        itemsData.push({ id: doc.id, ...doc.data() } as SwapItemData);
      });
      setItems(itemsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate landfill savings
  useEffect(() => {
    const totalSavings = items
      .filter(item => !item.isAvailable) // Items that have been swapped
      .reduce((total, item) => total + (item.estimatedValue || 0), 0);
    setLandfillSavings(totalSavings);
  }, [items]);

  // Count pending requests for current user's items
  useEffect(() => {
    if (!user) {
      setPendingRequestsCount(0);
      return;
    }

    const userItems = items.filter(item => item.ownerId === user.uid);
    const totalRequests = userItems.reduce((total, item) => {
      return total + (item.swapRequests?.length || 0);
    }, 0);
    
    setPendingRequestsCount(totalRequests);
  }, [items, user]);

  // Filter items based on category and search
  useEffect(() => {
    let filtered = items.filter(item => item.isAvailable);
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
  }, [items, selectedCategory, searchTerm]);

  const handleSwapRequest = async (itemId: string) => {
    if (!user) return;
    
    try {
      const itemRef = doc(db, 'swapItems', itemId);
      await updateDoc(itemRef, {
        swapRequests: arrayUnion(user.uid)
      });
      
      // You could add notification system here
      alert('Swap request sent! The item owner will be notified.');
    } catch (error) {
      console.error('Error sending swap request:', error);
      alert('Failed to send swap request. Please try again.');
    }
  };

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Hero Section with Stats */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Swap Marketplace</h1>
            <p className={styles.subtitle}>Trade unwanted items and save the planet</p>
            <p className={styles.description}>
              Give your items a second life by swapping with others in your community. 
              Every swap keeps items out of landfills and reduces waste.
            </p>
            
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{items.length}</div>
                <div className={styles.statLabel}>Items Available</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>${landfillSavings}</div>
                <div className={styles.statLabel}>Landfill Savings</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{items.filter(item => !item.isAvailable).length}</div>
                <div className={styles.statLabel}>Items Swapped</div>
              </div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className={styles.controls}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search for items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <i className="fas fa-search"></i>
          </div>

          <div className={styles.filters}>
            <label>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categorySelect}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className={styles.addButton}
            disabled={!user}
          >
            <i className="fas fa-plus"></i>
            Add Item
          </button>
          
          {user && (
            <button
              onClick={() => window.location.href = '/swap/requests'}
              className={styles.requestsButton}
            >
              <i className="fas fa-inbox"></i>
              My Requests
              {pendingRequestsCount > 0 && (
                <span className={styles.badge}>{pendingRequestsCount}</span>
              )}
            </button>
          )}
        </section>

        {/* Items Grid */}
        <section className={styles.marketplace}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-box-open"></i>
              <h3>No items found</h3>
              <p>
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Be the first to add an item to the marketplace!'
                }
              </p>
            </div>
          ) : (
            <div className={styles.itemsGrid}>
              {filteredItems.map(item => (
                <SwapItem
                  key={item.id}
                  item={item}
                  currentUser={user}
                  onSwapRequest={handleSwapRequest}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentUser={user}
      />
    </>
  );
}