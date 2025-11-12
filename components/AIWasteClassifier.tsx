'use client';

import { useState, useRef } from 'react';
import styles from './AIWasteClassifier.module.css';

interface ClassificationResult {
  category: string;
  confidence: number;
  recyclable: boolean;
  instructions: string;
  icon: string;
  color: string;
}

export default function AIWasteClassifier() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated AI classification (In production, this would use TensorFlow.js or an API)
  const classifyWaste = async (image: File): Promise<ClassificationResult> => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulated AI results based on image name/type for demo
    // In production, this would analyze the actual image using ML
    const wasteCategories = [
      {
        category: 'Plastic Bottle',
        confidence: 0.95,
        recyclable: true,
        instructions: 'Remove cap and label. Rinse before recycling. Place in blue recycling bin.',
        icon: 'fas fa-recycle',
        color: '#2196F3'
      },
      {
        category: 'Cardboard',
        confidence: 0.92,
        recyclable: true,
        instructions: 'Flatten the cardboard. Remove tape and labels. Keep dry and place in recycling bin.',
        icon: 'fas fa-box',
        color: '#8D6E63'
      },
      {
        category: 'Glass Bottle',
        confidence: 0.88,
        recyclable: true,
        instructions: 'Rinse thoroughly. Remove caps. Place in designated glass recycling container.',
        icon: 'fas fa-wine-bottle',
        color: '#4CAF50'
      },
      {
        category: 'Aluminum Can',
        confidence: 0.94,
        recyclable: true,
        instructions: 'Rinse and crush if possible. Place in metal recycling bin. Highly valuable material!',
        icon: 'fas fa-can-food',
        color: '#9E9E9E'
      },
      {
        category: 'Food Waste',
        confidence: 0.89,
        recyclable: false,
        instructions: 'Compost if possible. Otherwise, dispose in organic waste bin. Do not mix with recyclables.',
        icon: 'fas fa-apple-alt',
        color: '#4CAF50'
      },
      {
        category: 'Paper',
        confidence: 0.91,
        recyclable: true,
        instructions: 'Remove any plastic coating. Keep dry. Flatten and place in paper recycling bin.',
        icon: 'fas fa-file-alt',
        color: '#03A9F4'
      },
      {
        category: 'Electronic Waste',
        confidence: 0.87,
        recyclable: true,
        instructions: 'Take to e-waste collection center. Do not dispose in regular trash. Contains hazardous materials.',
        icon: 'fas fa-plug',
        color: '#FF9800'
      },
      {
        category: 'General Waste',
        confidence: 0.76,
        recyclable: false,
        instructions: 'Non-recyclable item. Dispose in general waste bin. Consider reducing use of similar items.',
        icon: 'fas fa-trash',
        color: '#F44336'
      }
    ];

    // Randomly select a category for demo purposes
    // In production, this would be determined by actual ML model
    const randomIndex = Math.floor(Math.random() * wasteCategories.length);
    return wasteCategories[randomIndex];
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClassify = async () => {
    if (!imageFile) return;

    setClassifying(true);
    try {
      const classificationResult = await classifyWaste(imageFile);
      setResult(classificationResult);
    } catch (error) {
      console.error('Classification error:', error);
      alert('Failed to classify waste. Please try again.');
    } finally {
      setClassifying(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <i className="fas fa-brain"></i>
        </div>
        <div>
          <h2 className={styles.title}>AI Waste Classifier</h2>
          <p className={styles.subtitle}>Upload or capture an image to identify recyclable materials</p>
        </div>
      </div>

      {!selectedImage ? (
        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className={styles.fileInput}
            id="waste-image-input"
          />
          <label htmlFor="waste-image-input" className={styles.uploadLabel}>
            <i className="fas fa-cloud-upload-alt"></i>
            <span>Click to upload or drag an image</span>
            <small>Supports: JPG, PNG, HEIC (Max 5MB)</small>
          </label>
          
          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <button onClick={handleTakePhoto} className={styles.cameraButton}>
            <i className="fas fa-camera"></i>
            Take Photo
          </button>

          <div className={styles.infoCards}>
            <div className={styles.infoCard}>
              <i className="fas fa-check-circle"></i>
              <div>
                <strong>Instant Recognition</strong>
                <p>AI identifies waste type in seconds</p>
              </div>
            </div>
            <div className={styles.infoCard}>
              <i className="fas fa-recycle"></i>
              <div>
                <strong>Recycling Guide</strong>
                <p>Get disposal instructions instantly</p>
              </div>
            </div>
            <div className={styles.infoCard}>
              <i className="fas fa-leaf"></i>
              <div>
                <strong>Eco-Friendly</strong>
                <p>Reduce contamination in recycling</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.previewArea}>
          <div className={styles.imagePreview}>
            <img src={selectedImage} alt="Selected waste" />
          </div>

          {!result ? (
            <div className={styles.actions}>
              <button 
                onClick={handleClassify} 
                disabled={classifying}
                className={styles.classifyButton}
              >
                {classifying ? (
                  <>
                    <span className={styles.spinner}></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    Classify Waste
                  </>
                )}
              </button>
              <button onClick={handleReset} className={styles.resetButton}>
                <i className="fas fa-redo"></i>
                Choose Another Image
              </button>
            </div>
          ) : (
            <div className={styles.resultArea}>
              <div className={styles.resultHeader}>
                <div className={styles.resultIcon} style={{ backgroundColor: result.color }}>
                  <i className={result.icon}></i>
                </div>
                <div>
                  <h3 className={styles.resultCategory}>{result.category}</h3>
                  <div className={styles.confidence}>
                    <span>Confidence: </span>
                    <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              <div className={styles.confidenceBar}>
                <div 
                  className={styles.confidenceFill}
                  style={{ 
                    width: `${result.confidence * 100}%`,
                    backgroundColor: result.color
                  }}
                ></div>
              </div>

              <div className={styles.recyclableStatus}>
                {result.recyclable ? (
                  <>
                    <i className="fas fa-check-circle" style={{ color: '#4CAF50' }}></i>
                    <span style={{ color: '#4CAF50' }}>Recyclable Material</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-times-circle" style={{ color: '#F44336' }}></i>
                    <span style={{ color: '#F44336' }}>Non-Recyclable</span>
                  </>
                )}
              </div>

              <div className={styles.instructions}>
                <h4>
                  <i className="fas fa-info-circle"></i>
                  Disposal Instructions
                </h4>
                <p>{result.instructions}</p>
              </div>

              <div className={styles.tips}>
                <h4>
                  <i className="fas fa-lightbulb"></i>
                  Pro Tips
                </h4>
                <ul>
                  <li>Always clean items before recycling</li>
                  <li>Check with your local recycling facility for specific guidelines</li>
                  <li>When in doubt, it's better to dispose in general waste than contaminate recycling</li>
                  {result.recyclable && <li>Thank you for recycling! You're making a difference 🌍</li>}
                </ul>
              </div>

              <button onClick={handleReset} className={styles.classifyAnotherButton}>
                <i className="fas fa-plus"></i>
                Classify Another Item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
