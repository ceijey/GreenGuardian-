'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

// Global model manager (same pattern as EcoScannerDialog)
class ModelManager {
  private static instance: ModelManager;
  private model: cocoSsd.ObjectDetection | null = null;
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
    
    this.callbacks.forEach(callback => callback(this.loadAttempts));
    
    this.loadPromise = this.attemptModelLoad();
    
    try {
      this.model = await this.loadPromise;
      console.log('✅ Model loaded and cached successfully');
      this.loadAttempts = 0;
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
    const strategies = [
      () => cocoSsd.load(),
      () => cocoSsd.load({ base: 'lite_mobilenet_v2' }),
      () => cocoSsd.load({ base: 'mobilenet_v1' }),
      () => cocoSsd.load({ base: 'mobilenet_v2' }),
    ];

    const strategy = strategies[Math.min(this.loadAttempts - 1, strategies.length - 1)];
    
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

  onRetryUpdate(callback: (attempts: number) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
}

interface AIWasteClassifierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClassified?: (result: ClassificationResult) => void;
}

interface ClassificationResult {
  category: string;
  wasteType: 'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'electronics';
  recyclable: boolean;
  confidence: number;
  instructions: string;
  icon: string;
  color: string;
}

export default function AIWasteClassifierDialog({ isOpen, onClose, onClassified }: AIWasteClassifierDialogProps) {
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelManagerRef = useRef<ModelManager>(ModelManager.getInstance());
  
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [detectedItem, setDetectedItem] = useState<ClassificationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  // Waste classification database mapping COCO-SSD objects to waste categories
  const wasteClassificationDB: Record<string, ClassificationResult> = {
    // Plastic items
    'bottle': {
      category: 'Plastic Bottle',
      wasteType: 'plastic',
      recyclable: true,
      confidence: 0,
      instructions: 'Remove cap and label. Rinse thoroughly to remove residue. Crush to save space. Place in blue recycling bin.',
      icon: 'fas fa-bottle-water',
      color: '#2196F3'
    },
    'cup': {
      category: 'Plastic/Paper Cup',
      wasteType: 'plastic',
      recyclable: false,
      confidence: 0,
      instructions: 'Most disposable cups have plastic lining and are NOT recyclable. Dispose in general waste. Use reusable cups instead!',
      icon: 'fas fa-coffee',
      color: '#FF9800'
    },
    // Paper items
    'book': {
      category: 'Paper/Cardboard',
      wasteType: 'paper',
      recyclable: true,
      confidence: 0,
      instructions: 'Remove any plastic covers or spiral bindings. Keep paper dry. Flatten and place in paper recycling bin.',
      icon: 'fas fa-file',
      color: '#8B4513'
    },
    'box': {
      category: 'Cardboard Box',
      wasteType: 'paper',
      recyclable: true,
      confidence: 0,
      instructions: 'Remove tape, labels, and packing materials. Flatten completely. Keep dry. Place in cardboard recycling bin.',
      icon: 'fas fa-box',
      color: '#8B4513'
    },
    // Glass items
    'wine glass': {
      category: 'Glass',
      wasteType: 'glass',
      recyclable: true,
      confidence: 0,
      instructions: 'Rinse thoroughly. Remove caps and lids. Do not include broken glass. Place in glass recycling container.',
      icon: 'fas fa-glass-whiskey',
      color: '#00BCD4'
    },
    'vase': {
      category: 'Glass Container',
      wasteType: 'glass',
      recyclable: true,
      confidence: 0,
      instructions: 'Rinse clean. Glass is 100% recyclable. Place in designated glass recycling container.',
      icon: 'fas fa-glass-whiskey',
      color: '#00BCD4'
    },
    // Metal/Aluminum
    'can': {
      category: 'Aluminum Can',
      wasteType: 'metal',
      recyclable: true,
      confidence: 0,
      instructions: 'Rinse and crush if possible. Aluminum is highly valuable - always recycle! Place in metal recycling bin.',
      icon: 'fas fa-cube',
      color: '#757575'
    },
    'fork': {
      category: 'Metal Utensil',
      wasteType: 'metal',
      recyclable: true,
      confidence: 0,
      instructions: 'Clean metal utensils can be recycled. Check with local recycling facility for metal item guidelines.',
      icon: 'fas fa-utensils',
      color: '#757575'
    },
    'knife': {
      category: 'Metal Utensil',
      wasteType: 'metal',
      recyclable: true,
      confidence: 0,
      instructions: 'Wrap sharp items safely. Metal utensils are recyclable. Check local guidelines for proper disposal.',
      icon: 'fas fa-utensils',
      color: '#757575'
    },
    'spoon': {
      category: 'Metal Utensil',
      wasteType: 'metal',
      recyclable: true,
      confidence: 0,
      instructions: 'Clean metal utensils can be recycled. Place in metal recycling or check local guidelines.',
      icon: 'fas fa-utensils',
      color: '#757575'
    },
    // Electronics
    'cell phone': {
      category: 'Electronic Waste',
      wasteType: 'electronics',
      recyclable: true,
      confidence: 0,
      instructions: 'Never dispose in regular trash! Contains valuable materials and hazardous components. Take to e-waste collection center.',
      icon: 'fas fa-microchip',
      color: '#9C27B0'
    },
    'laptop': {
      category: 'Electronic Waste',
      wasteType: 'electronics',
      recyclable: true,
      confidence: 0,
      instructions: 'Remove personal data first. Take to authorized e-waste recycling center. Contains valuable and hazardous materials.',
      icon: 'fas fa-laptop',
      color: '#9C27B0'
    },
    'keyboard': {
      category: 'Electronic Waste',
      wasteType: 'electronics',
      recyclable: true,
      confidence: 0,
      instructions: 'Electronic items contain recyclable materials. Take to e-waste collection center or electronics retailer.',
      icon: 'fas fa-keyboard',
      color: '#9C27B0'
    },
    'mouse': {
      category: 'Electronic Waste',
      wasteType: 'electronics',
      recyclable: true,
      confidence: 0,
      instructions: 'Computer accessories are e-waste. Remove batteries. Take to electronics recycling facility.',
      icon: 'fas fa-mouse',
      color: '#9C27B0'
    },
    // Organic waste
    'apple': {
      category: 'Organic Waste',
      wasteType: 'organic',
      recyclable: true,
      confidence: 0,
      instructions: 'Food scraps are compostable! Place in organic waste bin or home compost. Never mix with recyclables.',
      icon: 'fas fa-apple-alt',
      color: '#4CAF50'
    },
    'banana': {
      category: 'Organic Waste',
      wasteType: 'organic',
      recyclable: true,
      confidence: 0,
      instructions: 'Fruit peels are excellent for composting. Place in organic waste bin. Do not mix with other recyclables.',
      icon: 'fas fa-seedling',
      color: '#4CAF50'
    },
    'orange': {
      category: 'Organic Waste',
      wasteType: 'organic',
      recyclable: true,
      confidence: 0,
      instructions: 'Citrus peels can be composted. Place in organic waste bin. Great for nutrient-rich compost!',
      icon: 'fas fa-lemon',
      color: '#4CAF50'
    },
    'broccoli': {
      category: 'Organic Waste',
      wasteType: 'organic',
      recyclable: true,
      confidence: 0,
      instructions: 'Vegetable scraps are perfect for composting. Place in organic waste bin to create nutrient-rich soil.',
      icon: 'fas fa-leaf',
      color: '#4CAF50'
    },
    'carrot': {
      category: 'Organic Waste',
      wasteType: 'organic',
      recyclable: true,
      confidence: 0,
      instructions: 'Vegetable waste is compostable. Place in organic waste bin. Helps reduce landfill waste!',
      icon: 'fas fa-carrot',
      color: '#4CAF50'
    }
  };

  // Initialize model
  useEffect(() => {
    if (!isOpen) {
      setModel(null);
      setLoading(true);
      setError(null);
      setLoadingProgress('');
      setRetryCount(0);
      setCameraReady(false);
      setDetectedItem(null);
      setShowResult(false);
      setIsScanning(true);
      return;
    }

    let isMounted = true;
    
    const initializeModel = async () => {
      let unsubscribe: (() => void) | null = null;
      
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress('Initializing AI model...');
        
        const modelManager = modelManagerRef.current;
        
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

        if (modelManager.isModelLoading()) {
          setLoadingProgress('Model loading in progress...');
        } else {
          setLoadingProgress('Loading AI detection model...');
        }

        const loadedModel = await modelManager.getModel();
        
        if (isMounted) {
          console.log('✅ Model ready for classification');
          setModel(loadedModel);
          setLoading(false);
          setLoadingProgress('');
          setRetryCount(0);
        }
        
      } catch (err) {
        console.error('❌ Model initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize AI model');
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

    initializeModel();
    
    return () => { isMounted = false; };
  }, [isOpen]);

  // Initialize camera
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log('🛑 Camera stream stopped');
      }
      setCameraReady(false);
      return;
    }

