'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useStatsTracker } from '../../lib/useStatsTracker';

// Gemini AI manager for live scanning
class GeminiScannerManager {
  private static instance: GeminiScannerManager;
  private isScanning: boolean = false;
  private lastScanTime: number = 0;
  private scanInterval: number = 3000; // Scan every 3 seconds
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 3;

  static getInstance(): GeminiScannerManager {
    if (!GeminiScannerManager.instance) {
      GeminiScannerManager.instance = new GeminiScannerManager();
    }
    return GeminiScannerManager.instance;
  }

  reset(): void {
    this.consecutiveErrors = 0;
    console.log('🔄 Scanner reset - error count cleared');
  }

  needsReinit(): boolean {
    return this.consecutiveErrors >= this.maxConsecutiveErrors;
  }

  canScan(): boolean {
    const now = Date.now();
    if (now - this.lastScanTime < this.scanInterval) {
      return false;
    }
    return !this.isScanning;
  }

  async scan(imageData: string): Promise<any> {
    if (!this.canScan()) {
      return null;
    }

    this.isScanning = true;
    this.lastScanTime = Date.now();

    try {
      // Call the API route instead of direct Gemini call
      const response = await fetch('/api/eco-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.method === 'gemini-ai') {
        // Success! Reset error counter
        this.consecutiveErrors = 0;
        return data.result;
      }
      
      // No result but not an error
      return null;
    } catch (error) {
      console.error('❌ Gemini scan error:', error);
      this.consecutiveErrors++;
      console.log(`⚠️ Consecutive errors: ${this.consecutiveErrors}/${this.maxConsecutiveErrors}`);
      
      if (this.needsReinit()) {
        console.log('🚨 Too many errors - needs reinitialization');
      }
      
      return null;
    } finally {
      this.isScanning = false;
    }
  }
}

interface EcoScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProductFootprint {
  label: string;
  recyclable: boolean;
  carbonFootprint: number; // kg CO2 equivalent
  waterFootprint: number; // liters
  recyclability: string; // percentage or description
  ecoScore: number; // 1-10 scale (converted from Gemini's 1-5 rating)
  alternatives?: string[];
  category: string;
  materialType?: string;
  instructions?: string;
}

