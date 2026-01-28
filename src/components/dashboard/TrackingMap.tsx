'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Paper, Typography } from '@mui/material';
import { MapPin, Navigation, Ship, Anchor } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';

// Dynamic import for Leaflet components
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
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// --- Geodesic Math Helpers ---

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Calculate intermediate point on a Great Circle path
function getIntermediatePoint(
  lat1: number, lon1: number, 
  lat2: number, lon2: number, 
  f: number
): [number, number] {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const d = 2 * Math.asin(Math.min(1, Math.sqrt(Math.pow(Math.sin((φ1 - φ2) / 2), 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ1 - λ2) / 2), 2))));
  
  if (Math.abs(d) < 1e-9) return [toDeg(φ1), toDeg(λ1)]; // Points are too close

  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  
  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);
  
  const lat = toDeg(φi);
  const lon = toDeg(λi);

  if (isNaN(lat) || isNaN(lon)) return [toDeg(φ1), toDeg(λ1)]; // Fallback

  return [lat, lon];
}

// Generate an array of points for a curved path
function getCurvedPath(start: [number, number], end: [number, number], numPoints = 100): [number, number][] {
  // Return straight line if points are identical or invalid
  if (!start || !end || (start[0] === end[0] && start[1] === end[1])) return [];
  
  const points: [number, number][] = [];
  try {
    for (let i = 0; i <= numPoints; i++) {
        points.push(getIntermediatePoint(start[0], start[1], end[0], end[1], i / numPoints));
    }
  } catch (e) {
    console.error("Error generating curved path", e);
    return [start, end];
  }
  return points;
}

// Known port coordinates

const PORT_COORDINATES: Record<string, [number, number]> = {

  // North America - East

  'New York': [40.6848, -74.0088],

  'Newark': [40.6895, -74.1745],

  'Savannah': [32.0809, -81.0912],

  'Charleston': [32.7765, -79.9311],

  'Norfolk': [36.8508, -76.2859],

  'Baltimore': [39.2904, -76.6122],

  'Miami': [25.7617, -80.1918],

  'Jacksonville': [30.3322, -81.6557],

  

  // North America - West

  'Los Angeles': [33.7288, -118.2620],

  'Long Beach': [33.7701, -118.1937],

  'Oakland': [37.8044, -122.2712],

  'Seattle': [47.6062, -122.3321],

  'Tacoma': [47.2529, -122.4443],

  'Vancouver': [49.2827, -123.1207],

  'Prince Rupert': [54.3150, -130.3208],



  // North America - Gulf

  'Houston': [29.7604, -95.3698],

  'New Orleans': [29.9511, -90.0715],

  'Mobile': [30.6954, -88.0399],



  // Asia

  'Singapore': [1.2644, 103.8298],

  'Shanghai': [31.2304, 121.4737],

  'Ningbo': [29.8683, 121.5440],

  'Shenzhen': [22.5431, 114.0579],

  'Busan': [35.1796, 129.0756],

  'Qingdao': [36.0671, 120.3826],

  'Hong Kong': [22.3193, 114.1694],

  'Tokyo': [35.6762, 139.6503],

  'Yokohama': [35.4437, 139.6380],

  'Kaohsiung': [22.6273, 120.3014],

  'Port Kelang': [22.5167, 101.3833], // Approx

  

  // Middle East & South Asia

  'Jebel Ali': [24.9958, 55.0667],

  'Dubai': [25.2048, 55.2708],

  'Abu Dhabi': [25.276987, 55.296249],

  'Salalah': [16.9455, 54.0063],

  'Jeddah': [21.4858, 39.1925],

  'Port Qasim': [24.7827, 67.3436],

  'Karachi': [24.8415, 66.9748],

  'Mumbai': [24.9600, 67.0600], // Approx

  'Nhava Sheva': [18.9500, 72.9500],



  // Europe

  'Rotterdam': [51.9566, 4.1257],

  'Antwerp': [51.9502, 4.2570],

  'Hamburg': [53.5356, 9.9678],

  'Bremerhaven': [53.5488, 8.5833],

  'Felixstowe': [51.9614, 1.3513],

  'Southampton': [50.9097, 1.4044],

  'Le Havre': [49.4944, 0.1079],

  'Valencia': [39.4699, -0.3763],

  'Barcelona': [39.4699, -0.3763], // Fix coords

  'Algeciras': [36.1408, -5.4562],

  

  // Africa

  'Mombasa': [-4.0435, 39.6682],

  'Dar es Salaam': [-6.8235, 39.2695],

  'Durban': [-29.8587, 31.0218],

  'Cape Town': [-33.9249, 18.4241],

  'Tanger Med': [35.8866, -5.5133],

};



interface TrackingMapProps {

  origin?: string | null;

  destination?: string | null;

  currentLocation?: string | null;

  currentCoordinates?: { lat: number; lng: number } | null;

  className?: string;

}



