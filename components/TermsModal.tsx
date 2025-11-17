'use client';

import { useState } from 'react';
import styles from './TermsModal.module.css';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Terms and Conditions</h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            aria-label="Close terms and conditions"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className={styles.content}>
          <section>
            <h3>1. Acceptance of Terms</h3>
            <p>
              By accessing and using Green Guardian, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these terms, please do not use 
              this service.
            </p>
          </section>

          <section>
            <h3>2. Use of Service</h3>
            <p>
              Green Guardian is an environmental sustainability platform designed to help users track 
              waste management, participate in community challenges, and contribute to environmental 
              conservation efforts.
            </p>
            <ul>
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree to use the service for lawful purposes only</li>
              <li>You will not misuse or abuse the platform's features</li>
            </ul>
          </section>

          <section>
            <h3>3. User Accounts</h3>
            <p>
              When you create an account with us, you must provide information that is accurate, 
              complete, and current at all times. Failure to do so constitutes a breach of the Terms.
            </p>
            <ul>
              <li>Government officials must use their @gordoncollege.edu.ph email</li>
              <li>Each user may only create one account</li>
              <li>Account sharing is prohibited</li>
              <li>You are responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h3>4. Privacy and Data Collection</h3>
            <p>
              We collect and process personal data in accordance with our Privacy Policy. By using 
              Green Guardian, you consent to:
            </p>
            <ul>
              <li>Collection of your email, name, and profile information</li>
              <li>Tracking of waste management activities and environmental impact</li>
              <li>Use of location data for community features (with your permission)</li>
              <li>Storage of your activity logs and challenge participation</li>
            </ul>
          </section>

          <section>
            <h3>5. User-Generated Content</h3>
            <p>
              Users may post content including reports, comments, and photos. By posting content, 
              you grant Green Guardian a non-exclusive license to use, modify, and display that content.
            </p>
            <ul>
              <li>Content must be accurate and truthful</li>
              <li>No offensive, harmful, or inappropriate content</li>
              <li>Respect intellectual property rights</li>
              <li>We reserve the right to remove violating content</li>
            </ul>
          </section>

          <section>
            <h3>6. Rewards and Points System</h3>
            <p>
              Green Guardian operates a rewards system where users earn points for environmental 
              activities. Points have no monetary value and cannot be exchanged for cash.
            </p>
            <ul>
              <li>Points are earned through verified activities</li>
              <li>Fraudulent point accumulation may result in account suspension</li>
              <li>Rewards and badges are subject to availability</li>
              <li>We reserve the right to modify the rewards system</li>
            </ul>
          </section>

          <section>
            <h3>7. Community Guidelines</h3>
            <p>
              All users must adhere to our community guidelines:
            </p>
            <ul>
              <li>Be respectful and courteous to other users</li>
              <li>Report incidents accurately and honestly</li>
              <li>Do not spam or harass other members</li>
              <li>Follow local environmental laws and regulations</li>
            </ul>
          </section>

          <section>
            <h3>8. Intellectual Property</h3>
            <p>
              The service and its original content, features, and functionality are owned by 
              Green Guardian and are protected by international copyright, trademark, and other 
              intellectual property laws.
            </p>
          </section>

          <section>
            <h3>9. Limitation of Liability</h3>
            <p>
              Green Guardian is provided "as is" without warranties of any kind. We do not guarantee 
              the accuracy, completeness, or usefulness of any information on the service.
            </p>
          </section>

          <section>
            <h3>10. Changes to Terms</h3>
            <p>
              We reserve the right to modify or replace these terms at any time. Continued use of 
              the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h3>11. Account Termination</h3>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for any 
              breach of these Terms. Upon termination, your right to use the service will cease 
              immediately.
            </p>
          </section>

          <section>
            <h3>12. Contact Information</h3>
            <p>
              If you have any questions about these Terms, please contact us at: 
              support@greenguardian.ph
            </p>
          </section>

          <section className={styles.lastUpdated}>
            <p><strong>Last Updated:</strong> November 17, 2025</p>
          </section>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onAccept} className={styles.acceptButton}>
            I Accept
          </button>
        </div>
      </div>
    </div>
  );
}
