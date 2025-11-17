'use client';

import styles from './PrivacyModal.module.css';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Privacy Policy</h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            aria-label="Close privacy policy"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className={styles.content}>
          <section>
            <h3>1. Introduction</h3>
            <p>
              Green Guardian ("we," "our," or "us") is committed to protecting your privacy. This Privacy 
              Policy explains how we collect, use, disclose, and safeguard your information when you use 
              our environmental sustainability platform.
            </p>
          </section>

          <section>
            <h3>2. Information We Collect</h3>
            <h4>Personal Information</h4>
            <ul>
              <li>Name and email address</li>
              <li>Account credentials (encrypted passwords)</li>
              <li>Profile information (optional)</li>
              <li>Role information (citizen, NGO, school, government, private partner)</li>
            </ul>

            <h4>Usage Information</h4>
            <ul>
              <li>Waste tracking data and recycling activities</li>
              <li>Challenge participation and completion records</li>
              <li>Points earned and badges achieved</li>
              <li>Community posts and interactions</li>
              <li>Product scans and swap requests</li>
            </ul>

            <h4>Location Information</h4>
            <ul>
              <li>Location data for incident reporting (with your permission)</li>
              <li>Location for community features and local initiatives</li>
              <li>Geographic data for environmental impact tracking</li>
            </ul>

            <h4>Technical Information</h4>
            <ul>
              <li>Device information and browser type</li>
              <li>IP address and login timestamps</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Usage patterns and feature interactions</li>
            </ul>
          </section>

          <section>
            <h3>3. How We Use Your Information</h3>
            <p>We use the collected information for the following purposes:</p>
            <ul>
              <li><strong>Account Management:</strong> Create and manage your user account</li>
              <li><strong>Service Delivery:</strong> Provide platform features and functionality</li>
              <li><strong>Progress Tracking:</strong> Monitor your environmental impact and achievements</li>
              <li><strong>Community Features:</strong> Enable connections with other eco-conscious users</li>
              <li><strong>Challenges & Rewards:</strong> Manage challenge participation and points system</li>
              <li><strong>Communications:</strong> Send important updates and notifications</li>
              <li><strong>Analytics:</strong> Improve platform performance and user experience</li>
              <li><strong>Safety & Security:</strong> Protect against fraud and unauthorized access</li>
            </ul>
          </section>

          <section>
            <h3>4. Information Sharing and Disclosure</h3>
            <h4>We DO NOT sell your personal information to third parties.</h4>
            <p>We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
              <li><strong>Service Providers:</strong> Trusted partners who help operate our platform (Firebase, cloud hosting)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              <li><strong>Community Features:</strong> Public posts and activities visible to other users</li>
              <li><strong>NGOs & Partners:</strong> Aggregate data for environmental initiatives (anonymized)</li>
              <li><strong>Government Officials:</strong> Environmental reports and incident data (as required)</li>
            </ul>
          </section>

          <section>
            <h3>5. Data Security</h3>
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul>
              <li>Encrypted data transmission (HTTPS/SSL)</li>
              <li>Secure password storage (hashed and salted)</li>
              <li>Firebase Authentication security protocols</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authorization checks</li>
              <li>Firestore security rules</li>
            </ul>
            <p>
              <em>Note: While we strive to protect your information, no method of transmission over 
              the internet is 100% secure. Use strong passwords and enable two-factor authentication 
              when available.</em>
            </p>
          </section>

          <section>
            <h3>6. Your Rights and Choices</h3>
            <p>You have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from non-essential communications</li>
              <li><strong>Data Portability:</strong> Export your data in a readable format</li>
              <li><strong>Restrict Processing:</strong> Limit how we use your information</li>
              <li><strong>Object:</strong> Object to certain types of data processing</li>
            </ul>
          </section>

          <section>
            <h3>7. Cookies and Tracking Technologies</h3>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Maintain your login session</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage and performance</li>
              <li>Personalize your experience</li>
            </ul>
            <p>You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h3>8. Children's Privacy</h3>
            <p>
              Green Guardian is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13. If you are a parent or guardian and 
              believe your child has provided us with personal information, please contact us immediately.
            </p>
            <p>
              For school accounts with students under 18, we require parental consent and comply with 
              educational privacy regulations (FERPA, COPPA).
            </p>
          </section>

          <section>
            <h3>9. Third-Party Services</h3>
            <p>Our platform uses the following third-party services:</p>
            <ul>
              <li><strong>Firebase (Google):</strong> Authentication, database, and hosting</li>
              <li><strong>Google Analytics:</strong> Usage analytics and metrics (if enabled)</li>
              <li><strong>Email Services:</strong> Transactional and notification emails</li>
            </ul>
            <p>These services have their own privacy policies governing their use of your information.</p>
          </section>

          <section>
            <h3>10. Data Retention</h3>
            <p>We retain your information for as long as:</p>
            <ul>
              <li>Your account remains active</li>
              <li>Necessary to provide our services</li>
              <li>Required by law or for legitimate business purposes</li>
            </ul>
            <p>
              When you delete your account, we will delete or anonymize your personal information within 
              30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h3>11. International Data Transfers</h3>
            <p>
              Your information may be transferred to and processed in countries other than your country 
              of residence. We ensure appropriate safeguards are in place for international transfers, 
              including compliance with GDPR and other data protection regulations.
            </p>
          </section>

          <section>
            <h3>12. Changes to Privacy Policy</h3>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes by:
            </p>
            <ul>
              <li>Posting the updated policy on our platform</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending an email notification (for material changes)</li>
            </ul>
            <p>Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h3>13. Your Consent</h3>
            <p>By using Green Guardian, you consent to:</p>
            <ul>
              <li>The collection and use of your information as described in this policy</li>
              <li>The transfer of your information to our service providers</li>
              <li>The use of cookies and tracking technologies</li>
            </ul>
          </section>

          <section>
            <h3>14. Contact Us</h3>
            <p>If you have questions or concerns about this Privacy Policy or our data practices:</p>
            <ul>
              <li><strong>Email:</strong> privacy@greenguardian.ph</li>
              <li><strong>Support:</strong> support@greenguardian.ph</li>
              <li><strong>Data Protection Officer:</strong> dpo@greenguardian.ph</li>
            </ul>
            <p>We will respond to your inquiry within 30 days.</p>
          </section>

          <section>
            <h3>15. Compliance</h3>
            <p>Green Guardian complies with:</p>
            <ul>
              <li>General Data Protection Regulation (GDPR) - EU</li>
              <li>California Consumer Privacy Act (CCPA) - USA</li>
              <li>Data Privacy Act of 2012 - Philippines</li>
              <li>Other applicable data protection laws</li>
            </ul>
          </section>

          <section className={styles.lastUpdated}>
            <p><strong>Last Updated:</strong> November 17, 2025</p>
            <p><strong>Effective Date:</strong> November 17, 2025</p>
          </section>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.closeBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
