import { useEffect } from 'react'
import { divIcon, type Map as LeafletMap } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Coordinates, Pharmacy } from './data'
import { useI18n } from './i18n'

type PharmacyMapProps = {
  center: Coordinates
  pharmacies: Pharmacy[]
  selectedPharmacyId: string | null
  onSelectPharmacy: (id: string) => void
  centerLabel: string
}

const userIcon = divIcon({
  className: 'map-marker-shell user-marker-shell',
  html: '<span class="user-location-marker" aria-hidden="true"><span class="user-location-pulse"></span><span class="user-location-core"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 3.25 19.4 19l-7.4-3.1L4.6 19 12 3.25Z"/></svg></span></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -20],
})

function createPharmacyIcon(index: number, isSelected: boolean) {
  const number = String(index + 1).padStart(2, '0')

  return divIcon({
    className: `map-marker-shell pharmacy-marker-shell${isSelected ? ' is-selected' : ''}`,
    html: `<span class="pharmacy-map-marker" aria-hidden="true"><span class="pharmacy-marker-cross">+</span><span class="pharmacy-marker-number">${number}</span></span>`,
    iconSize: [42, 50],
    iconAnchor: [21, 46],
    popupAnchor: [0, -44],
  })
}

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
  const { t } = useI18n()
  const selected = pharmacies.find((pharmacy) => pharmacy.id === selectedPharmacyId)

  return (
    <div className="pharmacy-map" aria-label={t('interactiveMap')}>
      <div className="pharmacy-map-status" aria-hidden="true">
        <span><i /> {t('nearbyNetwork')}</span>
        <b>{t('locations', { count: String(pharmacies.length).padStart(2, '0') })}</b>
      </div>
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={14}
        scrollWheelZoom={false}
        ref={(map: LeafletMap | null) => {
          map?.invalidateSize()
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[center.lat, center.lon]} icon={userIcon}>
          <Popup>{centerLabel}</Popup>
        </Marker>
        {pharmacies.map((pharmacy, index) => (
          <Marker
            key={pharmacy.id}
            position={[pharmacy.lat, pharmacy.lon]}
            icon={createPharmacyIcon(index, pharmacy.id === selectedPharmacyId)}
            title={pharmacy.name}
            zIndexOffset={pharmacy.id === selectedPharmacyId ? 1000 : 0}
            eventHandlers={{ click: () => onSelectPharmacy(pharmacy.id) }}
          >
            <Popup>
              <strong>{pharmacy.name}</strong><br />
              {pharmacy.distance < 1
                ? t('awayMeters', { distance: Math.round(pharmacy.distance * 1000) })
                : t('awayKm', { distance: pharmacy.distance.toFixed(1) })}
              {pharmacy.address && <><br /><span>{pharmacy.address}</span></>}
            </Popup>
          </Marker>
        ))}
        <MapFocus center={center} pharmacy={selected} />
      </MapContainer>
    </div>
  )
}
