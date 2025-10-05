'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Header.module.css'

interface HeaderProps {
  logo?: string
  title?: string
  showUserProfile?: boolean
}

export default function Header({ logo, title, showUserProfile = false }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <i className={logo || 'fas fa-leaf'}></i>
            {title || 'GREENGUARDIAN'}
          </div>
          <nav>
            <ul>
              <li>
                <Link href="/" className={pathname === '/' ? styles.active : ''}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/scanner" className={pathname === '/scanner' ? styles.active : ''}>
                  Scanner
                </Link>
              </li>
              <li>
                <Link href="/swap" className={pathname === '/swap' ? styles.active : ''}>
                  Swap
                </Link>
              </li>
              <li>
                <Link href="/community" className={pathname === '/community' ? styles.active : ''}>
                  Community
                </Link>
              </li>
              <li>
                <Link href="/profile" className={pathname === '/profile' ? styles.active : ''}>
                  Profile
                </Link>
              </li>
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
    </header>
  )
}