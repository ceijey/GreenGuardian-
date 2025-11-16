'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SchoolHeader from '@/components/SchoolHeader';
import styles from './challenges.module.css';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'quiz';
  category: string;
  questions: Question[];
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: any;
  participantCount: number;
  completionCount: number;
  duration: number; // in minutes
  totalPoints: number;
  status: 'active' | 'inactive';
}

export default function SchoolChallengesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    category: 'environmental-science',
    duration: 15,
    status: 'active' as 'active' | 'inactive'
  });

  const [questions, setQuestions] = useState<Question[]>([{
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 10
  }]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const role = userDoc.data()?.role;
          setUserRole(role);

          if (role !== 'school') {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  // Load challenges created by this school
  useEffect(() => {
    if (!user || userRole !== 'school') return;

    const q = query(
      collection(db, 'challenges'),
      where('createdBy', '==', user.uid),
      where('type', '==', 'quiz')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challengesList: Challenge[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        challengesList.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          type: 'quiz',
          category: data.category || '',
          questions: data.questions || [],
          createdBy: data.createdBy || '',
          createdByName: data.createdByName || '',
          createdByEmail: data.createdByEmail || '',
          createdAt: data.createdAt,
          participantCount: data.participantCount || 0,
          completionCount: data.completionCount || 0,
          duration: data.duration || 15,
          totalPoints: data.totalPoints || 0,
          status: data.status || 'active'
        });
      });
      
      setChallenges(challengesList);
    });

    return unsubscribe;
  }, [user, userRole]);

  // Add new question
  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 10
    }]);
  };

  // Remove question
  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // Update question option
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  // Create new challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate questions
    const validQuestions = questions.filter(q => 
      q.question.trim() && q.options.every(opt => opt.trim())
    );

    if (validQuestions.length === 0) {
      alert('Please add at least one complete question with all options filled.');
      return;
    }

    const totalPoints = validQuestions.reduce((sum, q) => sum + q.points, 0);

    try {
      // Save to challenges collection
      await addDoc(collection(db, 'challenges'), {
        ...newChallenge,
        type: 'quiz',
        questions: validQuestions,
        totalPoints,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || 'School Administrator',
        createdAt: serverTimestamp(),
        participantCount: 0,
        completionCount: 0
      });

      // Also save to educationalResources for citizen access
      await addDoc(collection(db, 'educationalResources'), {
        title: newChallenge.title,
        description: newChallenge.description,
        type: 'quiz',
        content: JSON.stringify({ questions: validQuestions, totalPoints }),
        category: newChallenge.category,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || 'School Administrator',
        createdAt: serverTimestamp(),
        status: newChallenge.status === 'active' ? 'published' : 'draft',
        views: 0,
        likes: 0
      });

      // Reset form
      setNewChallenge({
        title: '',
        description: '',
        category: 'environmental-science',
        duration: 15,
        status: 'active'
      });
      setQuestions([{
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 10
      }]);
      setShowCreateModal(false);
      alert('Quiz created successfully!');
    } catch (error) {
      console.error('Error creating challenge:', error);
      alert('Failed to create quiz');
    }
  };

  // Delete challenge
  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'challenges', challengeId));
      alert('Quiz deleted successfully!');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      alert('Failed to delete quiz');
    }
  };

  // Toggle challenge status
  const toggleChallengeStatus = async (challengeId: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: currentStatus === 'active' ? 'inactive' : 'active'
      });
    } catch (error) {
      console.error('Error updating challenge status:', error);
      alert('Failed to update quiz status');
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || userRole !== 'school') {
    return null;
  }

  return (
    <>
      <SchoolHeader />
      <main className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🎯 Quiz & Challenge Management</h1>
            <p className={styles.subtitle}>
              Create and manage educational quizzes for the community
            </p>
          </div>
          <button 
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus-circle"></i> Create Quiz
          </button>
        </div>

        {/* Statistics */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-clipboard-question"></i>
            </div>
            <div>
              <div className={styles.statValue}>{challenges.length}</div>
              <div className={styles.statLabel}>Total Quizzes</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-users"></i>
            </div>
            <div>
              <div className={styles.statValue}>
                {challenges.reduce((sum, c) => sum + c.participantCount, 0)}
              </div>
              <div className={styles.statLabel}>Total Participants</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-check-double"></i>
            </div>
            <div>
              <div className={styles.statValue}>
                {challenges.reduce((sum, c) => sum + c.completionCount, 0)}
              </div>
              <div className={styles.statLabel}>Total Completions</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-star"></i>
            </div>
            <div>
              <div className={styles.statValue}>
                {challenges.filter(c => c.status === 'active').length}
              </div>
              <div className={styles.statLabel}>Active Quizzes</div>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        {challenges.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-clipboard-question"></i>
            <h3>No Quizzes Found</h3>
            <p>Create your first educational quiz to get started!</p>
            <button 
              className={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus-circle"></i> Create Quiz
            </button>
          </div>
        ) : (
          <div className={styles.challengesList}>
            {challenges.map((challenge) => (
              <div key={challenge.id} className={styles.challengeCard}>
                <div className={styles.challengeHeader}>
                  <div className={styles.challengeIconBox}>
                    <i className="fas fa-clipboard-question"></i>
                  </div>
                  <div className={styles.challengeBadges}>
                    <span className={`${styles.statusBadge} ${styles[challenge.status]}`}>
                      {challenge.status}
                    </span>
                  </div>
                </div>

                <h3 className={styles.challengeTitle}>{challenge.title}</h3>
                <p className={styles.challengeDescription}>{challenge.description}</p>

                <div className={styles.challengeDetails}>
                  <div className={styles.detailItem}>
                    <i className="fas fa-tag"></i>
                    <span>{challenge.category.replace('-', ' ')}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <i className="fas fa-question-circle"></i>
                    <span>{challenge.questions.length} questions</span>
                  </div>
                  <div className={styles.detailItem}>
                    <i className="fas fa-clock"></i>
                    <span>{challenge.duration} minutes</span>
                  </div>
                  <div className={styles.detailItem}>
                    <i className="fas fa-trophy"></i>
                    <span>{challenge.totalPoints} points</span>
                  </div>
                </div>

                <div className={styles.challengeStats}>
                  <div className={styles.statItem}>
                    <i className="fas fa-users"></i>
                    <span>{challenge.participantCount} participants</span>
                  </div>
                  <div className={styles.statItem}>
                    <i className="fas fa-check-circle"></i>
                    <span>{challenge.completionCount} completed</span>
                  </div>
                </div>

                <div className={styles.challengeActions}>
                  <button 
                    className={styles.toggleButton}
                    onClick={() => toggleChallengeStatus(challenge.id, challenge.status)}
                  >
                    <i className={`fas fa-${challenge.status === 'active' ? 'pause' : 'play'}`}></i>
                    {challenge.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    className={styles.deleteButton}
                    onClick={() => handleDeleteChallenge(challenge.id)}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Portal */}
        <div className={styles.backLink}>
          <Link href="/school-portal">
            <i className="fas fa-arrow-left"></i> Back to School Portal
          </Link>
        </div>
      </main>

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Quiz</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateChallenge} className={styles.form}>
              {/* Basic Info */}
              <div className={styles.formGroup}>
                <label htmlFor="title">Quiz Title *</label>
                <input
                  type="text"
                  id="title"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                  required
                  placeholder="e.g., Climate Change Knowledge Test"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                  required
                  placeholder="Brief description of the quiz..."
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={newChallenge.category}
                    onChange={(e) => setNewChallenge({...newChallenge, category: e.target.value})}
                    required
                  >
                    <option value="environmental-science">Environmental Science</option>
                    <option value="climate-change">Climate Change</option>
                    <option value="waste-management">Waste Management</option>
                    <option value="renewable-energy">Renewable Energy</option>
                    <option value="biodiversity">Biodiversity</option>
                    <option value="sustainability">Sustainability</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="duration">Duration (minutes) *</label>
                  <input
                    type="number"
                    id="duration"
                    value={newChallenge.duration}
                    onChange={(e) => setNewChallenge({...newChallenge, duration: parseInt(e.target.value)})}
                    required
                    min="5"
                    max="120"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  value={newChallenge.status}
                  onChange={(e) => setNewChallenge({...newChallenge, status: e.target.value as any})}
                  required
                >
                  <option value="active">Active (Visible to community)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>

              {/* Questions */}
              <div className={styles.questionsSection}>
                <div className={styles.sectionHeader}>
                  <h3>Questions</h3>
                  <button 
                    type="button" 
                    className={styles.addQuestionBtn}
                    onClick={addQuestion}
                  >
                    <i className="fas fa-plus"></i> Add Question
                  </button>
                </div>

                {questions.map((question, qIndex) => (
                  <div key={qIndex} className={styles.questionCard}>
                    <div className={styles.questionHeader}>
                      <h4>Question {qIndex + 1}</h4>
                      {questions.length > 1 && (
                        <button 
                          type="button"
                          className={styles.removeQuestionBtn}
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label>Question Text *</label>
                      <input
                        type="text"
                        value={question.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        placeholder="Enter your question..."
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Options *</label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className={styles.optionRow}>
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            required
                          />
                        </div>
                      ))}
                      <small className={styles.hint}>
                        <i className="fas fa-info-circle"></i> Select the radio button to mark the correct answer
                      </small>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Points *</label>
                      <input
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                        min="1"
                        max="100"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  <i className="fas fa-plus-circle"></i> Create Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
