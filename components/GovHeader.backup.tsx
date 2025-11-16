'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import styles from './Header.module.css';

interface GovHeaderProps {
  title?: string;
}

export default function GovHeader({ title }: GovHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navClassName = isMenuOpen ? styles.nav + ' ' + styles.navOpen : styles.nav;

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
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            type="button"
          >
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
          </button>

          <nav className={navClassName}>
            <ul className={styles.navList}>
              <li>
                <Link 
                  href="/gov-portal" 
                  className={pathname === '/gov-portal' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/gov-portal/reports" 
                  className={pathname === '/gov-portal/reports' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-file-alt"></i>
                  <span>Reports</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/gov-portal/environmental" 
                  className={pathname === '/gov-portal/environmental' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-leaf"></i>
                  <span>Environmental</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/gov-portal/analytics" 
                  className={pathname === '/gov-portal/analytics' ? styles.active : ''}
                  onClick={closeMenu}
                >
                  <i className="fas fa-chart-line"></i>
                  <span>Analytics</span>
                </Link>
              </li>
              
              {user && (
                <>
                  <li className={styles.userInfo}>
                    <span>{user.email}</span>
                  </li>
                  <li>
                    <button 
                      onClick={handleLogout} 
                      className={styles.logoutButton}
                      type="button"
                    >
                      <i className="fas fa-sign-out-alt"></i>
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
        />
      )}
    </header>
  );
}
