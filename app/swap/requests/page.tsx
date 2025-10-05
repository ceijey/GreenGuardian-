'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '../../../components/Header';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStatsTracker } from '@/lib/useStatsTracker';
import styles from './requests.module.css';

interface SwapRequest {
  id: string;
  itemId: string;
  itemTitle: string;
  itemDescription: string;
  itemCategory: string;
  itemImageUrl: string;
  requesterId: string;
  requesterEmail: string;
  requesterName?: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  acceptedAt?: any;
  completedAt?: any;
  createdAt: any;
  swapRequests?: string[];
  acceptedRequests?: string[];
}

export default function SwapRequestsPage() {
  const { user } = useAuth();
  const { trackItemSwapped } = useStatsTracker();
  const [myItems, setMyItems] = useState<SwapRequest[]>([]);
  const [myRequests, setMyRequests] = useState<SwapRequest[]>([]);
  const [completedSwaps, setCompletedSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'completed'>('received');
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  // Load items with requests that I own
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'swapItems'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const processItems = async () => {
        const itemsWithRequests: SwapRequest[] = [];
        const docs = querySnapshot.docs;
        
        // Sort by createdAt on client side to avoid composite index
        docs.sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });
        
        // Process items synchronously to avoid race conditions
        for (const docSnap of docs) {
          const item = { id: docSnap.id, ...docSnap.data() } as any;
          
          if (item.swapRequests && item.swapRequests.length > 0) {
            // Get details of each requester
            for (const requesterId of item.swapRequests) {
              // Determine request status
              const isAccepted = item.acceptedRequests && item.acceptedRequests.includes(requesterId);
              
              // Create request entry without async user fetch for faster updates
              const requestEntry: SwapRequest = {
                id: `${item.id}_${requesterId}`,
                itemId: item.id,
                itemTitle: item.title || 'Untitled Item',
                itemDescription: item.description || 'No description',
                itemCategory: item.category || 'other',
                itemImageUrl: item.imageUrl || '',
                requesterId: requesterId,
                requesterEmail: `user_${requesterId.slice(-6)}`, // Simplified for faster load
                ownerId: item.ownerId,
                status: isAccepted ? 'accepted' : 'pending',
                acceptedAt: item.acceptedAt,
                createdAt: item.createdAt,
                swapRequests: item.swapRequests,
                acceptedRequests: item.acceptedRequests
              };
              
              itemsWithRequests.push(requestEntry);
              
              // Fetch user details asynchronously and update later
              getDoc(doc(db, 'userPresence', requesterId))
                .then((presenceDoc) => {
                  if (presenceDoc.exists()) {
                    const userData = presenceDoc.data();
                    setMyItems(prev => prev.map(req => 
                      req.id === requestEntry.id 
                        ? { ...req, requesterEmail: userData.email || userData.name || req.requesterEmail }
                        : req
                    ));
                  }
                })
                .catch(() => {
                  // Silently fail if user data not available
                });
            }
          }
        }
        
        setMyItems(itemsWithRequests);
        setLoading(false);
      };

      processItems();
    }, (error) => {
      console.error('Error listening to swap items:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load requests I've sent
  useEffect(() => {
    if (!user) return;

    // Remove orderBy to avoid potential index issues and sort on client
    const q = query(collection(db, 'swapItems'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const myRequestsList: SwapRequest[] = [];
      const docs = querySnapshot.docs;
      
      // Filter and process items on client side
      docs.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as any;
        
        // Only process items where I have made a request (pending or accepted)
        const isPending = item.swapRequests && item.swapRequests.includes(user.uid);
        const isAccepted = item.acceptedRequests && item.acceptedRequests.includes(user.uid);
        
        if (isPending || isAccepted) {
          const status = isAccepted ? 'accepted' : 'pending';
          
          myRequestsList.push({
            id: `${item.id}_${user.uid}`,
            itemId: item.id,
            itemTitle: item.title || 'Untitled Item',
            itemDescription: item.description || 'No description',
            itemCategory: item.category || 'other',
            itemImageUrl: item.imageUrl || '',
            requesterId: user.uid,
            requesterEmail: user.email || '',
            ownerId: item.ownerId,
            status: status,
            acceptedAt: item.acceptedAt,
            createdAt: item.createdAt,
            swapRequests: item.swapRequests,
            acceptedRequests: item.acceptedRequests
          });
        }
      });
      
      // Sort by createdAt on client side
      myRequestsList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      setMyRequests(myRequestsList);
    }, (error) => {
      console.error('Error listening to my requests:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Load completed swaps
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'completedSwaps'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const completedList: SwapRequest[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const swap = { id: docSnap.id, ...docSnap.data() } as any;
        
        // Include swaps where user was either owner or requester
        if (swap.ownerId === user.uid || swap.requesterId === user.uid) {
          completedList.push({
            id: swap.id,
            itemId: swap.itemId || '',
            itemTitle: swap.itemTitle || 'Completed Swap',
            itemDescription: swap.itemDescription || 'Swap completed successfully',
            itemCategory: swap.itemCategory || 'other',
            itemImageUrl: swap.itemImageUrl || '',
            requesterId: swap.requesterId,
            requesterEmail: swap.requesterEmail || 'Unknown',
            ownerId: swap.ownerId,
            status: 'completed' as const,
            createdAt: swap.completedAt || swap.createdAt,
            acceptedAt: swap.acceptedAt,
            swapRequests: [],
            acceptedRequests: []
          });
        }
      });
      
      // Sort by completion date
      completedList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      setCompletedSwaps(completedList);
    }, (error) => {
      console.error('Error listening to completed swaps:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptRequest = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      // Move requester from swapRequests to acceptedRequests
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        const currentRequests = data.swapRequests || [];
        const currentAccepted = data.acceptedRequests || [];
        
        // Remove from pending requests
        const updatedRequests = currentRequests.filter((id: string) => id !== request.requesterId);
        
        // Add to accepted requests if not already there
        const updatedAccepted = currentAccepted.includes(request.requesterId) 
          ? currentAccepted 
          : [...currentAccepted, request.requesterId];
        
        await updateDoc(itemRef, {
          swapRequests: updatedRequests,
          acceptedRequests: updatedAccepted,
          acceptedAt: serverTimestamp()
        });
        
        alert('Request accepted! You can now complete the swap when ready.');
      } else {
        alert('Item not found.');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleCompleteSwap = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      // Update item to mark as swapped and remove from availability
      const itemRef = doc(db, 'swapItems', request.itemId);
      await updateDoc(itemRef, {
        isAvailable: false,
        swappedWith: request.requesterId,
        swappedAt: serverTimestamp(),
        status: 'completed'
      });

      // Create a swap completion record
      await addDoc(collection(db, 'completedSwaps'), {
        itemId: request.itemId,
        itemTitle: request.itemTitle,
        ownerId: request.ownerId,
        requesterId: request.requesterId,
        completedAt: serverTimestamp()
      });

      // Track stats for both users
      await trackItemSwapped(1);

      alert('Swap completed successfully! The item has been marked as unavailable.');
    } catch (error) {
      console.error('Error completing swap:', error);
      alert('Failed to complete swap. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDeclineRequest = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        const currentRequests = data.swapRequests || [];
        const currentAccepted = data.acceptedRequests || [];
        
        // Remove from both pending and accepted requests
        const updatedRequests = currentRequests.filter((id: string) => id !== request.requesterId);
        const updatedAccepted = currentAccepted.filter((id: string) => id !== request.requesterId);
        
        await updateDoc(itemRef, {
          swapRequests: updatedRequests,
          acceptedRequests: updatedAccepted
        });
        
        const action = request.status === 'accepted' ? 'cancelled' : 'declined';
        alert(`Request ${action} successfully.`);
      } else {
        alert('Item not found.');
      }
    } catch (error) {
      console.error('Error declining/cancelling request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleCancelRequest = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      // Remove my request from the item
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        const currentRequests = itemDoc.data().swapRequests || [];
        const updatedRequests = currentRequests.filter((id: string) => id !== user?.uid);
        
        await updateDoc(itemRef, {
          swapRequests: updatedRequests
        });
        
        alert('Request cancelled successfully.');
      } else {
        alert('Item not found.');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Failed to cancel request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    
    try {
      let date: Date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return 'Recently';
      }
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recently';
    }
  };

  if (!user) {
    return (
      <>
        <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h1>Please Login</h1>
            <p>You need to be logged in to view swap requests.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Swap Requests</h1>
          <p>Manage your item swap requests and offers</p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'received' ? styles.active : ''}`}
            onClick={() => setActiveTab('received')}
          >
            <i className="fas fa-inbox"></i>
            Received ({myItems.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'sent' ? styles.active : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            <i className="fas fa-paper-plane"></i>
            Sent ({myRequests.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'completed' ? styles.active : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <i className="fas fa-check-circle"></i>
            Completed ({completedSwaps.length})
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading requests...</p>
            </div>
          ) : activeTab === 'received' ? (
            <div className={styles.requestsList}>
              {myItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-inbox"></i>
                  <h3>No swap requests received</h3>
                  <p>When someone requests to swap one of your items, it will appear here.</p>
                </div>
              ) : (
                myItems.map((request) => (
                  <div key={request.id} className={styles.requestCard}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemImage}>
                        {request.itemImageUrl ? (
                          <img src={request.itemImageUrl} alt={request.itemTitle} />
                        ) : (
                          <div className={styles.placeholder}>
                            <i className="fas fa-box"></i>
                          </div>
                        )}
                      </div>
                      <div className={styles.itemDetails}>
                        <h3>{request.itemTitle}</h3>
                        <p className={styles.category}>{request.itemCategory}</p>
                        <p className={styles.description}>{request.itemDescription}</p>
                      </div>
                    </div>
                    
                    <div className={`${styles.requesterInfo} ${request.status === 'accepted' ? styles.acceptedRequest : ''}`}>
                      <div className={styles.requester}>
                        <i className="fas fa-user"></i>
                        <span>
                          {request.requesterEmail.split('@')[0]} 
                          {request.status === 'accepted' ? ' - Request Accepted ✅' : ' wants to swap'}
                        </span>
                        {request.status === 'accepted' && (
                          <span className={styles.statusIndicator}>
                            <i className="fas fa-check-circle"></i>
                          </span>
                        )}
                      </div>
                      <div className={styles.requestDate}>
                        {request.status === 'accepted' && request.acceptedAt 
                          ? `✅ Accepted ${formatDate(request.acceptedAt)} - Ready to Complete!`
                          : `Requested ${formatDate(request.createdAt)}`
                        }
                      </div>
                    </div>

                    <div className={styles.actions}>
                      {request.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleAcceptRequest(request)}
                            className={`${styles.actionBtn} ${styles.acceptBtn}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-check"></i>Accept Request</>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request)}
                            className={`${styles.actionBtn} ${styles.declineBtn}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-times"></i>Decline</>
                            )}
                          </button>
                        </>
                      ) : request.status === 'accepted' ? (
                        <>
                          <button
                            onClick={() => handleCompleteSwap(request)}
                            className={`${styles.actionBtn} ${styles.completeBtn} ${styles.primary}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-handshake"></i>✅ Complete Swap Now</>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request)}
                            className={`${styles.actionBtn} ${styles.cancelBtn}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-ban"></i>Cancel Accept</>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className={styles.statusBadge}>
                          <i className="fas fa-check-circle"></i>
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'sent' ? (
            <div className={styles.requestsList}>
              {myRequests.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-paper-plane"></i>
                  <h3>No swap requests sent</h3>
                  <p>Items you request to swap will appear here.</p>
                </div>
              ) : (
                myRequests.map((request) => (
                  <div key={request.id} className={styles.requestCard}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemImage}>
                        {request.itemImageUrl ? (
                          <img src={request.itemImageUrl} alt={request.itemTitle} />
                        ) : (
                          <div className={styles.placeholder}>
                            <i className="fas fa-box"></i>
                          </div>
                        )}
                      </div>
                      <div className={styles.itemDetails}>
                        <h3>{request.itemTitle}</h3>
                        <p className={styles.category}>{request.itemCategory}</p>
                        <p className={styles.description}>{request.itemDescription}</p>
                      </div>
                    </div>
                    
                    <div className={styles.statusInfo}>
                      <div className={styles.status}>
                        {request.status === 'accepted' ? (
                          <>
                            <i className="fas fa-check-circle"></i>
                            <span>Request Accepted - Ready to Complete</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-clock"></i>
                            <span>Pending approval</span>
                          </>
                        )}
                      </div>
                      <div className={styles.requestDate}>
                        {request.status === 'accepted' && request.acceptedAt
                          ? `Accepted ${formatDate(request.acceptedAt)}`
                          : `Requested ${formatDate(request.createdAt)}`
                        }
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <button
                        onClick={() => handleCancelRequest(request)}
                        className={`${styles.actionBtn} ${styles.cancelBtn}`}
                        disabled={processingRequests.has(request.id)}
                      >
                        {processingRequests.has(request.id) ? (
                          <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                        ) : (
                          <>
                            <i className="fas fa-trash"></i>
                            {request.status === 'accepted' ? 'Withdraw from Accepted' : 'Cancel Request'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={styles.requestsList}>
              {completedSwaps.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-check-circle"></i>
                  <h3>No completed swaps</h3>
                  <p>Your completed swap transactions will appear here.</p>
                </div>
              ) : (
                completedSwaps.map((swap) => (
                  <div key={swap.id} className={`${styles.requestCard} ${styles.completedCard}`}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemImage}>
                        {swap.itemImageUrl ? (
                          <img src={swap.itemImageUrl} alt={swap.itemTitle} />
                        ) : (
                          <div className={styles.placeholder}>
                            <i className="fas fa-box"></i>
                          </div>
                        )}
                      </div>
                      <div className={styles.itemDetails}>
                        <h3>{swap.itemTitle}</h3>
                        <p className={styles.category}>{swap.itemCategory}</p>
                        <p className={styles.description}>{swap.itemDescription}</p>
                        {swap.requesterName && (
                          <p className={styles.swapPartner}>
                            <i className="fas fa-user"></i>
                            Swapped with: {swap.requesterName}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.statusInfo}>
                      <div className={styles.status}>
                        <i className="fas fa-check-double"></i>
                        <span>Swap Completed</span>
                      </div>
                      <div className={styles.requestDate}>
                        Completed {formatDate(swap.completedAt)}
                      </div>
                    </div>

                    <div className={styles.completedBadge}>
                      <i className="fas fa-medal"></i>
                      <span>Successful Exchange</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}