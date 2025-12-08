'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
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
import styles from './resources.module.css';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'lesson-plan';
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

export default function SchoolResourcesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'article' | 'video' | 'lesson-plan'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'article' as 'article' | 'video' | 'lesson-plan',
    content: '',
    category: 'environmental-science',
    status: 'published' as 'published' | 'draft'
  });

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

  // Load resources created by this school
  useEffect(() => {
    if (!user || userRole !== 'school') return;

    const q = query(
      collection(db, 'educationalResources'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resourcesList: Resource[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        resourcesList.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'article',
          content: data.content || '',
          category: data.category || '',
          createdBy: data.createdBy || '',
          createdByName: data.createdByName || '',
          createdByEmail: data.createdByEmail || '',
          createdAt: data.createdAt,
          views: data.views || 0,
          likes: data.likes || 0,
          status: data.status || 'published'
        });
      });
      
      setResources(resourcesList);
    });

    return unsubscribe;
  }, [user, userRole]);

  // Create new resource
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'educationalResources'), {
        ...newResource,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || 'School Administrator',
        createdAt: serverTimestamp(),
        views: 0,
        likes: 0
      });

      setNewResource({
        title: '',
        description: '',
        type: 'article',
        content: '',
        category: 'environmental-science',
        status: 'published'
      });
      setShowCreateModal(false);
      toast.success(`${newResource.type.charAt(0).toUpperCase() + newResource.type.slice(1)} created successfully!`);
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Failed to create resource');
    }
  };

  // Update resource
  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingResource) return;

    try {
      await updateDoc(doc(db, 'educationalResources', editingResource.id), {
        title: editingResource.title,
        description: editingResource.description,
        content: editingResource.content,
        category: editingResource.category,
        type: editingResource.type,
        status: editingResource.status,
        updatedAt: serverTimestamp()
      });

      setShowEditModal(false);
      setEditingResource(null);
      toast.success('Resource updated successfully!');
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    }
  };

  // Delete resource
  const handleDeleteResource = async (resourceId: string) => {
    setResourceToDelete(resourceId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!resourceToDelete) return;

    try {
      await deleteDoc(doc(db, 'educationalResources', resourceToDelete));
      toast.success('Resource deleted successfully!');
      setShowDeleteModal(false);
      setResourceToDelete(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  // Open edit modal
  const openEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setShowEditModal(true);
  };

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const typeMatch = filterType === 'all' || resource.type === filterType;
    const statusMatch = filterStatus === 'all' || resource.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'article': return 'fa-newspaper';
      case 'video': return 'fa-video';
      case 'lesson-plan': return 'fa-chalkboard-teacher';
      default: return 'fa-file';
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
            <h1 className={styles.title}>📚 Educational Resources Management</h1>
            <p className={styles.subtitle}>
              Create and manage articles, videos, and lesson plans for the community
            </p>
          </div>
          <button 
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus-circle"></i> Create Resource
          </button>
        </div>

        {/* Statistics */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-file-alt"></i>
            </div>
            <div>
              <div className={styles.statValue}>{resources.length}</div>
              <div className={styles.statLabel}>Total Resources</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-eye"></i>
            </div>
            <div>
              <div className={styles.statValue}>
                {resources.reduce((sum, r) => sum + r.views, 0)}
              </div>
              <div className={styles.statLabel}>Total Views</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-heart"></i>
            </div>
            <div>
              <div className={styles.statValue}>
                {resources.reduce((sum, r) => sum + r.likes, 0)}
              </div>
              <div className={styles.statLabel}>Total Likes</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <div className={styles.statValue}>
                {resources.filter(r => r.status === 'published').length}
              </div>
              <div className={styles.statLabel}>Published</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Type:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="article">Articles</option>
              <option value="video">Videos</option>
              <option value="lesson-plan">Lesson Plans</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          </div>
        </div>

        {/* Resources List */}
        {filteredResources.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-inbox"></i>
            <h3>No Resources Found</h3>
            <p>Create your first educational resource to get started!</p>
            <button 
              className={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus-circle"></i> Create Resource
            </button>
          </div>
        ) : (
          <div className={styles.resourcesList}>
            {filteredResources.map((resource) => (
              <div key={resource.id} className={styles.resourceCard}>
                <div className={styles.resourceHeader}>
                  <div className={styles.resourceIconBox}>
                    <i className={`fas ${getTypeIcon(resource.type)}`}></i>
                  </div>
                  <div className={styles.resourceBadges}>
                    <span className={styles.typeBadge}>{resource.type}</span>
                    <span className={`${styles.statusBadge} ${styles[resource.status]}`}>
                      {resource.status}
                    </span>
                  </div>
                </div>

                <h3 className={styles.resourceTitle}>{resource.title}</h3>
                <p className={styles.resourceDescription}>{resource.description}</p>

                <div className={styles.resourceMeta}>
                  <span className={styles.metaItem}>
                    <i className="fas fa-tag"></i> {resource.category.replace('-', ' ')}
                  </span>
                  <span className={styles.metaItem}>
                    <i className="fas fa-eye"></i> {resource.views} views
                  </span>
                  <span className={styles.metaItem}>
                    <i className="fas fa-heart"></i> {resource.likes} likes
                  </span>
                </div>

                <div className={styles.resourceActions}>
                  <button 
                    className={styles.editButton}
                    onClick={() => openEditModal(resource)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button 
                    className={styles.deleteButton}
                    onClick={() => handleDeleteResource(resource.id)}
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

      {/* Create Resource Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create Educational Resource</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateResource} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Resource Title *</label>
                <input
                  type="text"
                  id="title"
                  value={newResource.title}
                  onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                  required
                  placeholder="e.g., Introduction to Climate Change"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={newResource.description}
                  onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                  required
                  placeholder="Brief description of the content..."
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="type">Resource Type *</label>
                  <select
                    id="type"
                    value={newResource.type}
                    onChange={(e) => setNewResource({...newResource, type: e.target.value as any})}
                    required
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="lesson-plan">Lesson Plan</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={newResource.category}
                    onChange={(e) => setNewResource({...newResource, category: e.target.value})}
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
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="content">
                  Content *
                  {newResource.type === 'video' && ' (Enter video URL)'}
                  {newResource.type === 'article' && ' (Write your article content)'}
                  {newResource.type === 'lesson-plan' && ' (Enter lesson plan details)'}
                </label>
                <textarea
                  id="content"
                  value={newResource.content}
                  onChange={(e) => setNewResource({...newResource, content: e.target.value})}
                  required
                  placeholder={
                    newResource.type === 'video' 
                      ? 'https://youtube.com/...' 
                      : newResource.type === 'article'
                      ? 'Write your article content here...'
                      : 'Enter lesson plan objectives, activities, and materials...'
                  }
                  rows={8}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  value={newResource.status}
                  onChange={(e) => setNewResource({...newResource, status: e.target.value as any})}
                  required
                >
                  <option value="published">Published (Visible to community)</option>
                  <option value="draft">Draft (Save for later)</option>
                </select>
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
                  <i className="fas fa-plus-circle"></i> Create Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditModal && editingResource && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit Resource</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateResource} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-title">Resource Title *</label>
                <input
                  type="text"
                  id="edit-title"
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({...editingResource, title: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-description">Description *</label>
                <textarea
                  id="edit-description"
                  value={editingResource.description}
                  onChange={(e) => setEditingResource({...editingResource, description: e.target.value})}
                  required
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-type">Resource Type *</label>
                  <select
                    id="edit-type"
                    value={editingResource.type}
                    onChange={(e) => setEditingResource({...editingResource, type: e.target.value as any})}
                    required
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="lesson-plan">Lesson Plan</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="edit-category">Category *</label>
                  <select
                    id="edit-category"
                    value={editingResource.category}
                    onChange={(e) => setEditingResource({...editingResource, category: e.target.value})}
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
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-content">Content *</label>
                <textarea
                  id="edit-content"
                  value={editingResource.content}
                  onChange={(e) => setEditingResource({...editingResource, content: e.target.value})}
                  required
                  rows={8}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-status">Status *</label>
                <select
                  id="edit-status"
                  value={editingResource.status}
                  onChange={(e) => setEditingResource({...editingResource, status: e.target.value as any})}
                  required
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  <i className="fas fa-save"></i> Update Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster position="top-center" toastOptions={{
        style: { zIndex: 99999 },
        duration: 3000,
      }} />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setResourceToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
}
