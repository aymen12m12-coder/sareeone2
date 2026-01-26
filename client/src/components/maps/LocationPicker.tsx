import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Check, X, Loader2, Navigation as NavigationIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onCancel?: () => void;
  initialLocation?: [number, number];
}

// Component to handle map clicks
function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: [number, number] | null; 
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationPicker({
  onLocationSelect,
  onCancel,
  initialLocation,
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Default center (Sanaa, Yemen)
  const defaultCenter: [number, number] = [15.3694, 44.1910];
  const mapCenter = position || initialLocation || defaultCenter;

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ar`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setAddress(data.display_name);
      } else if (data.address) {
        // Build address from components
        const parts = [
          data.address.road,
          data.address.neighbourhood,
          data.address.suburb,
          data.address.city || data.address.town,
          data.address.country,
        ].filter(Boolean);
        setAddress(parts.join(', '));
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  };

  // Update address when position changes
  useEffect(() => {
    if (position) {
      getAddressFromCoordinates(position[0], position[1]);
    }
  }, [position]);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم خدمة تحديد الموقع');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPosition([lat, lng]);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('فشل في الحصول على موقعك الحالي');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleConfirm = () => {
    if (position && address) {
      onLocationSelect(position[0], position[1], address);
    } else {
      alert('الرجاء اختيار موقع على الخريطة');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">اختر موقع التوصيل</h2>
                <p className="text-sm text-blue-100">انقر على الخريطة لتحديد الموقع</p>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="h-96 relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>

          {/* Get current location button */}
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="absolute bottom-4 left-4 z-[1000] bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="تحديد موقعي الحالي"
          >
            {gettingLocation ? (
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            ) : (
              <NavigationIcon className="h-6 w-6 text-blue-600" />
            )}
          </button>
        </div>

        {/* Address display */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العنوان المحدد:
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري تحديد العنوان...</span>
              </div>
            ) : position ? (
              <div className="space-y-2">
                <p className="text-gray-900 font-medium">{address || 'جاري التحميل...'}</p>
                <p className="text-sm text-gray-500">
                  الإحداثيات: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">لم يتم اختيار موقع بعد</p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>نصيحة:</strong> انقر على الخريطة لتحديد موقع التوصيل، أو استخدم زر الموقع الحالي لتحديد موقعك تلقائياً
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t bg-gray-50 p-6 flex gap-3 justify-end">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center gap-2"
            >
              <X className="h-5 w-5" />
              إلغاء
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!position || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Check className="h-5 w-5" />
            تأكيد الموقع
          </button>
        </div>
      </div>
    </div>
  );
}
