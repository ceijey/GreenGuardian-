'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import styles from './page.module.css'

export default function HomePage() {
  const router = useRouter()

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Welcome to GreenGuardian</h1>
            <p className={styles.subtitle}>Your Partner in Sustainable Living</p>
            <p className={styles.description}>
              Join our community of eco-conscious individuals working together to create
              a more sustainable future. Track your impact, complete challenges, and
              connect with like-minded people.
            </p>
            <div className={styles.cta}>
              <button onClick={() => router.push('/login')} className={styles.btnPrimary}>
                Get Started
              </button>
              <button onClick={() => router.push('/signup')} className={styles.btnSecondary}>
                Join Community
              </button>
            </div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.heroImagePlaceholder}>
              <i className="fas fa-leaf"></i>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <h2>What We Offer</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard} onClick={() => router.push('/scanner')}>
              <i className="fas fa-camera"></i>
              <h3>Product Scanner</h3>
              <p>Scan products to check their environmental impact and find sustainable alternatives</p>
            </div>
            <div className={styles.featureCard} onClick={() => router.push('/swap')}>
              <i className="fas fa-exchange-alt"></i>
              <h3>Item Swap</h3>
              <p>Trade items with your community and reduce waste through sustainable swapping</p>
            </div>
            <div className={styles.featureCard} onClick={() => router.push('/community')}>
              <i className="fas fa-users"></i>
              <h3>Community Hub</h3>
              <p>Connect with eco-conscious individuals and participate in local green initiatives</p>
            </div>
            <div className={styles.featureCard} onClick={() => router.push('/profile')}>
              <i className="fas fa-trophy"></i>
              <h3>Track Progress</h3>
              <p>Complete eco-challenges, earn points, and see your positive environmental impact</p>
            </div>
          </div>
        </section>

        <section className={styles.stats}>
          <h2>Our Impact Together</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>1,247</div>
              <div className={styles.statLabel}>Active Members</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>15,432</div>
              <div className={styles.statLabel}>Trees Planted</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>8,921</div>
              <div className={styles.statLabel}>Items Swapped</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>45,678</div>
              <div className={styles.statLabel}>Challenges Completed</div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}