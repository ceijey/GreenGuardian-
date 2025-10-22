'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '../../../components/Header';
import ContactSwapperModal from '../../../components/ContactSwapperModal';
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
  offerDetails?: string;
  offerValue?: number;
  offerImage?: string;
  ownerConfirmed?: boolean;
  requesterConfirmed?: boolean;
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | null>(null);
  const [contactUserRole, setContactUserRole] = useState<'owner' | 'requester'>('owner');

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
          
          // Combine both pending and accepted requests
          const allRequesterIds = new Set([
            ...(item.swapRequests || []),
            ...(item.acceptedRequests || [])
          ]);
          
          if (allRequesterIds.size > 0) {
            // Get details of each requester
            for (const requesterId of Array.from(allRequesterIds)) {
              // Determine request status
              const isAccepted = item.acceptedRequests && item.acceptedRequests.includes(requesterId);
              
              // Get offer details from swapRequestDetails
              const requestDetails = item.swapRequestDetails?.[requesterId];
              
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
                acceptedRequests: item.acceptedRequests,
                offerDetails: requestDetails?.offerDetails,
                offerValue: requestDetails?.offerValue,
                offerImage: requestDetails?.offerImage,
                ownerConfirmed: requestDetails?.ownerConfirmed || false,
                requesterConfirmed: requestDetails?.requesterConfirmed || false
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
          const requestDetails = item.swapRequestDetails?.[user.uid];
          
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
            acceptedRequests: item.acceptedRequests,
            ownerConfirmed: requestDetails?.ownerConfirmed || false,
            requesterConfirmed: requestDetails?.requesterConfirmed || false
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
            acceptedRequests: [],
            offerDetails: swap.offerDetails,
            offerValue: swap.offerValue,
            offerImage: swap.offerImage
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
        
        alert('Request accepted! You can now contact and confirm the swap when ready.');
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

  const handleConfirmSwap = async (request: SwapRequest, userRole: 'owner' | 'requester') => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        alert('Item not found.');
        return;
      }

      const data = itemDoc.data();
      const requestDetails = data.swapRequestDetails?.[request.requesterId] || {};
      
      // Update confirmation status
      if (userRole === 'owner') {
        requestDetails.ownerConfirmed = true;
      } else {
        requestDetails.requesterConfirmed = true;
      }
      
      await updateDoc(itemRef, {
        [`swapRequestDetails.${request.requesterId}`]: requestDetails
      });
      
      // Check if both confirmed - if yes, auto-complete the swap
      if (requestDetails.ownerConfirmed && requestDetails.requesterConfirmed) {
        // Auto-complete the swap
        await completeSwapTransaction(request, itemRef, data);
        alert('Both parties confirmed! Swap completed successfully and moved to completed swaps.');
      } else {
        const waitingFor = userRole === 'owner' ? 'requester' : 'owner';
        alert(`You confirmed the swap! Waiting for ${waitingFor} to confirm.`);
      }
    } catch (error) {
      console.error('Error confirming swap:', error);
      alert('Failed to confirm swap. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const completeSwapTransaction = async (request: SwapRequest, itemRef: any, data: any) => {
    const currentRequests = data.swapRequests || [];
    const currentAccepted = data.acceptedRequests || [];
    
    // Remove from both pending and accepted requests
    const updatedRequests = currentRequests.filter((id: string) => id !== request.requesterId);
    const updatedAccepted = currentAccepted.filter((id: string) => id !== request.requesterId);

    // Update item to mark as swapped and remove from availability
    await updateDoc(itemRef, {
      isAvailable: false,
      swappedWith: request.requesterId,
      swappedAt: serverTimestamp(),
      status: 'completed',
      swapRequests: updatedRequests,
      acceptedRequests: updatedAccepted
    });

    // Get offer details from swapRequestDetails
    const requestDetails = data.swapRequestDetails?.[request.requesterId];

    // Create a swap completion record - only include fields that have values
    const completedSwapData: any = {
      itemId: request.itemId,
      itemTitle: request.itemTitle,
      itemDescription: request.itemDescription || '',
      itemCategory: request.itemCategory || 'other',
      itemImageUrl: request.itemImageUrl || '',
      ownerId: request.ownerId,
      requesterId: request.requesterId,
      requesterEmail: request.requesterEmail || '',
      completedAt: serverTimestamp()
    };

    // Only add optional fields if they have values
    if (requestDetails?.offerDetails) {
      completedSwapData.offerDetails = requestDetails.offerDetails;
    }
    if (requestDetails?.offerValue) {
      completedSwapData.offerValue = requestDetails.offerValue;
    }
    if (requestDetails?.offerImage) {
      completedSwapData.offerImage = requestDetails.offerImage;
    }

    await addDoc(collection(db, 'completedSwaps'), completedSwapData);

    // Track stats for both users
    await trackItemSwapped(1);
  };

  const handleCompleteSwap = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        alert('Item not found.');
        return;
      }

      const data = itemDoc.data();
      const currentRequests = data.swapRequests || [];
      const currentAccepted = data.acceptedRequests || [];
      
      // Remove from both pending and accepted requests
      const updatedRequests = currentRequests.filter((id: string) => id !== request.requesterId);
      const updatedAccepted = currentAccepted.filter((id: string) => id !== request.requesterId);

      // Update item to mark as swapped and remove from availability
      await updateDoc(itemRef, {
        isAvailable: false,
        swappedWith: request.requesterId,
        swappedAt: serverTimestamp(),
        status: 'completed',
        swapRequests: updatedRequests,
        acceptedRequests: updatedAccepted
      });

      // Get offer details from swapRequestDetails
      const requestDetails = data.swapRequestDetails?.[request.requesterId];

      // Create a swap completion record - only include fields that have values
      const completedSwapData: any = {
        itemId: request.itemId,
        itemTitle: request.itemTitle,
        itemDescription: request.itemDescription || '',
        itemCategory: request.itemCategory || 'other',
        itemImageUrl: request.itemImageUrl || '',
        ownerId: request.ownerId,
        requesterId: request.requesterId,
        requesterEmail: request.requesterEmail || '',
        completedAt: serverTimestamp()
      };

      if (requestDetails?.offerDetails) {
        completedSwapData.offerDetails = requestDetails.offerDetails;
      }
      if (requestDetails?.offerValue) {
        completedSwapData.offerValue = requestDetails.offerValue;
      }
      if (requestDetails?.offerImage) {
        completedSwapData.offerImage = requestDetails.offerImage;
      }

      await addDoc(collection(db, 'completedSwaps'), completedSwapData);

      // Track stats for both users
      await trackItemSwapped(1);

      alert('Swap completed successfully! The item has been marked as unavailable and moved to completed swaps.');
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
        const wasAccepted = request.status === 'accepted';
        
        // Remove from both pending and accepted requests
        const updatedRequests = currentRequests.filter((id: string) => id !== request.requesterId);
        const updatedAccepted = currentAccepted.filter((id: string) => id !== request.requesterId);
        
        await updateDoc(itemRef, {
          swapRequests: updatedRequests,
          acceptedRequests: updatedAccepted
        });
        
        // If withdrawing from an accepted request, move to completed swaps
        if (wasAccepted) {
          const requestDetails = data.swapRequestDetails?.[request.requesterId];
          
          const completedSwapData: any = {
            itemId: request.itemId,
            itemTitle: request.itemTitle,
            itemDescription: request.itemDescription || '',
            itemCategory: request.itemCategory || 'other',
            itemImageUrl: request.itemImageUrl || '',
            ownerId: request.ownerId,
            requesterId: request.requesterId,
            requesterEmail: request.requesterEmail || '',
            status: 'withdrawn',
            completedAt: serverTimestamp()
          };

          if (requestDetails?.offerDetails) {
            completedSwapData.offerDetails = requestDetails.offerDetails;
          }
          if (requestDetails?.offerValue) {
            completedSwapData.offerValue = requestDetails.offerValue;
          }
          if (requestDetails?.offerImage) {
            completedSwapData.offerImage = requestDetails.offerImage;
          }

          await addDoc(collection(db, 'completedSwaps'), completedSwapData);
          
          alert('Request withdrawn successfully and moved to completed swaps.');
        } else {
          alert('Request declined successfully.');
        }
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

  const handleContactSwapper = (request: SwapRequest, role: 'owner' | 'requester') => {
    setSelectedRequest(request);
    setContactUserRole(role);
    setShowContactModal(true);
  };

  const handleCompleteSwapAsRequester = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        alert('Item not found.');
        return;
      }

      const data = itemDoc.data();
      const currentRequests = data.swapRequests || [];
      const currentAccepted = data.acceptedRequests || [];
      
      // Remove from both pending and accepted requests
      const updatedRequests = currentRequests.filter((id: string) => id !== user?.uid);
      const updatedAccepted = currentAccepted.filter((id: string) => id !== user?.uid);

      // Update item to mark as swapped and remove from availability
      await updateDoc(itemRef, {
        isAvailable: false,
        swappedWith: user?.uid,
        swappedAt: serverTimestamp(),
        status: 'completed',
        swapRequests: updatedRequests,
        acceptedRequests: updatedAccepted
      });

      // Get offer details from swapRequestDetails
      const requestDetails = data.swapRequestDetails?.[user?.uid || ''];

      // Create a swap completion record - only include fields that have values
      const completedSwapData: any = {
        itemId: request.itemId,
        itemTitle: request.itemTitle,
        itemDescription: request.itemDescription || '',
        itemCategory: request.itemCategory || 'other',
        itemImageUrl: request.itemImageUrl || '',
        ownerId: request.ownerId,
        requesterId: user?.uid,
        requesterEmail: user?.email || '',
        completedAt: serverTimestamp()
      };

      if (requestDetails?.offerDetails) {
        completedSwapData.offerDetails = requestDetails.offerDetails;
      }
      if (requestDetails?.offerValue) {
        completedSwapData.offerValue = requestDetails.offerValue;
      }
      if (requestDetails?.offerImage) {
        completedSwapData.offerImage = requestDetails.offerImage;
      }

      await addDoc(collection(db, 'completedSwaps'), completedSwapData);

      // Track stats for both users
      await trackItemSwapped(1);

      alert('Swap completed successfully! The transaction has been marked as complete and moved to completed swaps.');
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

  const handleCancelRequest = async (request: SwapRequest) => {
    const requestId = request.id;
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      // Remove my request from the item
      const itemRef = doc(db, 'swapItems', request.itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        const currentRequests = data.swapRequests || [];
        const currentAccepted = data.acceptedRequests || [];
        const wasAccepted = request.status === 'accepted';
        
        // Remove from both pending and accepted requests
        const updatedRequests = currentRequests.filter((id: string) => id !== user?.uid);
        const updatedAccepted = currentAccepted.filter((id: string) => id !== user?.uid);
        
        await updateDoc(itemRef, {
          swapRequests: updatedRequests,
          acceptedRequests: updatedAccepted
        });
        
        // If withdrawing from an accepted request, move to completed swaps
        if (wasAccepted) {
          const requestDetails = data.swapRequestDetails?.[user?.uid || ''];
          
          const completedSwapData: any = {
            itemId: request.itemId,
            itemTitle: request.itemTitle,
            itemDescription: request.itemDescription || '',
            itemCategory: request.itemCategory || 'other',
            itemImageUrl: request.itemImageUrl || '',
            ownerId: request.ownerId,
            requesterId: user?.uid,
            requesterEmail: user?.email || '',
            status: 'withdrawn',
            completedAt: serverTimestamp()
          };

          if (requestDetails?.offerDetails) {
            completedSwapData.offerDetails = requestDetails.offerDetails;
          }
          if (requestDetails?.offerValue) {
            completedSwapData.offerValue = requestDetails.offerValue;
          }
          if (requestDetails?.offerImage) {
            completedSwapData.offerImage = requestDetails.offerImage;
          }

          await addDoc(collection(db, 'completedSwaps'), completedSwapData);
          
          alert('Withdrawn from accepted request successfully and moved to completed swaps.');
        } else {
          alert('Request cancelled successfully.');
        }
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
                      {request.offerDetails && (
                        <div className={styles.offerInfo}>
                          <div className={styles.offerLabel}>
                            <i className="fas fa-exchange-alt"></i>
                            <strong>Offering:</strong>
                          </div>
                          {request.offerImage && (
                            <div className={styles.offerImageContainer}>
                              <img 
                                src={request.offerImage} 
                                alt="Offer" 
                                className={styles.offerImage}
                              />
                            </div>
                          )}
                          <p className={styles.offerDetails}>{request.offerDetails}</p>
                          {request.offerValue && (
                            <p className={styles.offerValue}>
                              <i className="fas fa-tag"></i>
                              Estimated Value: ₱{request.offerValue.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.actions}>
                      {request.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleContactSwapper(request, 'owner')}
                            className={`${styles.actionBtn} ${styles.contactBtn}`}
                          >
                            <i className="fas fa-envelope"></i>Contact Swapper
                          </button>
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
                            onClick={() => handleContactSwapper(request, 'owner')}
                            className={`${styles.actionBtn} ${styles.contactBtn}`}
                          >
                            <i className="fas fa-envelope"></i>Contact Swapper
                          </button>
                          <button
                            onClick={() => handleCompleteSwap(request)}
                            className={`${styles.actionBtn} ${styles.confirmBtn}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-check-circle"></i>Complete Swap</>
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
                      {request.status === 'accepted' ? (
                        <>
                          <button
                            onClick={() => handleContactSwapper(request, 'requester')}
                            className={`${styles.actionBtn} ${styles.contactBtn}`}
                          >
                            <i className="fas fa-envelope"></i>Contact Owner
                          </button>
                          {request.requesterConfirmed ? (
                            <>
                              <div className={styles.confirmedBadge}>
                                <i className="fas fa-check-double"></i>
                                You Confirmed - Waiting for Owner
                              </div>
                              <button
                                onClick={() => handleCompleteSwapAsRequester(request)}
                                className={`${styles.actionBtn} ${styles.confirmBtn}`}
                                disabled={processingRequests.has(request.id)}
                              >
                                {processingRequests.has(request.id) ? (
                                  <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                                ) : (
                                  <><i className="fas fa-check-circle"></i>Complete Swap Now</>
                                )}
                              </button>
                            </>
                          ) : request.ownerConfirmed ? (
                            <button
                              onClick={() => handleConfirmSwap(request, 'requester')}
                              className={`${styles.actionBtn} ${styles.confirmBtn}`}
                              disabled={processingRequests.has(request.id)}
                            >
                              {processingRequests.has(request.id) ? (
                                <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                              ) : (
                                <><i className="fas fa-handshake"></i>Confirm Swap (Owner Ready!)</>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConfirmSwap(request, 'requester')}
                              className={`${styles.actionBtn} ${styles.confirmBtn}`}
                              disabled={processingRequests.has(request.id)}
                            >
                              {processingRequests.has(request.id) ? (
                                <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                              ) : (
                                <><i className="fas fa-handshake"></i>Confirm Swap</>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelRequest(request)}
                            className={`${styles.actionBtn} ${styles.cancelBtn}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-trash"></i>Withdraw</>
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleContactSwapper(request, 'requester')}
                            className={`${styles.actionBtn} ${styles.contactBtn}`}
                          >
                            <i className="fas fa-envelope"></i>Contact Owner
                          </button>
                          <button
                            onClick={() => handleCancelRequest(request)}
                            className={`${styles.actionBtn} ${styles.cancelBtn}`}
                            disabled={processingRequests.has(request.id)}
                          >
                            {processingRequests.has(request.id) ? (
                              <><i className="fas fa-spinner fa-spin"></i>Processing...</>
                            ) : (
                              <><i className="fas fa-trash"></i>Cancel Request</>
                            )}
                          </button>
                        </>
                      )}
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
                    
                    {swap.offerDetails && (
                      <div className={styles.offerInfo}>
                        <div className={styles.offerLabel}>
                          <i className="fas fa-exchange-alt"></i>
                          <strong>Offer Details:</strong>
                        </div>
                        {swap.offerImage && (
                          <div className={styles.offerImageContainer}>
                            <img 
                              src={swap.offerImage} 
                              alt="Offer" 
                              className={styles.offerImage}
                            />
                          </div>
                        )}
                        <p className={styles.offerDetails}>{swap.offerDetails}</p>
                        {swap.offerValue && (
                          <p className={styles.offerValue}>
                            <i className="fas fa-tag"></i>
                            Estimated Value: ₱{swap.offerValue.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    
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

      {/* Contact Swapper Modal */}
      {selectedRequest && (
        <ContactSwapperModal
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setSelectedRequest(null);
          }}
          swapRequest={{
            itemId: selectedRequest.itemId,
            itemTitle: selectedRequest.itemTitle,
            ownerId: selectedRequest.ownerId,
            requesterId: selectedRequest.requesterId
          }}
          currentUser={user}
          userRole={contactUserRole}
        />
      )}
    </>
  );
}