export default function EcoScannerDialog({ isOpen, onClose }: EcoScannerDialogProps) {
  const { user } = useAuth();
  const { trackEcoScan, trackCo2Savings } = useStatsTracker();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerManagerRef = useRef<GeminiScannerManager>(GeminiScannerManager.getInstance());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [loggedItems, setLoggedItems] = useState<Set<string>>(new Set());
  const [scannedProducts, setScannedProducts] = useState<ProductFootprint[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductFootprint | null>(null);
  const [pendingProduct, setPendingProduct] = useState<ProductFootprint | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [geminiReady, setGeminiReady] = useState(false);
  const [userMilestones, setUserMilestones] = useState({ totalScans: 0, totalCO2Tracked: 0, totalWaterTracked: 0 });

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset states when dialog closes
      setLoading(true);
      setError(null);
      setLoadingProgress('');
      setCameraReady(false);
      setScannedProducts([]);
      setLoggedItems(new Set());
      setSelectedProduct(null);
      setPendingProduct(null);
      setShowConfirmation(false);
      setIsPaused(false);
      setIsScanning(false);
      setGeminiReady(false);
      return;
    }

    // Check Gemini AI availability by testing the API
    const checkGeminiAvailability = async () => {
      try {
        setLoading(true);
        setLoadingProgress('Checking Gemini AI availability...');
        
        const response = await fetch('/api/eco-scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkAvailability: true }),
        });
        
        const data = await response.json();
        
        if (!data.available) {
          setError('Gemini AI is not configured. Retrying in 5 seconds...');
          setLoading(false);
          setGeminiReady(false);
          
          // Auto-retry after 5 seconds
          setTimeout(() => {
            console.log('🔄 Auto-retrying Gemini initialization...');
            checkGeminiAvailability();
          }, 5000);
          return;
        }
        
        console.log('✅ Gemini AI scanner ready');
        setGeminiReady(true);
        setLoading(false);
        setLoadingProgress('');
        setError(null);
      } catch (err) {
        console.error('Failed to check Gemini availability:', err);
        setError('Failed to initialize Gemini AI. Retrying in 5 seconds...');
        setLoading(false);
        
        // Auto-retry after 5 seconds
        setTimeout(() => {
          console.log('🔄 Auto-retrying after error...');
          checkGeminiAvailability();
        }, 5000);
      }
    };

    checkGeminiAvailability();
  }, [isOpen]);

  // Load user milestones from actual scan data
  useEffect(() => {
    const loadUserMilestones = async () => {
      if (!user) return;
      
      try {
        // Query all user's product scans
        const q = query(
          collection(db, 'userProductScans'),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Calculate totals from actual scan data
        let totalScans = 0;
        let totalCO2 = 0;
        let totalWater = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          totalScans++;
          totalCO2 += data.carbonFootprint || 0;
          totalWater += data.waterFootprint || 0;
        });
        
        console.log(`📊 Loaded from Firestore: ${totalScans} scans, ${totalCO2.toFixed(3)}kg CO2, ${totalWater.toFixed(1)}L water`);
        
        setUserMilestones({
          totalScans,
          totalCO2Tracked: totalCO2,
          totalWaterTracked: totalWater
        });
      } catch (error) {
        console.error('Error loading user milestones:', error);
      }
    };

    if (isOpen) {
      loadUserMilestones();
    }
  }, [isOpen, user]);

  // Enhanced camera management
  useEffect(() => {
    if (!isOpen) {
      // Clean up camera when dialog closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log('🛑 Camera stream stopped');
      }
      
      setCameraReady(false);
      return;
    }

    // Start camera when dialog is open
    let isMounted = true;
    
    const initializeCamera = async () => {
      try {
        setLoadingProgress('Initializing camera...');
        console.log('📸 Starting camera initialization...');
        
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Progressive camera constraints (try back camera first, then front, then any)
        // Increased resolution for better detection accuracy
        const constraints = [
          { 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 30 }
            } 
          },
          { 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 30 }
            } 
          },
          { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
          { video: true }
        ];

        let stream: MediaStream | null = null;
        
        for (const constraint of constraints) {
          try {
            console.log('📸 Trying camera constraint:', constraint);
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            console.log('✅ Camera constraint succeeded:', constraint);
            break;
          } catch (err) {
            console.log('❌ Camera constraint failed:', constraint, err);
          }
        }

        if (!stream) {
          throw new Error('No camera access available. Please check permissions.');
        }

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          await new Promise((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not available'));
              return;
            }
            
            const video = videoRef.current;
            video.onloadedmetadata = () => {
              video.play()
                .then(resolve)
                .catch(reject);
            };
            video.onerror = reject;
            
            // Fallback timeout
            setTimeout(() => reject(new Error('Video load timeout')), 10000);
          });

          if (isMounted) {
            console.log('✅ Camera ready and streaming');
            setCameraReady(true);
            setLoadingProgress('');
          }
        }

      } catch (err) {
        console.error('❌ Camera initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Camera initialization failed');
          setCameraReady(false);
        }
      }
    };

    initializeCamera();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Update impact database with scanned product data
  const updateImpactDatabase = async (product: ProductFootprint) => {
    if (!user) return;

    try {
      // Update user stats
      const userStatsRef = doc(db, 'userStats', user.uid);
      const userStatsDoc = await getDoc(userStatsRef);

      if (userStatsDoc.exists()) {
        await updateDoc(userStatsRef, {
          totalScans: increment(1),
          carbonFootprintTracked: increment(product.carbonFootprint),
          waterFootprintTracked: increment(product.waterFootprint),
          lastScanDate: serverTimestamp(),
        });
      } else {
        await setDoc(userStatsRef, {
          totalScans: 1,
          carbonFootprintTracked: product.carbonFootprint,
          waterFootprintTracked: product.waterFootprint,
          ecoScore: 0,
          actionsCompleted: 0,
          lastScanDate: serverTimestamp(),
        });
      }

      // Update community stats
      const communityStatsRef = doc(db, 'communityStats', 'global');
      const communityStatsDoc = await getDoc(communityStatsRef);

      if (communityStatsDoc.exists()) {
        await updateDoc(communityStatsRef, {
          totalProductsScanned: increment(1),
          totalCarbonTracked: increment(product.carbonFootprint),
          totalWaterTracked: increment(product.waterFootprint),
          lastUpdated: serverTimestamp(),
        });
      } else {
        await setDoc(communityStatsRef, {
          totalProductsScanned: 1,
          totalCarbonTracked: product.carbonFootprint,
          totalWaterTracked: product.waterFootprint,
          totalUsersActive: 1,
          lastUpdated: serverTimestamp(),
        });
      }

    } catch (error) {
      console.error('Error updating impact database:', error);
    }
  };

  // Gemini AI live scanning
  useEffect(() => {
    if (!isOpen || !cameraReady || isPaused || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scannerManager = scannerManagerRef.current;

    if (!ctx) return;

    let animationFrameId: number;
    let isProcessing = false;

    const scanWithGemini = async () => {
      // Continue animation loop
      animationFrameId = requestAnimationFrame(scanWithGemini);

      // Check if everything is still ready
      if (!video || !canvas || !cameraReady || !isOpen || isPaused || isProcessing) {
        return;
      }
      
      // Check if video is playing and has dimensions
      if (!video.videoWidth || !video.videoHeight || video.paused || video.ended) {
        return;
      }

      try {
        // Update canvas with video frame
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Only scan if manager allows (rate limiting)
        if (!scannerManager.canScan()) {
          // Show scanning indicator with countdown
          if (isScanning) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 220, 40);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('🤖 AI Analyzing...', 20, 35);
          } else {
            // Show next scan countdown
            const timeSinceLastScan = Date.now() - scannerManager['lastScanTime'];
            const timeUntilNextScan = Math.ceil((3000 - timeSinceLastScan) / 1000);
            if (timeUntilNextScan > 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.fillRect(10, 10, 280, 40);
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 16px Arial';
              ctx.fillText(`⏳ Next scan in ${timeUntilNextScan}s...`, 20, 35);
            }
          }
          return;
        }

        isProcessing = true;
        setIsScanning(true);

        // Capture current frame as base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        console.log('📸 Captured frame, size:', imageData.length);

        // Scan with Gemini AI
        console.log('🔄 Calling Gemini scanner...');
        const result = await scannerManager.scan(imageData);
        console.log('📊 Scan result:', result);

        // Check if scanner needs reinitialization
        if (scannerManager.needsReinit()) {
          console.log('🔄 Too many failures - reinitializing scanner...');
          setError('Scanner encountered errors. Reinitializing...');
          scannerManager.reset();
          
          // Trigger reinitialization
          setTimeout(() => {
            setError(null);
            setGeminiReady(false);
            window.location.reload(); // Force full reinit
          }, 2000);
          return;
        }

        // Only process recyclable items
        if (result && result.recyclable && result.category !== "Not recyclable" && !isPaused && !showConfirmation) {
          console.log('✅ Valid recyclable item detected:', result.category);
          
          // Parse carbon footprint and convert to kg
          let carbonFootprintKg = 1.0;
          if (result.carbonFootprint) {
            const carbonStr = result.carbonFootprint.toLowerCase();
            const numericValue = parseFloat(carbonStr.replace(/[^\d.]/g, ''));
            
            if (carbonStr.includes('g') && !carbonStr.includes('kg')) {
              // Convert grams to kg (82g -> 0.082kg)
              carbonFootprintKg = numericValue / 1000;
            } else {
              // Already in kg (55kg -> 55kg)
              carbonFootprintKg = numericValue;
            }
          }
          
          // Convert Gemini result to ProductFootprint format
          const productData: ProductFootprint = {
            label: result.category,
            recyclable: result.recyclable,
            carbonFootprint: carbonFootprintKg,
            waterFootprint: Math.random() * 100 + 10, // Estimate (Gemini doesn't provide this)
            recyclability: result.recyclable ? '80% recyclable' : 'Non-recyclable',
            ecoScore: result.ecoRating ? result.ecoRating * 2 : 5, // Convert 1-5 to 1-10 scale
            alternatives: result.alternatives || [],
            category: result.materialType || 'general',
            materialType: result.materialType,
            instructions: result.instructions
          };

          // Draw detection box and info
          const getEcoColor = (score: number) => {
            if (score <= 4) return '#ef4444'; // red
            if (score <= 7) return '#f59e0b'; // yellow
            return '#22c55e'; // green
          };

          const color = getEcoColor(productData.ecoScore);

          // Draw bounding box (center of frame)
          const boxWidth = canvas.width * 0.6;
          const boxHeight = canvas.height * 0.6;
          const boxX = (canvas.width - boxWidth) / 2;
          const boxY = (canvas.height - boxHeight) / 2;

          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

          // Draw label background
          ctx.fillStyle = color;
          ctx.fillRect(boxX, boxY - 60, boxWidth, 60);

          // Draw label text
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(productData.label, boxX + 10, boxY - 35);
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`Confidence: ${Math.round(result.confidence * 100)}%`, boxX + 10, boxY - 12);

          // Show confirmation
          setPendingProduct(productData);
          setShowConfirmation(true);
          setIsPaused(true);
          setIsScanning(false);
        }

      } catch (error) {
        console.error('❌ Gemini scan error:', error);
      } finally {
        isProcessing = false;
        setTimeout(() => setIsScanning(false), 500);
      }
    };

    scanWithGemini();

    return () => {
      cancelAnimationFrame(animationFrameId);
      isProcessing = false;
    };
  }, [isOpen, cameraReady, isPaused, showConfirmation, isScanning]);

  // Handle scan confirmation
  const handleConfirmScan = async () => {
    if (!pendingProduct || !user) return;

    try {
      // Always add to scanned products list (allow duplicates)
      setScannedProducts(prev => [...prev, pendingProduct]);

      // Log to Firebase with user-specific collection
      await addDoc(collection(db, 'userProductScans'), {
        userId: user.uid,
        userEmail: user.email,
        item: pendingProduct.label,
        category: pendingProduct.category,
        carbonFootprint: pendingProduct.carbonFootprint,
        waterFootprint: pendingProduct.waterFootprint,
        recyclable: pendingProduct.recyclable,
        ecoScore: pendingProduct.ecoScore,
        timestamp: serverTimestamp(),
        scanDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      });

      // Update impact database and milestones
      await updateImpactDatabase(pendingProduct);
      
      // Track stats in the new system
      await trackEcoScan(); // Track the scan action
      await trackCo2Savings(pendingProduct.carbonFootprint / 1000); // Convert to kg
      
      // Update local milestones
      setUserMilestones(prev => ({
        totalScans: prev.totalScans + 1,
        totalCO2Tracked: prev.totalCO2Tracked + pendingProduct.carbonFootprint,
        totalWaterTracked: prev.totalWaterTracked + pendingProduct.waterFootprint
      }));

      // Note: Removed loggedItems tracking to allow re-scanning same products
      
      console.log(`✅ Confirmed and logged: ${pendingProduct.label}`);
    } catch (error) {
      console.error('❌ Error saving scan:', error);
    }

    // Reset confirmation state and resume after delay
    setShowConfirmation(false);
    setPendingProduct(null);
    
    // Resume scanning after 3 seconds
    setTimeout(() => {
      setIsPaused(false);
    }, 3000);
  };

  const handleCancelScan = () => {
    setShowConfirmation(false);
    setPendingProduct(null);
    
    // Resume scanning after 2 seconds
    setTimeout(() => {
      setIsPaused(false);
    }, 2000);
  };

  // Enhanced close handler with state reset
  const handleClose = () => {
    // Reset all states immediately when closing
    setLoggedItems(new Set());
    setScannedProducts([]);
    setSelectedProduct(null);
    setPendingProduct(null);
    setShowConfirmation(false);
    setIsPaused(false);
    
    console.log('🔄 Scanner closed and reset');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-green-700 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🤖 Gemini AI Eco-Scanner - Recyclable Products Only
            </span>
            <div className="flex gap-4 text-sm">
              <span className="bg-green-100 px-2 py-1 rounded">
                📊 Scans: {userMilestones.totalScans}
              </span>
              <span className="bg-red-100 px-2 py-1 rounded">
                🌍 CO2: {userMilestones.totalCO2Tracked.toFixed(2)}kg
              </span>
              <span className="bg-blue-100 px-2 py-1 rounded">
                💧 Water: {userMilestones.totalWaterTracked.toFixed(1)}L
              </span>
            </div>
          </Dialog.Title>

          {!loading && !error && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
              <p className="text-blue-800 text-sm">
                ♻️ <strong>Point camera at recyclable items only:</strong> plastic bottles, cans, paper, cardboard, glass, electronics. 
                Scans every 3 seconds.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
              <p className="text-gray-700 font-medium mb-2">Initializing Gemini AI Scanner</p>
              <p className="text-gray-500 text-sm">{loadingProgress || 'Please wait...'}</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="text-red-600 text-2xl mr-3">⚠️</span>
                  <div>
                    <p className="text-red-800 font-semibold">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (scannerManagerRef.current) {
                      scannerManagerRef.current.reset();
                    }
                    setError(null);
                    setGeminiReady(false);
                    setLoading(false);
                    // Force component re-mount by closing and reopening
                    window.location.reload();
                  }}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  🔄 Retry Scanner
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera View */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Gemini AI Live Scanner</h3>
                <div className="flex gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${isScanning ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    AI: {isScanning ? 'Analyzing...' : 'Ready'}
                  </span>
                  <span className={`px-2 py-1 rounded ${isPaused ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    Scan: {isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="absolute top-0 left-0 w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
                
                {/* Confirmation Dialog Overlay */}
                {showConfirmation && pendingProduct && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                      <h3 className="text-lg font-semibold mb-3">Confirm Product Scan</h3>
                      <div className="text-center mb-4">
                        <h4 className="font-medium text-lg">{pendingProduct.label}</h4>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div>
                            <div className="font-semibold text-red-600">{pendingProduct.carbonFootprint}kg</div>
                            <div className="text-gray-600">CO2 Impact</div>
                          </div>
                          <div>
                            <div className="font-semibold text-blue-600">{pendingProduct.waterFootprint}L</div>
                            <div className="text-gray-600">Water Usage</div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            pendingProduct.ecoScore <= 4 ? 'bg-red-100 text-red-700' :
                            pendingProduct.ecoScore <= 7 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            Eco Score: {pendingProduct.ecoScore}/10
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleCancelScan}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmScan}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Add to Log
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paused Overlay */}
                {isPaused && !showConfirmation && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">Scanner Paused</div>
                        <div className="text-sm text-gray-600">Resuming in a moment...</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                📱 Point camera at: Bottles, Cans, Cups, Paper products, Books, Boxes, Electronics, Food items.
                Hold steady for 1-2 seconds. You can scan the same product multiple times.
                {isPaused && <span className="text-yellow-600 font-medium"> • Scanner Paused</span>}
              </p>
            </div>

            {/* Scanned Products List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Scanned Products ({scannedProducts.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scannedProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No products scanned yet</p>
                ) : (
                  scannedProducts.map((product, index) => (
                    <div 
                      key={index}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{product.label}</h4>
                        <span className={`px-2 py-1 rounded text-sm ${
                          product.ecoScore <= 4 ? 'bg-red-100 text-red-700' :
                          product.ecoScore <= 7 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {product.ecoScore}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        🌍 {product.carbonFootprint}kg CO2 • 💧 {product.waterFootprint}L water
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          )}

          {/* Selected Product Details */}
          {selectedProduct && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">{selectedProduct.label} - Environmental Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedProduct.carbonFootprint}kg</div>
                  <div className="text-sm text-gray-600">Carbon Footprint (CO2)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedProduct.waterFootprint}L</div>
                  <div className="text-sm text-gray-600">Water Footprint</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedProduct.recyclability}</div>
                  <div className="text-sm text-gray-600">Recyclability</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    selectedProduct.ecoScore <= 4 ? 'text-red-600' :
                    selectedProduct.ecoScore <= 7 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {selectedProduct.ecoScore}/10
                  </div>
                  <div className="text-sm text-gray-600">Eco Score</div>
                </div>
              </div>
              
              {selectedProduct.alternatives && selectedProduct.alternatives.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">🌱 Eco-Friendly Alternatives:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedProduct.alternatives.map((alt, index) => (
                      <li key={index} className="text-sm text-gray-700">{alt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-600">
              Total Impact: {scannedProducts.reduce((sum, p) => sum + p.carbonFootprint, 0).toFixed(2)}kg CO2 • 
              {scannedProducts.reduce((sum, p) => sum + p.waterFootprint, 0).toFixed(1)}L water
            </p>
            <button 
              onClick={handleClose} 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Close Scanner
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
