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
            aria-label="Toggle navigation menu"
          >
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
          </button>

          <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
            <ul className={styles.navList}>
              <li>
                <Link 
                  href="/dashboard" 
                  className={pathname === '/' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-home"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li className={styles.dropdown}>
                <Link 
                  href="/swap" 
                  className={pathname.startsWith('/') ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-exchange-alt"></i>
                  <span>Swap</span>
                  <i className="fas fa-caret-down"></i>
                </Link>
                <div className={styles.dropdownMenu}>
                  <Link href="/swap" className={styles.dropdownItem} onClick={closeMenu}>
                    <i className="fas fa-exchange-alt"></i>
                    Browse Items
                  </Link>
                  <Link href="/swap/requests" className={styles.dropdownItem} onClick={closeMenu}>
                    <i className="fas fa-inbox"></i>
                    My Requests
                  </Link>
                </div>
              </li>
              <li>
                <Link 
                  href="/challenges" 
                  className={pathname === '/' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-medal"></i>
                  <span>Challenges</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/community" 
                  className={pathname === '/' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-users"></i>
                  <span>Community</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile" 
                  className={pathname === '/' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-user"></i>
                  <span>Profile</span>
                </Link>
              </li>
              {user && (
                <>
                  <li className={styles.notificationItem}>
                    <CommunityNotifications position="top-right" />
                  </li>
                  <li>
                    <button 
                      onClick={() => {
                        handleLogout()
                        closeMenu()
                      }} 
                      className={styles.logoutButton} 
                      title="Logout"
                    >
                      <i className="fas fa-sign-out-alt"></i>
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
      {isMenuOpen && <div className={styles.mobileOverlay} onClick={closeMenu}></div>}
    </header>
  )
}