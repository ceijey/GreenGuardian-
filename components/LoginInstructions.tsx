'use client';

import styles from './LoginInstructions.module.css';

export default function LoginInstructions() {
  return (
    <div className={styles.instructionsBox}>
      <div className={styles.header}>
        <i className="fas fa-info-circle" aria-hidden="true"></i>
        <h3>Login Instructions:</h3>
      </div>
      <div className={styles.content}>
        <p className={styles.instruction}>
          If you use your <span className={styles.highlight}>@gordoncollege.edu.ph</span> email, you will be redirected to the <strong>Gov Portal</strong>.
        </p>
        <p className={styles.instruction}>
          If you use a regular <span className={styles.highlightAlt}>@gmail.com</span> email, you will be redirected to the <strong>Dashboard</strong> for usual users.
        </p>
      </div>
    </div>
  );
}
