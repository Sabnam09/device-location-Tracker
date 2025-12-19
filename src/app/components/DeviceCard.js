"use client";

export default function DeviceCard({ data }) {
  if (!data) return null;

  // Get accuracy badge styling
  const getAccuracyBadge = (accuracy) => {
    const badges = {
      high: { 
        bg: 'bg-green-500/20', 
        border: 'border-green-500/50', 
        text: 'text-green-400', 
        label: 'HIGH (GPS)',
        icon: '📍'
      },
      medium: { 
        bg: 'bg-yellow-500/20', 
        border: 'border-yellow-500/50', 
        text: 'text-yellow-400', 
        label: 'MEDIUM (IP)',
        icon: '🌐'
      },
      low: { 
        bg: 'bg-red-500/20', 
        border: 'border-red-500/50', 
        text: 'text-red-400', 
        label: 'LOW',
        icon: '⚠️'
      }
    };
    return badges[accuracy] || badges.low;
  };

  const accuracyBadge = getAccuracyBadge(data.location?.accuracy);

  return (
    <div className="mt-8 w-full max-w-2xl bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
      
      {/* HEADER */}
      <h2 className="text-green-400 text-xl font-bold mb-6 flex items-center gap-2">
        ✅ Device Identified
      </h2>

      {/* 1. IDENTITY - Hardware ID */}
      <div className="bg-gradient-to-r from-blue-900/40 to-gray-900 border border-blue-500/30 p-4 rounded-lg mb-6">
        <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          Stable Hardware ID
        </p>
        <p className="text-white text-2xl md:text-3xl font-mono font-bold tracking-wide break-all">
          {data.identity?.stable_hardware_id || "N/A"}
        </p>
      </div>

      {/* 2. NETWORK */}
      <div className="mb-6">
        <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2 flex items-center gap-2">
          🌐 Network
        </h3>
        <InfoBox 
          label="IP Address" 
          value={data.network?.ip_address || "Detecting..."} 
          highlight 
        />
      </div>

      {/* 3. DEVICE SPECIFICATIONS */}
      <div className="mb-6">
        <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2 flex items-center gap-2">
          📱 Device Specifications
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoBox 
            label="Type" 
            value={data.device_specs?.type || "N/A"} 
          />
          <InfoBox 
            label="OS" 
            value={data.device_specs?.os || "N/A"} 
          />
          <InfoBox 
            label="Browser" 
            value={data.device_specs?.browser || "N/A"} 
          />
          <InfoBox 
            label="Model" 
            value={data.device_specs?.model || "Generic"} 
          />
        </div>
      </div>

      {/* 4. LOCATION DETAILS */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
          <h3 className="text-gray-300 text-sm font-bold flex items-center gap-2">
            📍 Location Details
          </h3>
          {/* Accuracy Badge */}
          <div className={`${accuracyBadge.bg} ${accuracyBadge.border} border px-3 py-1 rounded-full flex items-center gap-1`}>
            <span className="text-xs">{accuracyBadge.icon}</span>
            <span className={`${accuracyBadge.text} text-[10px] font-bold`}>
              {accuracyBadge.label}
            </span>
          </div>
        </div>

        {/* Location Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <InfoBox 
            label="City" 
            value={data.location?.city || "Unknown"} 
          />
          <InfoBox 
            label="State" 
            value={data.location?.state || "Unknown"} 
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <InfoBox 
            label="Country" 
            value={data.location?.country || "Unknown"} 
          />
          {data.location?.postal_code && (
            <InfoBox 
              label="Postal Code" 
              value={data.location.postal_code} 
            />
          )}
        </div>

        {/* Coordinates (if available) */}
        {data.location?.latitude && data.location?.longitude && (
          <div className="mb-3">
            <InfoBox 
              label="GPS Coordinates" 
              value={`${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}`}
              mono
            />
          </div>
        )}

        {/* Full Address */}
        <div className="w-full">
          <InfoBox 
            label="Full Address" 
            value={data.location?.full_address || "Address Not Available"} 
            fullWidth
          />
        </div>

        {/* Location Source Info */}
        {data.location?.source && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Detected via: <span className={`font-bold uppercase ${
                data.location.source === 'gps' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {data.location.source === 'gps' ? 'GPS Location' : 'IP Geolocation'}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* 5. REFERRAL INFO (if available) */}
      {(data.source_type || data.referral_code) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-lg">
          <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
            🔗 Referral Information
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox 
              label="Source Type" 
              value={data.source_type || 'N/A'}
              small
            />
            <InfoBox 
              label="Referral Code" 
              value={data.referral_code || 'N/A'}
              highlight
              mono
              small
            />
          </div>
        </div>
      )}

    </div>
  );
}

function InfoBox({ label, value, highlight, mono, fullWidth, small }) {
  return (
    <div className={`p-3 rounded border ${
      highlight 
        ? 'bg-green-900/10 border-green-800' 
        : 'bg-gray-800 border-gray-700'
    } h-full ${fullWidth ? 'col-span-2' : ''}`}>
      <p className={`text-gray-500 uppercase mb-1 ${
        small ? 'text-[9px]' : 'text-[10px]'
      }`}>
        {label}
      </p>
      <p className={`font-medium break-words ${
        small ? 'text-xs' : 'text-sm'
      } ${
        mono ? 'font-mono' : ''
      } ${
        highlight ? 'text-green-400' : 'text-gray-200'
      }`}>
        {value}
      </p>
    </div>
  );
}