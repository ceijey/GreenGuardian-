'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './LocationMapModal.module.css';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number };
  address: string;
  title?: string;
}

export default function LocationMapModal({
  isOpen,
  onClose,
  coordinates,
  address,
  title = 'Pickup Location'
}: LocationMapModalProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setMapLoaded(true);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <i className="fas fa-map-marked-alt"></i>
            {title}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.addressInfo}>
          <i className="fas fa-map-marker-alt"></i>
          <p>{address}</p>
        </div>

        <div className={styles.mapWrapper}>
          {mapLoaded ? (
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%', borderRadius: '8px' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[coordinates.lat, coordinates.lng]}>
                <Popup>
                  <div className={styles.popupContent}>
                    <strong>{title}</strong>
                    <p>{address}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className={styles.mapLoading}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading map...</p>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.directionsButton}
            onClick={() => {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`,
                '_blank'
              );
            }}
          >
            <i className="fas fa-route"></i>
            Get Directions
          </button>
          <button className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
