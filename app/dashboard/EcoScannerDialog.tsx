'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useStatsTracker } from '../../lib/useStatsTracker';

// Global model manager to persist model across dialog opens/closes
class ModelManager {
  private static instance: ModelManager;
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<cocoSsd.ObjectDetection> | null = null;
  private loadAttempts: number = 0;
  private maxAttempts: number = 5;
  private callbacks: Set<(attempts: number) => void> = new Set();

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async getModel(): Promise<cocoSsd.ObjectDetection> {
    if (this.model) {
      console.log('🔄 Reusing existing model');
      return this.model;
    }

    if (this.loadPromise) {
      console.log('🔄 Model already loading, waiting...');
      return this.loadPromise;
    }

    return this.loadModel();
  }

  private async loadModel(): Promise<cocoSsd.ObjectDetection> {
    this.loadAttempts++;
    console.log(`🚀 Loading COCO-SSD model (attempt ${this.loadAttempts}/${this.maxAttempts})`);
    
    // Notify callbacks about retry attempt
    this.callbacks.forEach(callback => callback(this.loadAttempts));
    
    this.loadPromise = this.attemptModelLoad();
    
    try {
      this.model = await this.loadPromise;
      console.log('✅ Model loaded and cached successfully');
      this.loadAttempts = 0; // Reset on success
      return this.model;
    } catch (error) {
      console.error(`❌ Model load failed (attempt ${this.loadAttempts}):`, error);
      this.loadPromise = null;
      
      if (this.loadAttempts < this.maxAttempts) {
        const delay = Math.min(Math.pow(2, this.loadAttempts) * 1000, 10000);
        console.log(`⏳ Retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.loadModel();
      } else {
        this.loadAttempts = 0;
        throw new Error(`Failed to load model after ${this.maxAttempts} attempts. Please refresh the page.`);
      }
    }
  }

  private async attemptModelLoad(): Promise<cocoSsd.ObjectDetection> {
    // Try different loading strategies
    const strategies = [
      () => cocoSsd.load(), // Default
      () => cocoSsd.load({ base: 'lite_mobilenet_v2' }), // Lighter model
      () => cocoSsd.load({ base: 'mobilenet_v1' }), // Alternative
      () => cocoSsd.load({ base: 'mobilenet_v2' }), // Alternative
    ];

    const strategy = strategies[Math.min(this.loadAttempts - 1, strategies.length - 1)];
    
    // Add timeout
    const modelPromise = strategy();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Model loading timeout')), 45000)
    );

    return Promise.race([modelPromise, timeoutPromise]);
  }

  isModelLoaded(): boolean {
    return this.model !== null;
  }

  isModelLoading(): boolean {
    return this.loadPromise !== null && this.model === null;
  }

  getCurrentAttempts(): number {
    return this.loadAttempts;
  }

  onRetryUpdate(callback: (attempts: number) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
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
  ecoScore: number; // 1-10 scale
  alternatives?: string[];
  category: string;
}

export default function EcoScannerDialog({ isOpen, onClose }: EcoScannerDialogProps) {
  const { user } = useAuth();
  const { trackEcoScan, trackCo2Savings } = useStatsTracker();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const modelManagerRef = useRef<ModelManager>(ModelManager.getInstance());
  
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [loggedItems, setLoggedItems] = useState<Set<string>>(new Set());
  const [scannedProducts, setScannedProducts] = useState<ProductFootprint[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductFootprint | null>(null);
  const [pendingProduct, setPendingProduct] = useState<ProductFootprint | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [userMilestones, setUserMilestones] = useState({ totalScans: 0, totalCO2Tracked: 0, totalWaterTracked: 0 });

  // List of objects to ignore (people and animals)
  const ignoredObjects = ['person', 'cat', 'dog', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'];

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset states when dialog closes
      setModel(null);
      setLoading(true);
      setError(null);
      setLoadingProgress('');
      setRetryCount(0);
      setCameraReady(false);
      setScannedProducts([]);
      setLoggedItems(new Set());
      setSelectedProduct(null);
      setPendingProduct(null);
      setShowConfirmation(false);
      setIsPaused(false);
      return;
    }

    let isMounted = true;
    
    const initializeScanner = async () => {
      let unsubscribe: (() => void) | null = null;
      
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress('Initializing AI model...');
        
        // Check if model is already loaded
        const modelManager = modelManagerRef.current;
        
        // Subscribe to retry updates
        unsubscribe = modelManager.onRetryUpdate((attempts) => {
          if (isMounted) {
            setRetryCount(attempts);
            setLoadingProgress(`Loading AI model (attempt ${attempts}/5)...`);
          }
        });
        
        if (modelManager.isModelLoaded()) {
          console.log('✅ Using cached model');
          const cachedModel = await modelManager.getModel();
          if (isMounted) {
            setModel(cachedModel);
            setLoading(false);
            setLoadingProgress('');
            setRetryCount(0);
          }
          return;
        }

        // Load model with progress updates
        if (modelManager.isModelLoading()) {
          setLoadingProgress('Model loading in progress...');
        } else {
          setLoadingProgress('Loading AI detection model...');
        }

        const loadedModel = await modelManager.getModel();
        
        if (isMounted) {
          console.log('✅ Model ready for scanning');
          setModel(loadedModel);
          setLoading(false);
          setLoadingProgress('');
          setRetryCount(0);
        }
        
      } catch (err) {
        console.error('❌ Scanner initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize scanner');
          setLoading(false);
          setLoadingProgress('');
          setRetryCount(0);
        }
      } finally {
        if (unsubscribe) {
          unsubscribe();
        }
      }
    };

    initializeScanner();
    
    return () => { isMounted = false; };
  }, [isOpen]);

  // Load user milestones
  useEffect(() => {
    const loadUserMilestones = async () => {
      if (!user) return;
      
      try {
        const userStatsRef = doc(db, 'userStats', user.uid);
        const userStatsDoc = await getDoc(userStatsRef);
        
        if (userStatsDoc.exists()) {
          const data = userStatsDoc.data();
          setUserMilestones({
            totalScans: data.totalScans || 0,
            totalCO2Tracked: data.carbonFootprintTracked || 0,
            totalWaterTracked: data.waterFootprintTracked || 0
          });
        }
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
      // Clean up camera and detection when dialog closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log('🛑 Camera stream stopped');
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('� Detection interval cleared');
      }
      
      setCameraReady(false);
      return;
    }

    // Only start camera when dialog is open and model is ready
    if (!model || loading) return;
    
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
        const constraints = [
          { 
            video: { 
              facingMode: 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 }
            } 
          },
          { 
            video: { 
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 }
            } 
          },
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
  }, [isOpen, model, loading]);

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

  // Enhanced object detection with proper state management
  useEffect(() => {
    // Only start detection when everything is ready
    if (!model || !videoRef.current || !canvasRef.current || !cameraReady || !isOpen) {
      console.log('🔄 Detection waiting for:', { 
        model: !!model, 
        video: !!videoRef.current, 
        canvas: !!canvasRef.current, 
        cameraReady, 
        isOpen 
      });
      return;
    }
    
    console.log('✅ Starting object detection loop');
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const productDatabase: Record<string, ProductFootprint> = {
      bottle: {
        label: 'Plastic Bottle',
        recyclable: true,
        carbonFootprint: 0.082, // kg CO2
        waterFootprint: 3.4, // liters
        recyclability: '85% recyclable',
        ecoScore: 4,
        alternatives: ['Reusable water bottle', 'Glass bottle', 'Aluminum bottle'],
        category: 'packaging'
      },
      can: {
        label: 'Aluminum Can',
        recyclable: true,
        carbonFootprint: 0.33, // kg CO2
        waterFootprint: 15.8, // liters
        recyclability: '95% recyclable',
        ecoScore: 7,
        alternatives: ['Glass bottles', 'Reusable containers'],
        category: 'packaging'
      },
      cup: {
        label: 'Disposable Paper Cup',
        recyclable: false,
        carbonFootprint: 0.011, // kg CO2
        waterFootprint: 0.5, // liters
        recyclability: '5% recyclable (plastic lining)',
        ecoScore: 2,
        alternatives: ['Reusable ceramic mug', 'Bamboo cup', 'Stainless steel tumbler'],
        category: 'packaging'
      },
      box: {
        label: 'Cardboard Box',
        recyclable: true,
        carbonFootprint: 0.85, // kg CO2 per kg
        waterFootprint: 20, // liters per kg
        recyclability: '90% recyclable',
        ecoScore: 8,
        alternatives: ['Reusable bags', 'Biodegradable packaging'],
        category: 'packaging'
      },
      'wine glass': {
        label: 'Glass Container',
        recyclable: true,
        carbonFootprint: 0.5, // kg CO2
        waterFootprint: 2.1, // liters
        recyclability: '100% recyclable',
        ecoScore: 9,
        alternatives: ['Reusable glass containers'],
        category: 'packaging'
      },
      book: {
        label: 'Paper Product',
        recyclable: true,
        carbonFootprint: 2.71, // kg CO2 per kg
        waterFootprint: 13, // liters per kg
        recyclability: '80% recyclable',
        ecoScore: 6,
        alternatives: ['Digital books', 'Library books', 'Recycled paper'],
        category: 'paper'
      },
      banana: {
        label: 'Banana',
        recyclable: true,
        carbonFootprint: 0.48, // kg CO2 per kg
        waterFootprint: 160, // liters per kg
        recyclability: '100% compostable',
        ecoScore: 8,
        alternatives: ['Local seasonal fruits'],
        category: 'food'
      },
      apple: {
        label: 'Apple',
        recyclable: true,
        carbonFootprint: 0.33, // kg CO2 per apple
        waterFootprint: 70, // liters per apple
        recyclability: '100% compostable',
        ecoScore: 9,
        alternatives: ['Local apples', 'Seasonal fruits'],
        category: 'food'
      }
    };

    let animationFrameId: number;

    const detect = async () => {
      // Check if everything is still ready
      if (!model || !video || !canvas || !cameraReady || !isOpen || isPaused) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }
      
      // Check if video is playing and has dimensions
      if (!video.videoWidth || !video.videoHeight || video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const predictions = await model.detect(video);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Filter out people and animals, and only show highest confidence prediction
      const validPredictions = predictions.filter(pred => 
        !ignoredObjects.includes(pred.class.toLowerCase()) && pred.score > 0.6
      );

      if (validPredictions.length > 0) {
        // Get the highest confidence prediction
        const bestPrediction = validPredictions.reduce((best, current) => 
          current.score > best.score ? current : best
        );

        const [x, y, width, height] = bestPrediction.bbox;
        const productData = productDatabase[bestPrediction.class];
        const label = productData ? productData.label : bestPrediction.class;
        const ecoScore = productData ? productData.ecoScore : 5;

        // Color based on eco score
        const getEcoColor = (score: number) => {
          if (score <= 4) return '#ef4444'; // red
          if (score <= 7) return '#f59e0b'; // yellow
          return '#22c55e'; // green
        };

        ctx.strokeStyle = getEcoColor(ecoScore);
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = getEcoColor(ecoScore);
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${label}`, x + 5, y > 25 ? y - 5 : 25);
        ctx.fillText(`Confidence: ${Math.round(bestPrediction.score * 100)}%`, x + 5, y > 50 ? y - 25 : 45);

        // Show confirmation if new product detected and not already logged
        if (productData && !loggedItems.has(label) && !showConfirmation && !isPaused) {
          setPendingProduct(productData);
          setShowConfirmation(true);
          setIsPaused(true);
        }
      }

      } catch (error) {
        console.error('❌ Detection error:', error);
        // Continue detection even if there's an error
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => cancelAnimationFrame(animationFrameId);
  }, [model, isOpen, cameraReady, loggedItems, isPaused, showConfirmation]);

