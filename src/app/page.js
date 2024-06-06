'use client'

import dynamic from 'next/dynamic';
import './App.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const MapComponent = dynamic(() => import('./components/MapComponent'), { ssr: false });

export default function Home() {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapComponent />
    </div>
  );
}

