'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <i className={logo || 'fas fa-leaf'}></i>
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
                  href="/challenges" 
                  className={pathname === '/challenges' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/challenges' ? 'page' : undefined}
                >
                  <i className="fas fa-medal" aria-hidden="true"></i>
                  <span>Challenges</span>
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
                  <span>Community</span>
                </Link>
              </li>
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
    </header>
  )
}