'use client'

import dynamic from 'next/dynamic';
import '../../app/App.css';
const SimpleMapComponent = dynamic(() => import('../../app/components/SimpleMapComponent'), { ssr: false });

export default function Home() {
  return (
    <div style={{ height: "100vh", width: "100%", padding: "0px", margin: "0px" }}>
      <SimpleMapComponent />
    </div>
  );
}

