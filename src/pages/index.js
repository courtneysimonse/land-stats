'use client'

import '../app/App.css';
import MapComponent from '@/app/components/MapComponent/MapComponent';

export default function Home() {
  return (
    <div style={{ height: "100vh", width: "100%", padding: "0px", margin: "0px"}}>
        <MapComponent />
    </div>
  );
}

