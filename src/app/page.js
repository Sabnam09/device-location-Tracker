"use client";

import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { UAParser } from "ua-parser-js"; 
import DeviceCard from "./components/DeviceCard"; 
// 👇 Server Action Import
import { saveDeviceDataSecurely } from "./actions";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState(""); 

  // --- REDIRECTION LOGIC (Debugging Mode: Paused) ---
  const performRedirection = (deviceType, osName) => {
    setStatusMsg(`Detected ${deviceType}. Processing...`);
    // 🛑 DEBUGGING: Navigation roka hai taaki aap Console check kar sakein
    // console.log("🛑 DEBUG MODE: Navigation Paused. Check Console for API Data.");
    // alert(`System Detected: ${deviceType}\n\nNavigation is PAUSED for testing.`);

     // ORIGINAL REDIRECT CODE (Uncomment when ready)
    
    // 1. DESKTOP / LAPTOP / TABLET
    if (deviceType !== "Mobile") {
       setTimeout(() => {
         window.location.href = "https://sajpeweb.raavan.site/";
       }, 1500); 
       return;
    }

    // 2. MOBILE
    if (deviceType === "Mobile") {
       const appScheme = "sajpe://home"; 
       const playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_pe";
       setStatusMsg("Launching App...");
       window.location.href = appScheme;
       
       setTimeout(() => {
         const confirmFallback = window.confirm("SajPe App not found. Go to Play Store?");
         if (confirmFallback) {
            window.location.href = playStoreLink;
         }
       }, 2000);
    }
    
  };

  const handleScan = async () => {
    setLoading(true);
    setError("");
    setDeviceData(null);
    setStatusMsg("Scanning Device...");

    try {
      // ✅ STEP 1: RESTORED YOUR EXACT ORIGINAL LOGIC HERE
      const parser = new UAParser();
      const result = parser.getResult();

      // OS Name
      const osName = result.os.name;
      const osVersion = result.os.version;
      const exactOS = `${osName} ${osVersion}`.trim();

      // Browser
      const browserName = result.browser.name;

      // Device Type Logic (Your Original Code)
      let rawType = result.device.type; // mobile, tablet, smarttv, wearable, embedded
      let deviceType = "Desktop / Laptop"; // Default

      if (rawType) {
        // Capitalize (mobile -> Mobile)
        deviceType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      }
      
      console.log("🔍 Internal Detection Raw Type:", rawType); // Debugging ke liye
      console.log("🔍 Final Device Type:", deviceType);

      // --- 2. FINGERPRINT & IP (Your Original Logic) ---
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();
      const strongDeviceID = fpResult.visitorId; 

      let ipAddress = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        ipAddress = ipJson.ip;
      } catch (e) { console.warn("IP Error"); }

      // --- 3. LOCATION (Your Original Logic) ---
      let locationInfo = { lat: null, lon: null, city: "Permission Denied", state: "", full_address: "" };
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'granted') {
          const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
          const { latitude, longitude } = position.coords;
          locationInfo.lat = latitude;
          locationInfo.lon = longitude;
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoJson = await geoRes.json();
          locationInfo.city = geoJson.address.city || "Unknown";
          locationInfo.state = geoJson.address.state || "";
          locationInfo.full_address = geoJson.display_name;
        } 
      } catch (err) { console.warn("Silent Location Check Failed"); }

      // --- 4. SET DATA (Your Original Payload Structure) ---
      const finalPayload = {
        identity: { stable_hardware_id: strongDeviceID },
        network: { ip_address: ipAddress },
        location: locationInfo,
        device_specs: {
          type: deviceType,
          os: exactOS,
          browser: browserName,
          model: result.device.model || "Generic System"
        }
      };

      setDeviceData(finalPayload);
      console.log("🚀 USER DATA (Local):", finalPayload);

      // ✅ STEP 5: SECURE API CALL (Backend ko data bhejna)
      setStatusMsg("Saving Secure Data...");
      
      const apiPayload = {
        device_specs: finalPayload.device_specs,
        location: finalPayload.location,
        network: finalPayload.network
      };

      // Server Action Call
      const apiResponse = await saveDeviceDataSecurely(apiPayload);
      console.log("📡 API RESPONSE FROM SERVER:", apiResponse);

      if (!apiResponse.success) {
         console.error("❌ Save Error:", apiResponse.error);
         // Error dikhane ke liye status msg update kar sakte hain
         setStatusMsg(`API Error: ${apiResponse.status || 'Unknown'}`);
      } else {
         setStatusMsg("Data Saved! Redirecting...");
      }

      // --- 6. TRIGGER REDIRECTION ---
      performRedirection(deviceType, osName);

    } catch (err) {
      console.error(err);
      setError("Scan Failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white">
      <div className="text-center max-w-lg mb-8">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">Super Device Scanner</h1>
        <p className="text-gray-400 text-sm">Detect & Redirect Securely</p>
      </div>

      <button
        onClick={handleScan}
        disabled={loading}
        className={`px-8 py-4 rounded-full font-bold text-lg shadow-lg transition-all ${loading ? "bg-gray-700" : "bg-green-600 hover:bg-green-500"}`}
      >
        {loading ? "Processing..." : "📍 Scan & Navigate (DEBUG)"}
      </button>

      {statusMsg && <p className="mt-4 text-yellow-400 font-mono text-sm animate-pulse">{statusMsg}</p>}
      
      {error && <p className="mt-4 text-red-400">{error}</p>}

      <DeviceCard data={deviceData} />
    </main>
  );
}