  // Handle scan confirmation
  const handleConfirmScan = async () => {
    if (!pendingProduct || !user) return;

    try {
      // Add to scanned products list
      setScannedProducts(prev => {
        const exists = prev.find(p => p.label === pendingProduct.label);
        if (!exists) {
          return [...prev, pendingProduct];
        }
        return prev;
      });

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

      setLoggedItems(prev => new Set(prev.add(pendingProduct.label)));
      
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

  // Manual retry for model loading
  const handleRetryModelLoad = () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setLoadingProgress('Retrying model load...');
    
    // Trigger model reload by updating a dependency
    window.location.reload();
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
              🌱 Eco-Scanner - Product Environmental Footprint
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

          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <p className="text-gray-700 font-medium mb-2">Loading AI Detection Model</p>
              <p className="text-gray-500 text-sm">{loadingProgress || 'Please wait...'}</p>
              {retryCount > 0 && (
                <p className="text-yellow-600 text-xs mt-2">
                  This is taking longer than usual. Attempt {retryCount}/3
                </p>
              )}
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <p className="text-red-600 font-medium mb-2">Model Loading Failed</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button 
                onClick={handleRetryModelLoad}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Retry Loading
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera View */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Live Scanner</h3>
                <div className="flex gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${model ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    AI: {model ? 'Ready' : 'Loading'}
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
                Point camera at products to analyze their environmental impact. 
                Scanner will pause when a product is detected for confirmation.
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