export function TrackingMap({ origin, destination, currentLocation, currentCoordinates, className }: TrackingMapProps) {

  const [coords, setCoords] = useState<{

    origin: [number, number] | null;

    destination: [number, number] | null;

    current: [number, number] | null;

  }>({ origin: null, destination: null, current: null });

  const [loading, setLoading] = useState(true);



  // Helper to get coordinates

  const getCoordinates = async (location: string): Promise<[number, number] | null> => {

    if (!location) return null;

    const cleanLoc = location.trim();

    

    // 1. Check known list

    const knownKey = Object.keys(PORT_COORDINATES).find(key => 

      cleanLoc.toLowerCase().includes(key.toLowerCase())

    );

    if (knownKey) return PORT_COORDINATES[knownKey];



    // 2. Fallback to OSM

    try {

      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanLoc)}&limit=1`);

      if (!res.ok) throw new Error(`OSM API Error: ${res.status}`);

      

      const data = await res.json();

      if (data && data.length > 0) {

        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];

      }

    } catch (e) {

      console.warn(`Failed to geocode ${location}:`, e);

    }

    return null;

  };



  useEffect(() => {

    let isMounted = true;



    const loadCoords = async () => {

      setLoading(true);

      // Initialize fresh to avoid stale state issues

      const newCoords: typeof coords = { origin: null, destination: null, current: null };



      if (origin) newCoords.origin = await getCoordinates(origin);

      if (destination) newCoords.destination = await getCoordinates(destination);

      

      // Prioritize explicit currentCoordinates

      if (currentCoordinates && !isNaN(currentCoordinates.lat) && !isNaN(currentCoordinates.lng)) {

        newCoords.current = [currentCoordinates.lat, currentCoordinates.lng];

      } else if (currentLocation) {

         if (currentLocation === origin && newCoords.origin) newCoords.current = newCoords.origin;

         else if (currentLocation === destination && newCoords.destination) newCoords.current = newCoords.destination;

         else newCoords.current = await getCoordinates(currentLocation);

      }



      if (isMounted) {

        setCoords(newCoords);

        setLoading(false);

      }

    };



    if (origin || destination || currentCoordinates) {

      loadCoords();

    } else {

      setLoading(false);

    }

    

    return () => { isMounted = false; };

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [origin, destination, currentLocation, currentCoordinates]);

  // Create custom icons
  const createIcon = (icon: React.ReactNode, color: string, size: number = 24) => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');
    
    const svgString = renderToStaticMarkup(
      <div style={{ 
        color: color, 
        background: 'white', 
        borderRadius: '50%', 
        padding: '4px', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 8,
        height: size + 8
      }}>
        {icon}
      </div>
    );

    return L.divIcon({
      html: svgString,
      className: 'custom-map-icon',
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, size + 8 + 5], // Bottom center anchor
      popupAnchor: [0, -(size + 8 + 5)]
    });
  };

  const originIcon = useMemo(() => createIcon(<Anchor size={18} />, '#64748b'), [createIcon]);
  const destinationIcon = useMemo(() => createIcon(<MapPin size={18} />, '#ef4444'), [createIcon]);
  const shipIcon = useMemo(() => createIcon(<Ship size={20} />, '#c99b2f', 28), [createIcon]);

  if (loading) {

    return (

      <Paper variant="outlined" sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>

        <Typography color="textSecondary">Loading Map...</Typography>

      </Paper>

    );

  }



  if (!coords.origin && !coords.destination && !coords.current) {

    return (

      <Paper variant="outlined" sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>

        <Box sx={{ textAlign: 'center', p: 2 }}>

            <Navigation className="w-10 h-10 text-gray-300 mx-auto mb-2" />

            <Typography color="textSecondary" sx={{ fontWeight: 500 }}>Location data not available</Typography>

            <Box sx={{ mt: 2, p: 1, bgcolor: '#f1f5f9', borderRadius: 1, fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace', textAlign: 'left' }}>

               <div style={{ marginBottom: 4 }}><strong>Debug Info:</strong></div>

               <div>Origin: {origin || 'N/A'} {coords.origin ? '✅' : '❌'}</div>

               <div>Dest: {destination || 'N/A'} {coords.destination ? '✅' : '❌'}</div>

               <div>Curr Loc: {currentLocation || 'N/A'}</div>

               <div>Curr Coords: {currentCoordinates ? `${currentCoordinates.lat.toFixed(2)}, ${currentCoordinates.lng.toFixed(2)}` : 'N/A'} {coords.current ? '✅' : '❌'}</div>

            </Box>

        </Box>

      </Paper>

    );

  }

  const center: [number, number] = coords.current || coords.origin || coords.destination || [20, 0];

  // Calculate Geodesic (Curved) Paths
  const pathPositions: [number, number][] = [];
  
  if (coords.origin && coords.current) {
      pathPositions.push(...getCurvedPath(coords.origin, coords.current));
  }
  
  if (coords.current && coords.destination) {
      pathPositions.push(...getCurvedPath(coords.current, coords.destination));
  } else if (coords.origin && coords.destination && !coords.current) {
      pathPositions.push(...getCurvedPath(coords.origin, coords.destination));
  }

  return (
    <Box sx={{ height: 400, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }} className={className}>
      <MapContainer center={center} zoom={3} style={{ height: '100%', width: '100%' }}>
        {/* CartoDB Voyager Tiles - Cleaner, professional look */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {coords.origin && (
          <Marker position={coords.origin} icon={originIcon}>
            <Popup>Origin: {origin}</Popup>
          </Marker>
        )}

        {coords.destination && (
          <Marker position={coords.destination} icon={destinationIcon}>
            <Popup>Destination: {destination}</Popup>
          </Marker>
        )}

        {coords.current && (
          <Marker position={coords.current} icon={shipIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">Current Location</p>
                <p className="text-sm">{currentLocation}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {pathPositions.length > 1 && (
          <Polyline 
            positions={pathPositions} 
            color="var(--accent-gold)" 
            weight={3} 
            dashArray="10, 10" 
            opacity={0.8}
          />
        )}
      </MapContainer>
    </Box>
  );
}
