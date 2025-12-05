"use client";

import { toast } from 'react-hot-toast';
import React from 'react';

/**
 * Shows a dark-themed alert modal to replace window.alert().
 * This function displays a modal matching the dark theme from your screenshot.
 * @param message The message to display in the alert.
 */
export const showDarkAlert = (message: string) => {
  // Use a unique ID to prevent multiple alerts from opening at the same time.
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'fade-in' : ''} modal-overlay`}>
        <div className="dark-alert-modal">
          <div className="dark-alert-header">
            localhost:3000 says
          </div>
          <div className="dark-alert-body">
            <i className="fa-solid fa-check"></i>
            <span>{message}</span>
          </div>
          <div className="dark-alert-footer">
            <button onClick={() => toast.dismiss(t.id)}>OK</button>
          </div>
        </div>
      </div>
    ),
    {
      id: 'dark-alert-modal', // This ID is important
      duration: Infinity,      // Keep the modal open until the user clicks OK
    }
  );
};
