'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import styles from './Header.module.css'

export default function NGOHeader() {
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
    <header className={`${styles.header} ${styles.ngoHeader} ${scrollDirection === 'down' ? styles.headerHidden : ''}`}>
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
            <span className={styles.logoText}>GREENGUARDIAN - NGO PORTAL</span>
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
                  href="/ngo-portal" 
                  className={pathname === '/ngo-portal' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-tachometer-alt" aria-hidden="true"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/ngo-portal/campaigns" 
                  className={pathname.startsWith('/ngo-portal/campaigns') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-bullhorn" aria-hidden="true"></i>
                  <span>Campaigns</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/ngo-portal/volunteers" 
                  className={pathname.startsWith('/ngo-portal/volunteers') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-users" aria-hidden="true"></i>
                  <span>Volunteers</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/ngo-portal/analytics" 
                  className={pathname.startsWith('/ngo-portal/analytics') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-chart-line" aria-hidden="true"></i>
                  <span>Analytics & Reports</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/ngo-portal/profile" 
                  className={pathname.startsWith('/ngo-portal/profile') ? styles.active : ''}
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
