import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ locations }) {
    // Auto-zoom disabled per user request
    return null;
}

const MapComponent = ({ locations }) => {
    const defaultCenter = [20, 0];
    const defaultZoom = 2;

    console.log('MapComponent rendering with locations:', locations);

    return (
        <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
            <ChangeView locations={locations} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {locations.map((loc, index) => (
                loc.ll && loc.ll[0] !== null && (
                    <Marker key={index} position={loc.ll}>
                        <Popup>
                            <strong>IP:</strong> {loc.ip}<br />
                            <strong>City:</strong> {loc.city}<br />
                            <strong>Country:</strong> {loc.country}<br />
                            <strong>Region:</strong> {loc.region}
                        </Popup>
                    </Marker>
                )
            ))}
        </MapContainer>
    );
};

export default MapComponent;
