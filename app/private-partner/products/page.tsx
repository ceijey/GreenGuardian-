'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './products.module.css';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  ecoScore: number;
  carbonFootprint: number;
  recyclable: boolean;
  biodegradable: boolean;
  sustainableMaterials: string[];
  certifications: string[];
  price?: number;
  imageUrl?: string;
  sponsorId: string;
  createdAt: any;
}

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'household',
    description: '',
    ecoScore: 50,
    carbonFootprint: 0,
    recyclable: false,
    biodegradable: false,
    sustainableMaterials: '',
    certifications: '',
    price: '',
    imageUrl: ''
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

          if (role !== 'private-partner') {
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

  // Load products
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'products'),
      where('sponsorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
    });

    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        ecoScore: formData.ecoScore,
        carbonFootprint: parseFloat(formData.carbonFootprint.toString()) || 0,
        recyclable: formData.recyclable,
        biodegradable: formData.biodegradable,
        sustainableMaterials: formData.sustainableMaterials.split(',').map(s => s.trim()).filter(s => s),
        certifications: formData.certifications.split(',').map(s => s.trim()).filter(s => s),
        price: parseFloat(formData.price) || 0,
        imageUrl: formData.imageUrl,
        sponsorId: user.uid,
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        name: '',
        category: 'household',
        description: '',
        ecoScore: 50,
        carbonFootprint: 0,
        recyclable: false,
        biodegradable: false,
        sustainableMaterials: '',
        certifications: '',
        price: '',
        imageUrl: ''
      });
      setShowAddModal(false);
      alert('✅ Product registered successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to register product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    }
  };

  const calculateStats = () => {
    if (products.length === 0) return { avgScore: 0, recyclableRate: 0, totalCerts: 0 };

    const avgScore = Math.round(products.reduce((sum, p) => sum + p.ecoScore, 0) / products.length);
    const recyclableCount = products.filter(p => p.recyclable).length;
    const recyclableRate = Math.round((recyclableCount / products.length) * 100);
    const totalCerts = products.reduce((sum, p) => sum + p.certifications.length, 0);

    return { avgScore, recyclableRate, totalCerts };
  };

  const stats = calculateStats();

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>Eco-Products Registry</h1>
            <p>Showcase your sustainable products and track their environmental impact</p>
          </div>
          <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
            <i className="fas fa-plus"></i>
            Register Product
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <i className="fas fa-box"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{products.length}</span>
              <span className={styles.statLabel}>Total Products</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-leaf"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.avgScore}</span>
              <span className={styles.statLabel}>Avg. Eco-Score</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-recycle"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.recyclableRate}%</span>
              <span className={styles.statLabel}>Recyclable Rate</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-certificate"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalCerts}</span>
              <span className={styles.statLabel}>Certifications</span>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <>
            <div className={styles.emptyState}>
              <i className="fas fa-box-open"></i>
              <h2>No Products Registered Yet</h2>
              <p>Start showcasing your eco-friendly products and their environmental benefits.</p>
              <button className={styles.ctaButton} onClick={() => setShowAddModal(true)}>
                <i className="fas fa-plus-circle"></i>
                Register Your First Product
              </button>
            </div>

            <div className={styles.features}>
              <div className={styles.featureCard}>
                <i className="fas fa-leaf"></i>
                <h3>Eco-Score Rating</h3>
                <p>Track your products' environmental impact with detailed eco-scores.</p>
              </div>
              <div className={styles.featureCard}>
                <i className="fas fa-certificate"></i>
                <h3>Certifications</h3>
                <p>Display your sustainability certifications and credentials.</p>
              </div>
              <div className={styles.featureCard}>
                <i className="fas fa-chart-line"></i>
                <h3>Impact Analytics</h3>
                <p>Monitor carbon footprint reduction and environmental benefits.</p>
              </div>
              <div className={styles.featureCard}>
                <i className="fas fa-users"></i>
                <h3>Consumer Trust</h3>
                <p>Build credibility with transparent sustainability data.</p>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                {product.imageUrl && (
                  <div className={styles.productImage}>
                    <img src={product.imageUrl} alt={product.name} />
                  </div>
                )}
                <div className={styles.productContent}>
                  <div className={styles.productHeader}>
                    <h3>{product.name}</h3>
                    <span className={styles.ecoScore} style={{
                      background: product.ecoScore >= 80 ? '#48bb78' : 
                                 product.ecoScore >= 60 ? '#ed8936' : '#f56565'
                    }}>
                      {product.ecoScore}/100
                    </span>
                  </div>
                  <p className={styles.category}>
                    <i className="fas fa-tag"></i> {product.category}
                  </p>
                  <p className={styles.description}>{product.description}</p>
                  
                  <div className={styles.productDetails}>
                    <div className={styles.detailItem}>
                      <i className="fas fa-cloud"></i>
                      <span>{product.carbonFootprint} kg CO₂</span>
                    </div>
                    {product.recyclable && (
                      <div className={styles.badge}>
                        <i className="fas fa-recycle"></i> Recyclable
                      </div>
                    )}
                    {product.biodegradable && (
                      <div className={styles.badge}>
                        <i className="fas fa-leaf"></i> Biodegradable
                      </div>
                    )}
                  </div>

                  {product.sustainableMaterials.length > 0 && (
                    <div className={styles.materials}>
                      <strong>Materials:</strong> {product.sustainableMaterials.join(', ')}
                    </div>
                  )}

                  {product.certifications.length > 0 && (
                    <div className={styles.certifications}>
                      {product.certifications.map((cert, idx) => (
                        <span key={idx} className={styles.certBadge}>
                          <i className="fas fa-certificate"></i> {cert}
                        </span>
                      ))}
                    </div>
                  )}

                  {product.price && product.price > 0 && (
                    <div className={styles.price}>
                      ₱{product.price.toLocaleString()}
                    </div>
                  )}

                  <button 
                    className={styles.deleteButton}
                    onClick={() => handleDelete(product.id)}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className={styles.modal} onClick={() => setShowAddModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Register New Product</h2>
                <button onClick={() => setShowAddModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g., Bamboo Toothbrush"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="household">Household</option>
                    <option value="personal-care">Personal Care</option>
                    <option value="food">Food & Beverage</option>
                    <option value="fashion">Fashion & Apparel</option>
                    <option value="electronics">Electronics</option>
                    <option value="cleaning">Cleaning Supplies</option>
                    <option value="packaging">Packaging</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    rows={3}
                    placeholder="Describe your product and its environmental benefits"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Eco-Score (0-100) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.ecoScore}
                      onChange={(e) => setFormData({...formData, ecoScore: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Carbon Footprint (kg CO₂) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.carbonFootprint}
                      onChange={(e) => setFormData({...formData, carbonFootprint: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.checkboxGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.recyclable}
                        onChange={(e) => setFormData({...formData, recyclable: e.target.checked})}
                      />
                      <span>Recyclable</span>
                    </label>
                  </div>

                  <div className={styles.checkboxGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.biodegradable}
                        onChange={(e) => setFormData({...formData, biodegradable: e.target.checked})}
                      />
                      <span>Biodegradable</span>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Sustainable Materials (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.sustainableMaterials}
                    onChange={(e) => setFormData({...formData, sustainableMaterials: e.target.value})}
                    placeholder="e.g., Bamboo, Recycled Plastic, Organic Cotton"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Certifications (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.certifications}
                    onChange={(e) => setFormData({...formData, certifications: e.target.value})}
                    placeholder="e.g., Carbon Neutral, Fair Trade, Organic"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://example.com/product-image.jpg"
                  />
                </div>

                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? 'Registering...' : 'Register Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
