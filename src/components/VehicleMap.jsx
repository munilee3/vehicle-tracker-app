import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Controls from "./Controls";

const INITIAL_CENTER = [17.385044, 78.486671];

function calculateAngle(p1, p2) {
  if (!p1 || !p2) return 0;
  const dy = p2.lat - p1.lat;
  const dx = p2.lng - p1.lng;
  const theta = Math.atan2(dy, dx);
  const angle = (theta * 180) / Math.PI;
  return angle + 90;
}

const createVehicleIcon = (angle) =>
  L.divIcon({
    html: `
      <div 
        class="w-10 h-10 origin-center transition-transform duration-500 ease-linear text-2xl text-red-600"
        style="transform: rotate(${angle}deg);"
      >
        🚗
      </div>
    `,
    className: "",
    iconSize: [40, 40],
  });

const AutoPan = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position);
  }, [position, map]);
  return null;
};

function VehicleMap() {
  const [routeData, setRouteData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [angle, setAngle] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/dummy-route.json");
        const data = await response.json();
        const formatted = data.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          timestamp: p.timestamp,
        }));
        setRouteData(formatted);
      } catch (err) {
        console.error("Error loading route data:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isPlaying && routeData.length > 1 && currentIndex < routeData.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;

          if (nextIndex >= routeData.length - 1) {
            clearInterval(intervalRef.current);
            setIsPlaying(false);
            return routeData.length - 1;
          }

          const start = routeData[prevIndex];
          const end = routeData[nextIndex];
          const bearing = calculateAngle(start, end);
          setAngle(bearing);
          return nextIndex;
        });
      }, 1000);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, routeData, currentIndex]);

  const currentPosition = routeData[currentIndex] || routeData[0] || {
    lat: INITIAL_CENTER[0],
    lng: INITIAL_CENTER[1],
  };

  const togglePlay = () => {
    if (currentIndex >= routeData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setAngle(0);
  };

  return (
    <div className="h-screen w-full relative">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoPan position={currentPosition} />

        {routeData.length > 0 && (
          <>
            <Polyline
              pathOptions={{ color: "gray", weight: 3, opacity: 0.5 }}
              positions={routeData.map((p) => [p.lat, p.lng])}
            />

            <Polyline
              pathOptions={{ color: "red", weight: 5, opacity: 0.8 }}
              positions={routeData
                .slice(0, currentIndex + 1)
                .map((p) => [p.lat, p.lng])}
            />

            <Marker
              position={[currentPosition.lat, currentPosition.lng]}
              icon={createVehicleIcon(angle)}
            />
          </>
        )}
      </MapContainer>

      <Controls
        currentPosition={currentPosition}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        resetSimulation={resetSimulation}
        currentIndex={currentIndex}
        routeData={routeData}
      />
    </div>
  );
}

export default VehicleMap;
