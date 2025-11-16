'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import CommunityNotifications from './CommunityNotifications'
import styles from './Header.module.css'

interface HeaderProps {
  logo?: string
  title?: string
  showUserProfile?: boolean
}

export default function Header({ logo, title, showUserProfile = false }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up')
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // If at the top, always show header
      if (currentScrollY < 10) {
        setScrollDirection('up')
      }
      // If scrolling down and past threshold, hide header
      else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setScrollDirection('down')
      }
      // If scrolling up, show header
      else if (currentScrollY < lastScrollY) {
        setScrollDirection('up')
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollY])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Failed to logout', error)
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className={`${styles.header} ${scrollDirection === 'down' ? styles.headerHidden : ''}`}>
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
            <span className={styles.logoText}>{title || 'GREENGUARDIAN'}</span>
          </div>
          
          <button 
            className={styles.mobileMenuButton}
            onClick={toggleMenu}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
              }
            }}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            type="button"
          >
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"} aria-hidden="true"></i>
          </button>

          <nav id="primary-navigation" className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`} role="navigation" aria-label="Primary">
            <ul className={styles.navList} role="menubar">
              <li role="none">
                <Link 
                  href="/dashboard" 
                  className={pathname === '/dashboard' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/dashboard' ? 'page' : undefined}
                >
                  <i className="fas fa-home" aria-hidden="true"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li className={styles.dropdown} role="none">
                <Link 
                  href="/swap" 
                  className={pathname.startsWith('/swap') ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname.startsWith('/swap') ? 'page' : undefined}
                  aria-haspopup="true"
                  aria-expanded={isMenuOpen}
                >
                  <i className="fas fa-exchange-alt" aria-hidden="true"></i>
                  <span>Swap</span>
                  <i className="fas fa-caret-down" aria-hidden="true"></i>
                </Link>
                <div className={styles.dropdownMenu} role="menu">
                  <Link href="/swap" className={styles.dropdownItem} onClick={closeMenu} role="menuitem">
                    <i className="fas fa-exchange-alt" aria-hidden="true"></i>
                    Browse Items
                  </Link>
                  <Link href="/swap/requests" className={styles.dropdownItem} onClick={closeMenu} role="menuitem">
                    <i className="fas fa-inbox" aria-hidden="true"></i>
                    My Requests
                  </Link>
                </div>
              </li>
              <li role="none">
                <Link 
                  href="/community-hub" 
                  className={pathname === '/community-hub' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/community-hub' ? 'page' : undefined}
                >
                  <i className="fas fa-medal" aria-hidden="true"></i>
                  <span>Community Hub</span>
                </Link>
              </li>
              <li role="none">
                <Link 
                  href="/community" 
                  className={pathname === '/community' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/community' ? 'page' : undefined}
                >
                  <i className="fas fa-users" aria-hidden="true"></i>
                  <span>Community Messages</span>
                </Link>
              </li>
              <li role="none">
                <Link 
                  href="/waste-tracker" 
                  className={pathname === '/waste-tracker' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/waste-tracker' ? 'page' : undefined}
                >
                  <i className="fas fa-recycle" aria-hidden="true"></i>
                  <span>Waste Tracker</span>
                </Link>
              </li>
              <li role="none">
                <Link 
                  href="/report-incident" 
                  className={pathname === '/report-incident' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/report-incident' ? 'page' : undefined}
                >
                  <i className="fas fa-bullhorn" aria-hidden="true"></i>
                  <span>Report Incident</span>
                </Link>
              </li>
              {user?.email?.endsWith('@gov.ph') && (
                <li role="none">
                  <Link 
                    href="/gov-portal" 
                    className={pathname === '/gov-portal' ? styles.active : ''}
                    onClick={closeMenu}
                    role="menuitem"
                    aria-current={pathname === '/gov-portal' ? 'page' : undefined}
                  >
                    <i className="fas fa-landmark" aria-hidden="true"></i>
                    <span>Gov Portal</span>
                  </Link>
                </li>
              )}
              <li role="none">
                <Link 
                  href="/profile" 
                  className={pathname === '/profile' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/profile' ? 'page' : undefined}
                >
                  <i className="fas fa-user" aria-hidden="true"></i>
                  <span>Profile</span>
                </Link>
              </li>
              {user && (
                <>
                  <li className={styles.notificationItem} role="none">
                    <CommunityNotifications position="top-right" />
                  </li>
                  <li role="none">
                    <button 
                      onClick={() => {
                        handleLogout()
                        closeMenu()
                      }} 
                      className={styles.logoutButton} 
                      aria-label="Log out of your account"
                      type="button"
                    >
                      <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                      <span>Logout</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
          
          {showUserProfile && (
            <div className={styles.userActions}>
              <div className={styles.userProfile}>
                <div className={styles.userAvatar}>M</div>
                <div>Missy M.</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isMenuOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={closeMenu}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeMenu();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
        ></div>
      )}
      {isMenuOpen && (
        <nav className={styles.mobileMenu}>
          <Link href="/dashboard" onClick={closeMenu}>🏠 Dashboard</Link>
          <Link href="/swap" onClick={closeMenu}>🔄 Swap</Link>
          <Link href="/challenges" onClick={closeMenu}>🏆 Challenges</Link>
          <Link href="/community" onClick={closeMenu}>🌍 Community</Link>
          <Link href="/community-hub" onClick={closeMenu}>🏅 Community Hub</Link>
          <Link href="/waste-tracker" onClick={closeMenu}>♻️ Waste Tracker</Link>
          <Link href="/report-incident" onClick={closeMenu}>📢 Report Incident</Link>
          {user?.email?.endsWith('@gov.ph') && (
            <Link href="/gov-portal" onClick={closeMenu}>🏛️ Gov Portal</Link>
          )}
          <Link href="/profile" onClick={closeMenu}>👤 Profile</Link>
          <Link href="/settings" onClick={closeMenu}>⚙️ Settings</Link>
          <Link href="/help" onClick={closeMenu}>❓ Help</Link>
          {user ? (
            <button 
              onClick={() => {
                handleLogout()
                closeMenu()
              }} 
              className={styles.logoutButton} 
              aria-label="Log out of your account"
              type="button"
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              <span>Logout</span>
            </button>
          ) : (
            <Link href="/login" onClick={closeMenu}>🔑 Login</Link>
          )}
        </nav>
      )}
    </header>
  )
}