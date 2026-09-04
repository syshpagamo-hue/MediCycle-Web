import { useEffect } from 'react'
import { divIcon, type Map as LeafletMap } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Coordinates, Pharmacy } from './data'

type PharmacyMapProps = {
  center: Coordinates
  pharmacies: Pharmacy[]
  selectedPharmacyId: string | null
  onSelectPharmacy: (id: string) => void
  centerLabel: string
}

const userIcon = divIcon({
  className: 'map-marker-shell',
  html: '<span class="map-marker user-marker" aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const pharmacyIcon = divIcon({
  className: 'map-marker-shell',
  html: '<span class="map-marker pharmacy-marker" aria-hidden="true">+</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
})

function MapFocus({
  center,
  pharmacy,
}: {
  center: Coordinates
  pharmacy?: Pharmacy
}) {
  const map = useMap()

  useEffect(() => {
    if (pharmacy) {
      map.flyTo([pharmacy.lat, pharmacy.lon], Math.max(map.getZoom(), 16), {
        duration: 0.7,
      })
      window.setTimeout(() => {
        map.eachLayer((layer) => {
          const marker = layer as { getLatLng?: () => { lat: number; lng: number }; openPopup?: () => void }
          const point = marker.getLatLng?.()
          if (
            point &&
            Math.abs(point.lat - pharmacy.lat) < 0.000001 &&
            Math.abs(point.lng - pharmacy.lon) < 0.000001
          ) {
            marker.openPopup?.()
          }
        })
      }, 750)
    } else {
      map.setView([center.lat, center.lon], 14)
    }
  }, [center, map, pharmacy])

  return null
}

export function PharmacyMap({
  center,
  pharmacies,
  selectedPharmacyId,
  onSelectPharmacy,
  centerLabel,
}: PharmacyMapProps) {
  const selected = pharmacies.find((pharmacy) => pharmacy.id === selectedPharmacyId)

  return (
    <div className="pharmacy-map" aria-label="Interactive map of nearby pharmacies">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={14}
        scrollWheelZoom={false}
        ref={(map: LeafletMap | null) => {
          map?.invalidateSize()
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[center.lat, center.lon]} icon={userIcon}>
          <Popup>{centerLabel}</Popup>
        </Marker>
        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            position={[pharmacy.lat, pharmacy.lon]}
            icon={pharmacyIcon}
            eventHandlers={{ click: () => onSelectPharmacy(pharmacy.id) }}
          >
            <Popup>
              <strong>{pharmacy.name}</strong><br />
              {pharmacy.distance < 1
                ? `${Math.round(pharmacy.distance * 1000)} m away`
                : `${pharmacy.distance.toFixed(1)} km away`}
              <br />
              <span>{pharmacy.address}</span>
            </Popup>
          </Marker>
        ))}
        <MapFocus center={center} pharmacy={selected} />
      </MapContainer>
    </div>
  )
}
