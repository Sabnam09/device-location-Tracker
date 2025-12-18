"use client";

export default function DeviceCard({ data }) {
  if (!data) return null;

  return (
    <div className="mt-8 w-full max-w-2xl bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
      
      {/* HEADER */}
      <h2 className="text-green-400 text-xl font-bold mb-6 flex items-center gap-2">
        ✅ Device Identified
      </h2>

      {/* --- 1. IDENTITY --- */}
      <div className="bg-gradient-to-r from-blue-900/40 to-gray-900 border border-blue-500/30 p-4 rounded-lg mb-6">
        <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
          Stable Hardware ID
        </p>
        <p className="text-white text-3xl font-mono font-bold tracking-wide break-all">
          {data.identity?.stable_hardware_id || "N/A"}
        </p>
      </div>

      {/* --- 2. NETWORK --- */}
      <div className="mb-6">
         <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2">🌐 Network</h3>
         {/* 👇 Yahan ?. lagaya hai taki crash na ho */}
         <InfoBox label="IP Address" value={data.network?.ip_address || "Detecting..."} highlight />
      </div>

      {/* --- 3. DEVICE SPECS --- */}
      <div className="mb-6">
        <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2">📱 Device Specifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoBox label="Type" value={data.device_specs?.type || "N/A"} />
            <InfoBox label="OS" value={data.device_specs?.os || "N/A"} />
            <InfoBox label="Browser" value={data.device_specs?.browser || "N/A"} />
            <InfoBox label="Model" value={data.device_specs?.model || "Generic"} />
        </div>
      </div>

      {/* --- 4. LOCATION DETAILS --- */}
      <div>
        <h3 className="text-gray-300 text-sm font-bold mb-3 border-b border-gray-700 pb-2">📍 Location Details</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
           <InfoBox label="City" value={data.location?.city || "Unknown"} />
           <InfoBox label="State" value={data.location?.state || "-"} />
        </div>
        <div className="w-full">
            <InfoBox label="Full Address" value={data.location?.full_address || "Address Not Available"} />
        </div>
      </div>

    </div>
  );
}

function InfoBox({ label, value, highlight }) {
  return (
    <div className={`p-3 rounded border ${highlight ? 'bg-green-900/10 border-green-800' : 'bg-gray-800 border-gray-700'} h-full`}>
      <p className="text-gray-500 text-[10px] uppercase mb-1">{label}</p>
      <p className={`font-medium text-sm break-words ${highlight ? 'text-green-400' : 'text-gray-200'}`}>
        {value}
      </p>
    </div>
  );
}