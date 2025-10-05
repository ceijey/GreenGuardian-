'use client'

import { useRouter } from 'next/navigation'
import ImpactStats from '../components/ImpactStats'
import styles from './page.module.css'

export default function HomePage() {
  const router = useRouter()

  return (
    <>
      {/* Custom Landing Page Header */}
      <header className={styles.landingHeader}>
        <nav className={styles.navbar}>
          <div className={styles.navBrand}>
            <i className="fas fa-leaf" style={{ color: '#22c55e', fontSize: '24px' }}></i>
            <span className={styles.brandText}>GREENGUARDIAN</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#impact" className={styles.navLink}>Our Impact</a>
            <button 
              onClick={() => router.push('/login')} 
              className={styles.navButton}
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/signup')} 
              className={styles.navButtonPrimary}
            >
              Join Now
            </button>
          </div>
        </nav>
      </header>
      
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

        <section id="features" className={styles.features}>
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

        <ImpactStats />
      </div>
    </>
  )
}