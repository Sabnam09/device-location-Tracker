"use client";

import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { isMobile, isTablet, osName, osVersion, browserName } from "react-device-detect";
import DeviceCard from "./components/DeviceCard";

// Helper: String ko Unique Hash ID me badalne ke liye
const generateHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setLoading(true);
    setError("");
    setDeviceData(null);

    try {
      // --- STEP 1: STABLE ID GENERATION (Chrome/Edge Same ID) ---
      // Hum sirf wo hardware data lenge jo browser change hone par nahi badalta
      const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : "0x0";
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const cores = navigator.hardwareConcurrency || "N/A";
      const memory = navigator.deviceMemory || "N/A";
      const platform = navigator.platform; 

      // Ye string hamesha same rahegi chahe browser koi bhi ho
      const stableString = `${screenRes}|${timeZone}|${cores}|${memory}|${platform}`;
      const crossBrowserID = generateHash(stableString);

      // --- STEP 2: STANDARD FINGERPRINT (Backup) ---
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();

      // --- STEP 3: EXACT GPS LOCATION (Shahdol wala code wapas aa gaya) ---
      const getPosition = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
          } else {
            // High Accuracy Mode On
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          }
        });
      };

      let locationInfo = {
        lat: null,
        lon: null,
        city: "Permission Denied / Unavailable",
        state: "",
        full_address: ""
      };

      try {
        const position = await getPosition();
        const { latitude, longitude } = position.coords;
        
        locationInfo.lat = latitude;
        locationInfo.lon = longitude;

        // Coordinates ko City Name me convert karna
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const geoJson = await geoRes.json();
        
        locationInfo.city = geoJson.address.city || geoJson.address.town || geoJson.address.village || "Unknown City";
        locationInfo.state = geoJson.address.state || "";
        locationInfo.full_address = geoJson.display_name;

      } catch (err) {
        console.warn("Location fetch failed:", err);
        // Agar user ne Allow nahi kiya, tab bhi ID generate hogi, bas location blank hogi
      }

      // --- STEP 4: PREPARE FINAL DATA ---
      let deviceCategory = "Desktop/Laptop";
      if (isMobile) deviceCategory = "Mobile";
      if (isTablet) deviceCategory = "Tablet";

      const finalPayload = {
        // IDs
        stable_device_id: crossBrowserID,      // USE THIS FOR REFERRAL (Unique Hardware ID)
        browser_fingerprint_id: fpResult.visitorId, // Changes with browser
        
        // Location
        location: locationInfo,

        // Hardware details
        device: {
          type: deviceCategory,
          os: `${osName} ${osVersion}`,
          browser: browserName,
          screen: screenRes,
          cores: cores,
          ram: `${memory} GB`
        }
      };

      setDeviceData(finalPayload);

    } catch (err) {
      console.error(err);
      setError("Error: Please allow location permission to get correct data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white">
      <div className="text-center max-w-lg mb-8">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">Super Device Scanner</h1>
        <p className="text-gray-400 text-sm">
          Extracts <b>Stable Hardware ID</b> (for Referral) + <b>Exact GPS Location</b> (Shahdol).
        </p>
      </div>

      <button
        onClick={handleScan}
        disabled={loading}
        className={`
          px-8 py-4 rounded-full font-bold text-lg shadow-lg transition-all 
          ${loading ? "bg-gray-700" : "bg-green-600 hover:bg-green-500 shadow-green-500/30"}
        `}
      >
        {loading ? "Scanning Hardware & GPS..." : "📍 Scan Device & Location"}
      </button>

      {error && <p className="mt-4 text-red-400 bg-red-900/20 px-4 py-2 rounded">{error}</p>}

      <DeviceCard data={deviceData} />
    </main>
  );
}