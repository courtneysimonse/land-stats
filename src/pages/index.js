'use client'

import dynamic from 'next/dynamic';
import '../app/App.css';
const MapComponent = dynamic(() => import('../app/components/MapComponent'), { ssr: false });

export default function Home() {
  return (
    <div style={{ height: "100%", width: "100vw" }}>
      <MapComponent />
    </div>
  );
}