    if (!model || loading) return;
    
    let isMounted = true;
    
    const initializeCamera = async () => {
      try {
        setLoadingProgress('Initializing camera...');
        console.log('📸 Starting camera initialization...');
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

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

  // Object detection loop
  useEffect(() => {
    if (!model || !videoRef.current || !canvasRef.current || !cameraReady || !isOpen || !isScanning) {
      return;
    }
    
    console.log('✅ Starting waste classification detection');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    let animationFrameId: number;

    const detect = async () => {
      if (!model || !video || !canvas || !cameraReady || !isOpen || !isScanning) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }
      
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

        // Filter predictions for recyclable items only (confidence > 50%)
        const recyclableItems = predictions.filter(pred => 
          wasteClassificationDB[pred.class] && pred.score > 0.5
        );

        if (recyclableItems.length > 0) {
          // Get highest confidence prediction
          const bestPrediction = recyclableItems.reduce((best, current) => 
            current.score > best.score ? current : best
          );

          const [x, y, width, height] = bestPrediction.bbox;
          const classificationData = wasteClassificationDB[bestPrediction.class];
          
          if (classificationData) {
            // Draw bounding box
            ctx.strokeStyle = classificationData.recyclable ? '#4CAF50' : '#FF5722';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);

            // Draw label
            ctx.fillStyle = classificationData.color;
            ctx.font = 'bold 20px Arial';
            const labelText = `${classificationData.category}`;
            ctx.fillText(labelText, x + 5, y > 30 ? y - 10 : 30);
            
            const confidenceText = `${Math.round(bestPrediction.score * 100)}% confidence`;
            ctx.font = 'bold 16px Arial';
            ctx.fillText(confidenceText, x + 5, y > 55 ? y - 35 : 55);

            // Show classification result
            const result = {
              ...classificationData,
              confidence: bestPrediction.score
            };
            
            setDetectedItem(result);
            setShowResult(true);
            setIsScanning(false);
          }
        }

      } catch (error) {
        console.error('❌ Detection error:', error);
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => cancelAnimationFrame(animationFrameId);
  }, [model, isOpen, cameraReady, isScanning]);

  // Log classification to Firebase
  const handleLogClassification = async () => {
    if (!detectedItem || !user) return;

    try {
      await addDoc(collection(db, 'wasteClassifications'), {
        userId: user.uid,
        userEmail: user.email,
        category: detectedItem.category,
        wasteType: detectedItem.wasteType,
        recyclable: detectedItem.recyclable,
        confidence: detectedItem.confidence,
        timestamp: serverTimestamp(),
        scanDate: new Date().toISOString().split('T')[0],
      });

      console.log(`✅ Classification logged: ${detectedItem.category}`);
      
      // Callback to parent if provided
      if (onClassified) {
        onClassified(detectedItem);
      }
      
      alert(`✅ Classification logged successfully!\n\n${detectedItem.category}\n${detectedItem.recyclable ? '♻️ Recyclable' : '⚠️ Non-recyclable'}`);
    } catch (error) {
      console.error('❌ Error logging classification:', error);
    }
  };

  const handleScanAnother = () => {
    setDetectedItem(null);
    setShowResult(false);
    setIsScanning(true);
  };

  const handleRetryModelLoad = () => {
    window.location.reload();
  };

  const handleClose = () => {
    setDetectedItem(null);
    setShowResult(false);
    setIsScanning(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-2xl font-semibold text-green-700 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              🧠 AI Waste Classifier
            </span>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <i className="fas fa-times text-xl"></i>
            </button>
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
                  This is taking longer than usual. Attempt {retryCount}/5
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

          {!loading && !error && (
            <div className="space-y-4">
              {/* Camera View */}
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="absolute top-0 left-0 w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
                
                {/* Scanning Status */}
                {isScanning && !showResult && (
                  <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-full">
                    <i className="fas fa-camera animate-pulse mr-2"></i>
                    Scanning for waste items...
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                  <i className="fas fa-info-circle mr-2"></i>
                  <strong>How to use:</strong> Point camera at recyclable items (bottles, cans, boxes, paper, electronics, food waste). 
                  Hold steady for 1-2 seconds. AI will automatically classify the item.
                </p>
              </div>

              {/* Classification Result */}
              {showResult && detectedItem && (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${detectedItem.color}20`, color: detectedItem.color }}
                    >
                      <i className={detectedItem.icon}></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{detectedItem.category}</h3>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-gray-600">
                          Confidence: <strong>{Math.round(detectedItem.confidence * 100)}%</strong>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          detectedItem.recyclable 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {detectedItem.recyclable ? '♻️ Recyclable' : '⚠️ Non-Recyclable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${detectedItem.confidence * 100}%`,
                        backgroundColor: detectedItem.color
                      }}
                    ></div>
                  </div>

                  {/* Disposal Instructions */}
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <i className="fas fa-info-circle text-blue-600"></i>
                      Disposal Instructions
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{detectedItem.instructions}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogClassification}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <i className="fas fa-save mr-2"></i>
                      Log Classification
                    </button>
                    <button
                      onClick={handleScanAnother}
                      className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      <i className="fas fa-redo mr-2"></i>
                      Scan Another Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
