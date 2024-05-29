'use client'

import dynamic from 'next/dynamic';
import './App.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapComponent = dynamic(() => import('./components/MapComponent'), { ssr: false });

export default function Home() {
  return (
    <div>
      <MapComponent />
    </div>
  );
}

