"use client";

import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { isMobile, isTablet, browserName } from "react-device-detect"; // Removed osName/osVersion
import DeviceCard from "./components/DeviceCard";

// Helper: String to Hash
const generateHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// --- NEW HELPER: ACCURATE OS DETECTION ---
const detectOS = () => {
  if (typeof window === "undefined") return "Unknown OS";
  
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

  let os = "Unknown OS";

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'Mac OS';
  } else if (iosPlatforms.indexOf(platform) !== -1 || /iPhone|iPad|iPod/.test(userAgent)) {
    os = 'iOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'Windows';
    // Check specific Windows Version
    if (/Windows NT 10.0/.test(userAgent)) os = "Windows 10/11";
    if (/Windows NT 6.2/.test(userAgent)) os = "Windows 8";
    if (/Windows NT 6.1/.test(userAgent)) os = "Windows 7";
  } else if (/Android/.test(userAgent)) {
    os = 'Android';
  } else if (!os && /Linux/.test(platform)) {
    os = 'Linux';
  }

  return os;
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
      // --- STEP 1: STABLE ID GENERATION ---
      const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : "0x0";
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const cores = navigator.hardwareConcurrency || "N/A";
      const memory = navigator.deviceMemory || "N/A";
      const platform = navigator.platform; 

      const stableString = `${screenRes}|${timeZone}|${cores}|${memory}|${platform}`;
      const crossBrowserID = generateHash(stableString);

      // --- STEP 2: FINGERPRINT ---
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();

      // --- STEP 3: GPS LOCATION ---
      const getPosition = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
          } else {
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

        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const geoJson = await geoRes.json();
        
        locationInfo.city = geoJson.address.city || geoJson.address.town || geoJson.address.village || "Unknown City";
        locationInfo.state = geoJson.address.state || "";
        locationInfo.full_address = geoJson.display_name;

      } catch (err) {
        console.warn("Location fetch failed:", err);
      }

      // --- STEP 4: PREPARE FINAL DATA ---
      let deviceCategory = "Desktop/Laptop";
      if (isMobile) deviceCategory = "Mobile";
      if (isTablet) deviceCategory = "Tablet";

      // Yaha hum apna naya function use kar rahe hain
      const exactOS = detectOS(); 

      const finalPayload = {
        stable_device_id: crossBrowserID,
        browser_fingerprint_id: fpResult.visitorId,
        location: locationInfo,
        device: {
          type: deviceCategory,
          os: exactOS, // UPDATED: Using manual detection
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
          <b>Device ID</b> + <b>GPS Location</b> 
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