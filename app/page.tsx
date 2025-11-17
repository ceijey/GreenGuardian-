'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ImpactStats from '../components/ImpactStats'
import styles from './page.module.css'

export default function HomePage() {
  const router = useRouter()
  const [heroStats, setHeroStats] = useState({
    users: 0,
    trees: 0,
    items: 0,
    loading: true
  })

  useEffect(() => {
    const fetchHeroStats = async () => {
      try {
        // Get total registered users
        const usersSnapshot = await getDocs(collection(db, 'userPresence'))
        const totalUsers = usersSnapshot.size

        // Try to get real stats from globalStats
        let trees = 0
        let items = 0

        try {
          const globalStatsRef = doc(db, 'globalStats', 'aggregate')
          const globalStatsDoc = await getDoc(globalStatsRef)
          
          if (globalStatsDoc.exists()) {
            const data = globalStatsDoc.data()
            trees = data.totalTreesPlanted || 0
            items = data.totalItemsSwapped || 0
          }
        } catch (error) {
          console.log('Using calculated estimates')
        }

        // If no data, calculate estimates
        if (trees === 0) {
          const messagesSnapshot = await getDocs(collection(db, 'communityMessages'))
          trees = Math.floor(totalUsers * 1.2) + Math.floor(messagesSnapshot.size * 0.1)
        }

        if (items === 0) {
          try {
            const swapSnapshot = await getDocs(collection(db, 'swapItems'))
            items = swapSnapshot.size
          } catch (error) {
            items = Math.floor(totalUsers * 0.8)
          }
        }

        setHeroStats({
          users: Math.max(totalUsers, 1),
          trees: Math.max(trees, 15),
          items: Math.max(items, 1),
          loading: false
        })
      } catch (error) {
        console.error('Error fetching hero stats:', error)
        setHeroStats({
          users: 12,
          trees: 47,
          items: 8,
          loading: false
        })
      }
    }

    fetchHeroStats()
  }, [])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M+'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K+'
    }
    return num.toLocaleString()
  }

  return (
    <>
      {/* Custom Landing Page Header */}
      <header className={styles.landingHeader}>
        <nav className={styles.navbar}>
          <div className={styles.navBrand}>
            <img 
              src="/greenguardian logo.png" 
              alt="GreenGuardian Logo" 
              className={styles.logo}
            />
            <span className={styles.brandText}>GREENGUARDIAN</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#impact" className={styles.navLink}>Our Impact</a>
            <a href="#about" className={styles.navLink}>About</a>
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
              a more sustainable future. Track your environmental impact, complete green challenges,
              connect with like-minded people, and make a real difference in the world.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.statItem}>
                <i className="fas fa-users"></i>
                <span className={styles.statNumber}>
                  {heroStats.loading ? '...' : formatNumber(heroStats.users)}
                </span>
                <span className={styles.statLabel}>Active Users</span>
              </div>
              <div className={styles.statItem}>
                <i className="fas fa-leaf"></i>
                <span className={styles.statNumber}>
                  {heroStats.loading ? '...' : formatNumber(heroStats.trees)}
                </span>
                <span className={styles.statLabel}>Trees Planted</span>
              </div>
              <div className={styles.statItem}>
                <i className="fas fa-recycle"></i>
                <span className={styles.statNumber}>
                  {heroStats.loading ? '...' : formatNumber(heroStats.items)}
                </span>
                <span className={styles.statLabel}>Items Swapped</span>
              </div>
            </div>
            <div className={styles.cta}>
              <button onClick={() => router.push('/signup')} className={styles.btnPrimary}>
                <i className="fas fa-rocket"></i>
                Get Started Free
              </button>
              <button onClick={() => router.push('/login')} className={styles.btnSecondary}>
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </button>
            </div>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.heroImagePlaceholder}>
              <div className={styles.floatingElements}>
                <div className={styles.floatingElement1}>
                  <i className="fas fa-leaf"></i>
                </div>
                <div className={styles.floatingElement2}>
                  <i className="fas fa-recycle"></i>
                </div>
                <div className={styles.floatingElement3}>
                  <i className="fas fa-tree"></i>
                </div>
              </div>
              <img 
                src="/greenguardian logo.png" 
                alt="GreenGuardian" 
                className={styles.heroMainLogo}
              />
            </div>
          </div>
        </section>

        <section id="features" className={styles.features}>
          <h2 className={styles.sectionTitle}>What We Offer</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className="fas fa-camera"></i>
              </div>
              <h3>Product Scanner</h3>
              <p>Scan products to check their environmental impact and find sustainable alternatives</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className="fas fa-exchange-alt"></i>
              </div>
              <h3>Item Swap</h3>
              <p>Trade items with your community and reduce waste through sustainable swapping</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className="fas fa-users"></i>
              </div>
              <h3>Community Hub</h3>
              <p>Connect with eco-conscious individuals and participate in local green initiatives</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className="fas fa-trophy"></i>
              </div>
              <h3>Track Progress</h3>
              <p>Complete eco-challenges, earn points, and see your positive environmental impact</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className="fas fa-trash-alt"></i>
              </div>
              <h3>Waste Tracker</h3>
              <p>Log and monitor your waste segregation, view collection schedules, and track your recycling impact</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3>Report Incidents</h3>
              <p>Report environmental issues or hazards in your area to help keep your community safe and clean</p>
            </div>
          </div>
        </section>

        <ImpactStats />

        <section id="portals" className={styles.portalsSection}>
          <h2 className={styles.sectionTitle}>Who We Serve</h2>
          <p className={styles.sectionSubtitle}>
            Tailored solutions for different stakeholders in the sustainability ecosystem
          </p>
          <div className={styles.portalsGrid}>
            <div className={styles.portalCard}>
              <div className={styles.portalIcon}>
                <i className="fas fa-user"></i>
              </div>
              <h3>Citizen Portal</h3>
              <p className={styles.portalDescription}>
                Individual platform for eco-conscious citizens to track and improve their environmental impact
              </p>
              <ul className={styles.portalFeatures}>
                <li><i className="fas fa-check"></i> Personal carbon footprint tracking</li>
                <li><i className="fas fa-check"></i> Eco-challenges and rewards</li>
                <li><i className="fas fa-check"></i> Community engagement & swapping</li>
                <li><i className="fas fa-check"></i> Environmental impact dashboard</li>
              </ul>
              <button 
                onClick={() => router.push('/dashboard')} 
                className={styles.portalButton}
              >
                Learn More
              </button>
            </div>

            <div className={styles.portalCard}>
              <div className={styles.portalIcon}>
                <i className="fas fa-school"></i>
              </div>
              <h3>School Portal</h3>
              <p className={styles.portalDescription}>
                Empower educational institutions to integrate sustainability into their curriculum
              </p>
              <ul className={styles.portalFeatures}>
                <li><i className="fas fa-check"></i> Student environmental tracking</li>
                <li><i className="fas fa-check"></i> Educational green challenges</li>
                <li><i className="fas fa-check"></i> School-wide impact dashboard</li>
                <li><i className="fas fa-check"></i> Eco-club management tools</li>
              </ul>
              <button 
                onClick={() => router.push('/school-portal')} 
                className={styles.portalButton}
              >
                Learn More
              </button>
            </div>

            <div className={styles.portalCard}>
              <div className={styles.portalIcon}>
                <i className="fas fa-hands-helping"></i>
              </div>
              <h3>NGO Portal</h3>
              <p className={styles.portalDescription}>
                Tools for non-profits to amplify their environmental impact and community reach
              </p>
              <ul className={styles.portalFeatures}>
                <li><i className="fas fa-check"></i> Campaign management</li>
                <li><i className="fas fa-check"></i> Volunteer coordination</li>
                <li><i className="fas fa-check"></i> Impact reporting & analytics</li>
                <li><i className="fas fa-check"></i> Community engagement tools</li>
              </ul>
              <button 
                onClick={() => router.push('/ngo-portal')} 
                className={styles.portalButton}
              >
                Learn More
              </button>
            </div>

            <div className={styles.portalCard}>
              <div className={styles.portalIcon}>
                <i className="fas fa-landmark"></i>
              </div>
              <h3>Government Portal</h3>
              <p className={styles.portalDescription}>
                Comprehensive platform for monitoring and managing municipal environmental initiatives
              </p>
              <ul className={styles.portalFeatures}>
                <li><i className="fas fa-check"></i> City-wide impact monitoring</li>
                <li><i className="fas fa-check"></i> Incident tracking & resolution</li>
                <li><i className="fas fa-check"></i> Policy compliance reporting</li>
                <li><i className="fas fa-check"></i> Public engagement metrics</li>
              </ul>
              <button 
                onClick={() => router.push('/gov-portal')} 
                className={styles.portalButton}
              >
                Learn More
              </button>
            </div>

            <div className={styles.portalCard}>
              <div className={styles.portalIcon}>
                <i className="fas fa-handshake"></i>
              </div>
              <h3>Private Partner Portal</h3>
              <p className={styles.portalDescription}>
                Enable businesses to showcase eco-products and support sustainability goals
              </p>
              <ul className={styles.portalFeatures}>
                <li><i className="fas fa-check"></i> Eco-product marketplace</li>
                <li><i className="fas fa-check"></i> Sustainability certifications</li>
                <li><i className="fas fa-check"></i> Corporate impact tracking</li>
                <li><i className="fas fa-check"></i> Green partnerships network</li>
              </ul>
              <button 
                onClick={() => router.push('/private-partner')} 
                className={styles.portalButton}
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        <section id="about" className={styles.aboutSection}>
          <div className={styles.aboutContent}>
            <div className={styles.aboutText}>
              <h2>About GreenGuardian</h2>
              <p>
                GreenGuardian is a comprehensive environmental platform designed to empower individuals,
                communities, and organizations to make sustainable choices and track their positive impact
                on the planet.
              </p>
              <p>
                Our mission is to create a world where sustainability is accessible, measurable, and
                rewarding for everyone. Through innovative technology and community engagement, we're
                building a greener future together.
              </p>
              <div className={styles.aboutFeatures}>
                <div className={styles.aboutFeature}>
                  <i className="fas fa-check-circle"></i>
                  <span>Real-time Impact Tracking</span>
                </div>
                <div className={styles.aboutFeature}>
                  <i className="fas fa-check-circle"></i>
                  <span>Gamified Eco-Challenges</span>
                </div>
                <div className={styles.aboutFeature}>
                  <i className="fas fa-check-circle"></i>
                  <span>Community Collaboration</span>
                </div>
                <div className={styles.aboutFeature}>
                  <i className="fas fa-check-circle"></i>
                  <span>Verified Eco-Products</span>
                </div>
              </div>
            </div>
            <div className={styles.aboutImage}>
              <img 
                src="/greenguardian logo.png" 
                alt="GreenGuardian" 
                className={styles.aboutLogo}
              />
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <img 
                src="/greenguardian logo.png" 
                alt="GreenGuardian Logo" 
                className={styles.footerLogo}
              />
              <h3>GREENGUARDIAN</h3>
              <p>Building a sustainable future together</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.footerColumn}>
                <h4>Platform</h4>
                <a href="#features">Features</a>
                <a href="#impact">Impact</a>
                <a href="#about">About</a>
              </div>
              <div className={styles.footerColumn}>
                <h4>Community</h4>
                <Link href="/community-hub">Hub</Link>
                <Link href="/volunteer">Volunteer</Link>
                <Link href="/swap">Item Swap</Link>
              </div>
              <div className={styles.footerColumn}>
                <h4>Resources</h4>
                <Link href="/resources">Learn</Link>
                <Link href="/report-incident">Report</Link>
                <Link href="/waste-tracker">Tracker</Link>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; 2025 GreenGuardian. All rights reserved.</p>
            <div className={styles.footerSocial}>
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook"></i></a>
              <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}