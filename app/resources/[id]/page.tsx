'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import styles from './resource.module.css';
import { Toaster, toast } from 'react-hot-toast';
import ShareModal from '@/components/ShareModal';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'quiz' | 'lesson-plan';
  content: string;
  category: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: any;
  views: number;
  likes: number;
  status: 'published' | 'draft';
}

export default function ResourceViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: number}>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const loadResource = async () => {
      if (!params.id) return;

      try {
        const resourceDoc = await getDoc(doc(db, 'educationalResources', params.id as string));
        
        if (resourceDoc.exists()) {
          const data = resourceDoc.data();
          setResource({
            id: resourceDoc.id,
            title: data.title || '',
            description: data.description || '',
            type: data.type || 'article',
            content: data.content || '',
            category: data.category || '',
            createdBy: data.createdBy || '',
            createdByName: data.createdByName || 'Anonymous',
            createdByEmail: data.createdByEmail || '',
            createdAt: data.createdAt,
            views: data.views || 0,
            likes: data.likes || 0,
            status: data.status || 'published'
          });
        } else {
          console.error('Resource not found');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error loading resource:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [params.id, router]);

  // Track view
  useEffect(() => {
    const trackView = async () => {
      if (!resource || !user || hasViewed) return;

      try {
        // Increment view count
        await updateDoc(doc(db, 'educationalResources', resource.id), {
          views: increment(1)
        });

        // Log interaction
        await addDoc(collection(db, 'resourceInteractions'), {
          resourceId: resource.id,
          resourceTitle: resource.title,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          userEmail: user.email || '',
          type: 'view',
          timestamp: serverTimestamp()
        });

        setHasViewed(true);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
  }, [resource, user, hasViewed]);

  const handleLike = async () => {
    if (!resource || !user || hasLiked) return;

    try {
      await updateDoc(doc(db, 'educationalResources', resource.id), {
        likes: increment(1)
      });

      await addDoc(collection(db, 'resourceInteractions'), {
        resourceId: resource.id,
        resourceTitle: resource.title,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userEmail: user.email || '',
        type: 'like',
        timestamp: serverTimestamp()
      });

      setHasLiked(true);
      setResource({ ...resource, likes: resource.likes + 1 });
    } catch (error) {
      console.error('Error liking resource:', error);
    }
  };

  const handleComplete = async () => {
    if (!resource || !user) return;

    try {
      await addDoc(collection(db, 'resourceInteractions'), {
        resourceId: resource.id,
        resourceTitle: resource.title,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userEmail: user.email || '',
        type: 'complete',
        timestamp: serverTimestamp()
      });

      toast.success('Great job! Your completion has been recorded.');
    } catch (error) {
      console.error('Error marking as complete:', error);
      toast.error('Could not record completion. Please try again.');
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'article': return 'fa-newspaper';
      case 'video': return 'fa-video';
      case 'quiz': return 'fa-question-circle';
      case 'lesson-plan': return 'fa-chalkboard-teacher';
      default: return 'fa-file';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderContent = () => {
    if (!resource) return null;

    // Handle Quiz type
    if (resource.type === 'quiz') {
      try {
        const quizData = JSON.parse(resource.content);
        const questions = quizData.questions || [];

        return (
          <div className={styles.quizContainer}>
            {!quizSubmitted ? (
              <>
                <div className={styles.quizIntro}>
                  <h2>📝 Quiz Challenge</h2>
                  <p>Answer all questions to test your knowledge!</p>
                  <div className={styles.quizMeta}>
                    <span><i className="fas fa-question-circle"></i> {questions.length} Questions</span>
                    <span><i className="fas fa-trophy"></i> {quizData.totalPoints || 0} Points</span>
                  </div>
                </div>

                {questions.map((q: any, index: number) => (
                  <div key={index} className={styles.quizQuestion}>
                    <h3 className={styles.questionNumber}>Question {index + 1}</h3>
                    <p className={styles.questionText}>{q.question}</p>
                    
                    <div className={styles.optionsContainer}>
                      {q.options.map((option: string, optIndex: number) => (
                        <label 
                          key={optIndex} 
                          className={`${styles.optionLabel} ${quizAnswers[index] === optIndex ? styles.selected : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={optIndex}
                            checked={quizAnswers[index] === optIndex}
                            onChange={() => setQuizAnswers({...quizAnswers, [index]: optIndex})}
                            className={styles.optionRadio}
                          />
                          <span className={styles.optionText}>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    if (Object.keys(quizAnswers).length < questions.length) {
                      toast.error('Please answer all questions before submitting!');
                      return;
                    }
                    
                    let score = 0;
                    questions.forEach((q: any, index: number) => {
                      if (quizAnswers[index] === q.correctAnswer) {
                        score += q.points || 10;
                      }
                    });
                    
                    setQuizScore(score);
                    setQuizSubmitted(true);
                    handleComplete();
                  }}
                  className={styles.submitQuizButton}
                  disabled={Object.keys(quizAnswers).length < questions.length}
                >
                  <i className="fas fa-check-circle"></i> Submit Quiz
                </button>
              </>
            ) : (
              <div className={styles.quizResults}>
                <div className={styles.resultIcon}>
                  {quizScore >= (quizData.totalPoints || 0) * 0.8 ? '🎉' : quizScore >= (quizData.totalPoints || 0) * 0.5 ? '👍' : '📚'}
                </div>
                <h2>Quiz Completed!</h2>
                <div className={styles.scoreDisplay}>
                  <span className={styles.scoreNumber}>{quizScore}</span>
                  <span className={styles.scoreTotal}>/ {quizData.totalPoints || 0} points</span>
                </div>
                <p className={styles.scoreMessage}>
                  {quizScore >= (quizData.totalPoints || 0) * 0.8 
                    ? 'Excellent work! You really know your stuff! 🌟'
                    : quizScore >= (quizData.totalPoints || 0) * 0.5 
                    ? 'Good job! Keep learning to improve your score. 💪'
                    : 'Keep studying! Review the material and try again. 📖'}
                </p>

                <div className={styles.answersReview}>
                  <h3>Review Your Answers</h3>
                  {questions.map((q: any, index: number) => {
                    const isCorrect = quizAnswers[index] === q.correctAnswer;
                    return (
                      <div key={index} className={styles.reviewQuestion}>
                        <div className={styles.reviewHeader}>
                          <span className={styles.reviewNumber}>Question {index + 1}</span>
                          <span className={`${styles.reviewStatus} ${isCorrect ? styles.correct : styles.incorrect}`}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                        <p className={styles.reviewText}>{q.question}</p>
                        <div className={styles.reviewAnswer}>
                          <strong>Your answer:</strong> {q.options[quizAnswers[index]]}
                        </div>
                        {!isCorrect && (
                          <div className={styles.correctAnswer}>
                            <strong>Correct answer:</strong> {q.options[q.correctAnswer]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => {
                    setQuizSubmitted(false);
                    setQuizAnswers({});
                    setQuizScore(0);
                  }}
                  className={styles.retakeButton}
                >
                  <i className="fas fa-redo"></i> Retake Quiz
                </button>
              </div>
            )}
          </div>
        );
      } catch (error) {
        console.error('Error parsing quiz data:', error);
        return (
          <div className={styles.errorMessage}>
            <i className="fas fa-exclamation-triangle"></i>
            <p>Unable to load quiz content. Please contact the resource creator.</p>
          </div>
        );
      }
    }

    if (resource.type === 'video') {
      // Check if it's a YouTube URL
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = resource.content.match(youtubeRegex);
      
      if (match) {
        const videoId = match[1];
        return (
          <div className={styles.videoContainer}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={resource.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.videoFrame}
            ></iframe>
          </div>
        );
      } else {
        return (
          <div className={styles.videoLinkContainer}>
            <i className="fas fa-video"></i>
            <p>Watch this video:</p>
            <a href={resource.content} target="_blank" rel="noopener noreferrer" className={styles.videoLink}>
              {resource.content}
            </a>
          </div>
        );
      }
    }

    // For articles and lesson plans, display formatted content
    return (
      <div className={styles.articleContent}>
        {resource.content.split('\n').map((paragraph, index) => (
          paragraph.trim() ? <p key={index}>{paragraph}</p> : <br key={index} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading resource...</p>
        </div>
      </>
    );
  }

  if (!resource) {
    return (
      <>
        <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
        <div className={styles.errorContainer}>
          <i className="fas fa-exclamation-circle"></i>
          <h2>Resource Not Found</h2>
          <p>The resource you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className={styles.container}>
        {/* Back Button */}
        <button onClick={() => router.back()} className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <Toaster />
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={resource.title}
          text={resource.description}
        />

        {/* Resource Header */}
        <div className={styles.resourceHeader}>
          <div className={styles.typeIconLarge}>
            <i className={`fas ${getTypeIcon(resource.type)}`}></i>
          </div>
          <div className={styles.headerContent}>
            <div className={styles.badges}>
              <span className={styles.typeBadge}>{resource.type}</span>
              <span className={styles.categoryBadge}>{resource.category.replace('-', ' ')}</span>
            </div>
            <h1 className={styles.title}>{resource.title}</h1>
            <p className={styles.description}>{resource.description}</p>
            
            <div className={styles.metadata}>
              <span className={styles.metaItem}>
                <i className="fas fa-user"></i> By {resource.createdByName}
              </span>
              <span className={styles.metaItem}>
                <i className="fas fa-calendar"></i> {formatDate(resource.createdAt)}
              </span>
              <span className={styles.metaItem}>
                <i className="fas fa-eye"></i> {resource.views} views
              </span>
              <span className={styles.metaItem}>
                <i className="fas fa-heart"></i> {resource.likes} likes
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionBar}>
          <button 
            onClick={handleLike} 
            className={`${styles.actionButton} ${hasLiked ? styles.liked : ''}`}
            disabled={hasLiked}
          >
            <i className={`fas fa-heart`}></i>
            {hasLiked ? 'Liked' : 'Like'}
          </button>
          <button onClick={handleComplete} className={styles.actionButton}>
            <i className="fas fa-check-circle"></i> Mark as Complete
          </button>
          <button 
            onClick={() => setIsShareModalOpen(true)} 
            className={styles.actionButton}
          >
            <i className="fas fa-share"></i> Share
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.contentSection}>
          {renderContent()}
        </div>

        {/* Footer Info */}
        <div className={styles.footerInfo}>
          <div className={styles.authorCard}>
            <div className={styles.authorIcon}>
              <i className="fas fa-school"></i>
            </div>
            <div>
              <h3>Created by</h3>
              <p>{resource.createdByName}</p>
              <small>{resource.createdByEmail}</small>
            </div>
          </div>
          
          <div className={styles.categoryCard}>
            <div className={styles.categoryIcon}>
              <i className="fas fa-tag"></i>
            </div>
            <div>
              <h3>Category</h3>
              <p>{resource.category.replace('-', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Back to Resources Button */}
        <div className={styles.bottomNav}>
          <button onClick={() => router.push('/dashboard')} className={styles.dashboardButton}>
            <i className="fas fa-home"></i> Back to Dashboard
          </button>
        </div>
      </main>
    </>
  );
}
