'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import styles from './Header.module.css'

interface GovHeaderProps {
  title?: string
}

export default function GovHeader({ title }: GovHeaderProps) {
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
    <header className={styles.header} style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <i className="fas fa-shield-alt"></i>
            <span className={styles.logoText}>{title || 'LOCAL GOVERNMENT PORTAL'}</span>
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
            aria-controls="gov-navigation"
            type="button"
          >
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"} aria-hidden="true"></i>
          </button>

          <nav id="gov-navigation" className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`} role="navigation" aria-label="Government Portal">
            <ul className={styles.navList} role="menubar">
              <li role="none">
                <Link 
                  href="/gov-portal" 
                  className={pathname === '/gov-portal' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/gov-portal' ? 'page' : undefined}
                >
                  <i className="fas fa-tachometer-alt" aria-hidden="true"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li role="none">
                <Link 
                  href="/gov-portal/reports" 
                  className={pathname === '/gov-portal/reports' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/gov-portal/reports' ? 'page' : undefined}
                >
                  <i className="fas fa-file-alt" aria-hidden="true"></i>
                  <span>Incident Reports</span>
                </Link>
              </li>
              <li role="none">
                <Link 
                  href="/gov-portal/environmental" 
                  className={pathname === '/gov-portal/environmental' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/gov-portal/environmental' ? 'page' : undefined}
                >
                  <i className="fas fa-leaf" aria-hidden="true"></i>
                  <span>Environmental Data</span>
                </Link>
              </li>
              <li role="none">
                <Link 
                  href="/gov-portal/analytics" 
                  className={pathname === '/gov-portal/analytics' ? styles.active : ''}
                  onClick={closeMenu}
                  role="menuitem"
                  aria-current={pathname === '/gov-portal/analytics' ? 'page' : undefined}
                >
                  <i className="fas fa-chart-line" aria-hidden="true"></i>
                  <span>Analytics</span>
                </Link>
              </li>
              
              {user && (
                <>
                  <li role="none" className={styles.userInfo}>
                    <div style={{ 
                      padding: '8px 16px', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-user-shield" aria-hidden="true"></i>
                      <span style={{ fontSize: '14px' }}>{user.email}</span>
                    </div>
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
          <div style={{ 
            padding: '16px', 
            background: 'rgba(30, 60, 114, 0.1)', 
            borderBottom: '2px solid rgba(30, 60, 114, 0.2)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '20px', color: '#1e3c72' }}></i>
              <strong style={{ color: '#1e3c72' }}>Government Official</strong>
            </div>
            <small style={{ color: '#666' }}>{user?.email}</small>
          </div>
          <Link href="/gov-portal" onClick={closeMenu}>
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </Link>
          <Link href="/gov-portal/reports" onClick={closeMenu}>
            <i className="fas fa-file-alt"></i> Incident Reports
          </Link>
          <Link href="/gov-portal/environmental" onClick={closeMenu}>
            <i className="fas fa-leaf"></i> Environmental Data
          </Link>
          <Link href="/gov-portal/analytics" onClick={closeMenu}>
            <i className="fas fa-chart-line"></i> Analytics
          </Link>
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
          {user && (
            <button 
              onClick={() => {
                handleLogout()
                closeMenu()
              }} 
              className={styles.logoutButton} 
              aria-label="Log out of your account"
              type="button"
              style={{ width: '100%', textAlign: 'left' }}
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              <span>Logout</span>
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
