"use client";

export default function DeviceCard({ data }) {
  if (!data) return null;

  return (
    <div className="mt-8 w-full max-w-2xl bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
      <h2 className="text-green-400 text-xl font-bold mb-6 flex items-center gap-2">
        ✅ Device Identified Successfully
      </h2>

      {/* PRIMARY ID SECTION */}
      <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mb-6">
        <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
          Device ID 
        </p>
        <p className="text-white text-3xl font-mono font-bold tracking-wide break-all">
          {data.stable_device_id}
        </p>
      </div>

      {/* LOCATION SECTION */}
      <div className="mb-6">
        <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2">📍 Precise Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoBox label="City & State" value={`${data.location.city}, ${data.location.state}`} highlight />
            <InfoBox label="Coordinates" value={`${data.location.lat}, ${data.location.lon}`} />
            <div className="col-span-1 md:col-span-2">
                <InfoBox label="Full Address" value={data.location.full_address} />
            </div>
        </div>
      </div>

      {/* HARDWARE SECTION */}
      <div>
        <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2">📱 Hardware Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoBox label="Device Type" value={data.device.type} />
          <InfoBox label="OS" value={data.device.os} />
          <InfoBox label="Browser" value={data.device.browser} />
          <InfoBox label="Screen" value={data.device.screen} />
        </div>
      </div>

      {/* Raw JSON Toggle */}
      {/* <details className="mt-6 cursor-pointer group">
        <summary className="text-gray-600 text-xs hover:text-gray-400 transition-colors">
          ▶ View Backend Payload
        </summary>
        <pre className="mt-2 p-4 bg-black rounded border border-gray-800 text-[10px] text-green-500 overflow-auto max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details> */}
    </div>
  );
}

function InfoBox({ label, value, highlight }) {
  return (
    <div className={`p-3 rounded border ${highlight ? 'bg-green-900/10 border-green-800' : 'bg-gray-800 border-gray-700'}`}>
      <p className="text-gray-500 text-[10px] uppercase mb-1">{label}</p>
      <p className={`font-medium text-sm ${highlight ? 'text-green-400' : 'text-gray-200'}`}>
        {value || "Unknown"}
      </p>
    </div>
  );
}