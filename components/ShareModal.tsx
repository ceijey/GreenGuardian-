'use client';

import { Dialog } from '@headlessui/react';
import { toast, Toaster } from 'react-hot-toast';
import styles from './ShareModal.module.css';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text: string;
}

export default function ShareModal({ isOpen, onClose, url, title }: ShareModalProps) {
  const shareOptions = [
    {
      name: 'Facebook',
      icon: 'fab fa-facebook',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: 'Twitter',
      icon: 'fab fa-twitter',
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin',
      color: '#0A66C2',
      url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      color: '#25D366',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className={styles.dialog}>
      <Toaster position="top-center" />
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.panelContainer}>
        <Dialog.Panel className={styles.panel}>
          <Dialog.Title className={styles.title}>
            Share this Resource
            <button onClick={onClose} className={styles.closeButton}>
              <i className="fas fa-times"></i>
            </button>
          </Dialog.Title>
          <p className={styles.description}>
            Help spread awareness by sharing this resource with your network.
          </p>

          <div className={styles.shareGrid}>
            {shareOptions.map((option) => (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shareOption}
                style={{ '--option-color': option.color } as React.CSSProperties}
              >
                <i className={option.icon}></i>
                <span>{option.name}</span>
              </a>
            ))}
          </div>

          <div className={styles.copySection}>
            <input
              type="text"
              value={url}
              readOnly
              className={styles.urlInput}
            />
            <button onClick={handleCopyLink} className={styles.copyButton}>
              <i className="fas fa-copy"></i>
              <span>Copy</span>
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
