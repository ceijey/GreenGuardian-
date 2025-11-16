'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import styles from './Header.module.css'

export default function PartnerHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up')
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < 10) {
        setScrollDirection('up')
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setScrollDirection('down')
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection('up')
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Failed to logout', error)
    }
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className={`${styles.header} ${styles.partnerHeader} ${scrollDirection === 'down' ? styles.headerHidden : ''}`}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Image 
              src="/greenguardian logo.png" 
              alt="GreenGuardian Logo" 
              width={32} 
              height={32}
              className={styles.logoImage}
              priority
            />
            <span className={styles.logoText}>GREENGUARDIAN - PARTNER PORTAL</span>
          </div>
          
          <button 
            className={styles.mobileMenuButton}
            onClick={toggleMenu}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            type="button"
          >
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"} aria-hidden="true"></i>
          </button>

          <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`} role="navigation">
            <ul className={styles.navList}>
              <li>
                <Link 
                  href="/private-partner" 
                  className={pathname === '/private-partner' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-tachometer-alt" aria-hidden="true"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/private-partner/sponsorships" 
                  className={pathname.startsWith('/private-partner/sponsorships') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-handshake" aria-hidden="true"></i>
                  <span>Sponsorships</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/private-partner/products" 
                  className={pathname.startsWith('/private-partner/products') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-box-open" aria-hidden="true"></i>
                  <span>Products</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/private-partner/analytics" 
                  className={pathname.startsWith('/private-partner/analytics') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-chart-pie" aria-hidden="true"></i>
                  <span>CSR Analytics</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/private-partner/waste-tracker" 
                  className={pathname.startsWith('/private-partner/waste-tracker') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-trash-alt" aria-hidden="true"></i>
                  <span>Waste Tracker</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/private-partner/reports" 
                  className={pathname.startsWith('/private-partner/reports') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-file-invoice" aria-hidden="true"></i>
                  <span>Reports</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/private-partner/profile" 
                  className={pathname === '/private-partner/profile' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-user-circle" aria-hidden="true"></i>
                  <span>Profile</span>
                </Link>
              </li>
              {user && (
                <li>
                  <button 
                    onClick={() => {
                      handleLogout()
                      closeMenu()
                    }} 
                    className={styles.logoutButton}
                    type="button"
                  >
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    <span>Logout</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
      {isMenuOpen && (
        <div 
          className={styles.overlay} 
          onClick={closeMenu}
          role="presentation"
        ></div>
      )}
    </header>
  )
}
