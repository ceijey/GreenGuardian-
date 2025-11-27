'use client';

import { useEffect } from 'react';
import styles from './SwapPolicyModal.module.css';

interface SwapPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function SwapPolicyModal({ isOpen, onClose, onAccept }: SwapPolicyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            <i className="fas fa-exchange-alt"></i>
            Swap Marketplace Policy
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close policy">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3>🌱 Welcome to the Swap Marketplace</h3>
            <p>
              Our swap marketplace promotes sustainability by helping community members trade 
              unwanted items instead of discarding them. Every swap reduces waste and supports 
              a circular economy.
            </p>
          </div>

          <div className={styles.section}>
            <h3>📋 Quick Guidelines</h3>
            <ul>
              <li>✅ Only trade items you legally own and can deliver</li>
              <li>✅ Provide honest descriptions and clear photos</li>
              <li>✅ Make fair and reasonable swap offers</li>
              <li>✅ Meet in public, safe locations</li>
              <li>✅ Communicate respectfully with other users</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>❌ Prohibited Items</h3>
            <ul>
              <li>Illegal items, weapons, or dangerous materials</li>
              <li>Prescription medications or controlled substances</li>
              <li>Counterfeit or stolen goods</li>
              <li>Live animals, perishable foods, or hazardous chemicals</li>
              <li>Adult content or inappropriate materials</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🤝 Making a Swap Request</h3>
            <ol>
              <li><strong>Review carefully:</strong> Read descriptions and examine photos</li>
              <li><strong>Prepare your offer:</strong> Describe what you're trading</li>
              <li><strong>Provide details:</strong> Include photos and estimated value</li>
              <li><strong>Submit request:</strong> Wait for the owner's response</li>
              <li><strong>Arrange meeting:</strong> Choose a safe, public location</li>
            </ol>
          </div>

          <div className={styles.section}>
            <h3>🛡️ Safety First</h3>
            <div className={styles.safetyTips}>
              <div className={styles.tip}>
                <i className="fas fa-map-marker-alt"></i>
                <span>Meet in well-lit, public places</span>
              </div>
              <div className={styles.tip}>
                <i className="fas fa-users"></i>
                <span>Consider bringing a friend</span>
              </div>
              <div className={styles.tip}>
                <i className="fas fa-sun"></i>
                <span>Prefer daytime meetings</span>
              </div>
              <div className={styles.tip}>
                <i className="fas fa-search"></i>
                <span>Inspect items before swapping</span>
              </div>
              <div className={styles.tip}>
                <i className="fas fa-hand-paper"></i>
                <span>Trust your instincts</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>⚖️ Your Responsibilities</h3>
            <p>
              By using the swap marketplace, you acknowledge that:
            </p>
            <ul>
              <li>You are responsible for the items you list</li>
              <li>You will verify items before accepting swaps</li>
              <li>You handle all swap logistics and arrangements</li>
              <li>Green Guardian is not liable for disputes or issues between users</li>
              <li>You assume all risks associated with swaps</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>📊 Item Condition Ratings</h3>
            <div className={styles.conditionGuide}>
              <div className={styles.condition}>
                <strong>New:</strong> Unused, in original packaging
              </div>
              <div className={styles.condition}>
                <strong>Like New:</strong> Barely used, no visible wear
              </div>
              <div className={styles.condition}>
                <strong>Good:</strong> Used with minor signs of wear
              </div>
              <div className={styles.condition}>
                <strong>Fair:</strong> Functional but shows wear, may have cosmetic damage
              </div>
              <div className={styles.condition}>
                <strong>Poor:</strong> Significant wear or damage but still usable
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>🚫 Consequences of Violations</h3>
            <ul>
              <li><strong>1st Offense:</strong> Warning and review</li>
              <li><strong>2nd Offense:</strong> Temporary suspension (7-30 days)</li>
              <li><strong>3rd Offense:</strong> Permanent ban</li>
            </ul>
            <p className={styles.warning}>
              <i className="fas fa-exclamation-triangle"></i>
              Severe violations (scams, harassment, illegal items) result in immediate permanent bans.
            </p>
          </div>

          <div className={styles.section}>
            <h3>🌍 Environmental Impact</h3>
            <p>
              Every swap you make contributes to:
            </p>
            <ul>
              <li>Reducing landfill waste and pollution</li>
              <li>Conserving resources and raw materials</li>
              <li>Lowering carbon footprint from manufacturing</li>
              <li>Building a sustainable circular economy</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>📞 Support & Reporting</h3>
            <p>
              If you encounter issues:
            </p>
            <ul>
              <li>Use the "Report" button on items or profiles</li>
              <li>Provide detailed information and evidence</li>
              <li>Allow 48-72 hours for review</li>
              <li>Email: support@greenguardian.com</li>
            </ul>
          </div>

          <div className={styles.footer}>
            <p>
              <i className="fas fa-file-alt"></i>
              <a href="/SWAP_POLICY.md" target="_blank" rel="noopener noreferrer">
                Read Full Policy Document
              </a>
            </p>
            <p className={styles.lastUpdated}>
              Last Updated: November 25, 2025 • Version 1.0
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          {onAccept ? (
            <>
              <button className={styles.acceptButton} onClick={handleAccept}>
                <i className="fas fa-check"></i>
                I Understand & Accept
              </button>
              <button className={styles.cancelButton} onClick={onClose}>
                Cancel
              </button>
            </>
          ) : (
            <button className={styles.closeButtonBottom} onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
