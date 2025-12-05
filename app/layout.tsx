import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Green Guardian",
  description: "Your Partner in Sustainable Living",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
        />
        <style>
          {`
            input, textarea {
              color: black !important;
            }
            ::placeholder {
              color: #6c757d !important;
              opacity: 1;
            }
            button, [role="button"] {
              color: black !important;
            }
            select, option {
              color: black !important;
            }
            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
            }
            .confirmation-toast {
              background: white;
              border: 1px solid #e0e0e0;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              padding: 24px;
              font-size: 16px;
              width: 90%;
              max-width: 400px;
              text-align: center;
              animation: fadeIn 0.2s ease-out;
            }
            .confirmation-toast p {
              margin-bottom: 20px;
              color: #363636;
              font-size: 18px;
            }
            .confirmation-buttons {
              display: flex;
              justify-content: center;
              gap: 12px;
            }
            .confirmation-buttons button {
              border: none;
              border-radius: 8px;
              padding: 10px 20px;
              cursor: pointer;
              font-weight: 600;
              transition: background-color 0.2s;
            }
            .confirmation-buttons button:first-child {
              background-color: #ffebee;
              color: #c62828 !important;
            }
            .confirmation-buttons button:first-child:hover {
              background-color: #ffcdd2;
            }
            .confirmation-buttons button:last-child {
              background-color: #f5f5f5;
              color: #363636 !important;
            }
            .confirmation-buttons button:last-child:hover {
              background-color: #eeeeee;
            }

            /* New Notification Modal Styles */
            .notification-modal {
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.2);
              padding: 20px;
              width: 90%;
              max-width: 380px;
              animation: fadeIn 0.2s ease-out;
              text-align: left;
            }
            .notification-modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 12px;
              border-bottom: 1px solid #eee;
              margin-bottom: 16px;
            }
            .notification-modal-header h3 {
              font-size: 20px;
              font-weight: 600;
              color: #000;
              margin: 0;
            }
            .notification-modal-header button {
              background: none;
              border: none;
              font-size: 28px;
              line-height: 1;
              cursor: pointer;
              color: #888 !important;
              padding: 0;
            }
            .notification-modal-body p {
              color: #888;
              margin: 0;
              margin-bottom: 24px;
              font-size: 16px;
            }
            .notification-modal-footer {
              text-align: right;
            }
            .notification-modal-footer button {
              background-color: #0d6efd;
              color: white !important;
              border: none;
              border-radius: 6px;
              padding: 10px 28px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .notification-modal-footer button:hover {
              background-color: #0b5ed7;
            }

            /* Dark Alert Modal Styles */
            .dark-alert-modal {
              background-color: #2d2d2d;
              color: #f0f0f0;
              border-radius: 6px;
              padding: 16px;
              width: 90%;
              max-width: 450px;
              box-shadow: 0 5px 20px rgba(0,0,0,0.4);
              animation: fadeIn 0.2s ease-out;
            }
            .dark-alert-header {
              font-weight: 500;
              margin-bottom: 16px;
              font-size: 15px;
            }
            .dark-alert-body {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 20px;
              font-size: 15px;
            }
            .dark-alert-body i {
              color: #f0f0f0;
            }
            .dark-alert-footer {
              text-align: right;
            }
            .dark-alert-footer button {
              background-color: #0d6efd;
              color: white !important;
              border: none;
              border-radius: 4px;
              padding: 6px 24px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .dark-alert-footer button:hover {
              background-color: #0b5ed7;
            }
          `}
        </style>
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        {/* Skip link for keyboard users */}
        <a href="#main-content" className="skip-link">Skip to main content</a>

        <AuthProvider>
          <Toaster 
            position="top-center" 
            reverseOrder={false}
            toastOptions={{
              // Define default options
              duration: 5000,
              style: {
                background: '#fff',
                color: '#363636',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '16px',
                fontSize: '16px',
              },

              // Define specific options for different types
              success: {
                style: {
                  background: '#e8f5e8',
                  color: '#2e7d32',
                  borderColor: '#4caf50',
                },
                iconTheme: {
                  primary: '#4caf50',
                  secondary: 'white',
                },
              },
              error: {
                style: {
                  background: '#ffebee',
                  color: '#c62828',
                  borderColor: '#f44336',
                },
                iconTheme: {
                  primary: '#f44336',
                  secondary: 'white',
                },
              },
            }}
          />
          <main id="main-content" className="main-content" tabIndex={-1} aria-label="Main content">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
