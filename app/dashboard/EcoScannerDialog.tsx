'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface EcoScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EcoScannerDialog({ isOpen, onClose }: EcoScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggedItems, setLoggedItems] = useState<Set<string>>(new Set());

  // Load COCO-SSD model once
  useEffect(() => {
    let isMounted = true;
    cocoSsd.load().then((loadedModel) => {
      if (isMounted) {
        console.log('✅ Model loaded successfully');
        setModel(loadedModel);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('❌ Model load error:', err);
      setError('Failed to load object detection model.');
    });
    return () => { isMounted = false; };
  }, []);

  // Start camera stream
  useEffect(() => {
    if (!isOpen) return;
    let stream: MediaStream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('📸 Camera started');
        }
      } catch (err) {
        console.error('Camera init error:', err);
        setError('Camera access denied or not available.');
      }
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      console.log('🛑 Camera stopped');
    };
  }, [isOpen]);

  // Detection loop + Firebase logging
  useEffect(() => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const ecoLabels: Record<string, { label: string; recyclable: boolean }> = {
      bottle: { label: 'Plastic Bottle', recyclable: true },
      can: { label: 'Aluminum Can', recyclable: true },
      cup: { label: 'Paper Cup', recyclable: false },
      box: { label: 'Cardboard Box', recyclable: true },
      'wine glass': { label: 'Glass', recyclable: true },
      book: { label: 'Paper', recyclable: true },
    };

    let animationFrameId: number;

    const detect = async () => {
      if (!model || !video.videoWidth || !video.videoHeight) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const predictions = await model.detect(video);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      predictions.forEach(async (pred) => {
        const [x, y, width, height] = pred.bbox;
        const ecoInfo = ecoLabels[pred.class];
        const label = ecoInfo ? ecoInfo.label : pred.class;
        const recyclable = ecoInfo ? ecoInfo.recyclable : false;

        ctx.strokeStyle = recyclable ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = recyclable ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)';
        ctx.font = '16px Arial';
        ctx.fillText(label, x + 5, y > 20 ? y - 5 : 20);

        // Prevent duplicate logs
        if (!loggedItems.has(label)) {
          console.log(`🟢 Detected new item: ${label} (${recyclable ? 'Recyclable' : 'Not recyclable'})`);

          // Log to Firebase
          try {
            await addDoc(collection(db, 'ecoLogs'), {
              item: label,
              recyclable,
              timestamp: serverTimestamp(),
            });
            console.log('✅ Logged to Firestore:', label);
          } catch (err) {
            console.error('❌ Firestore log error:', err);
          }

          setLoggedItems((prev) => new Set(prev.add(label)));
        }
      });

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => cancelAnimationFrame(animationFrameId);
  }, [model, isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl">
          <Dialog.Title className="text-xl font-semibold text-green-700 mb-4 flex items-center gap-2">
            ♻️ Live Eco Scanner
          </Dialog.Title>

          {loading && <p className="text-gray-500 text-center">Loading model... ⏳</p>}
          {error && <p className="text-red-500 text-center">{error}</p>}

          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="absolute top-0 left-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
          </div>

          <button onClick={onClose} className="mt-4 block mx-auto text-sm text-gray-500 hover:text-gray-700 underline">
            Close
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
