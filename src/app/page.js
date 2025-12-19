"use client";

import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { UAParser } from "ua-parser-js";
import DeviceCard from "./components/DeviceCard";
import { saveDeviceDataSecurely } from "./actions";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [currentType, setCurrentType] = useState(null);
  const [currentCode, setCurrentCode] = useState(null);

  // Extract URL parameters on component mount
  useEffect(() => {
    const info = getReferralInfo();
    setCurrentType(info.type);
    setCurrentCode(info.code);

    // Auto-trigger scan if valid URL parameters exist
    if (info.type && info.code) {
      handleScan(info.type, info.code);
    }
  }, []);

  // Get referral info from URL
  const getReferralInfo = (manualType = null, manualCode = null) => {
    if (manualType) {
      return { type: manualType, code: manualCode, isTest: true };
    }

    if (typeof window === "undefined") {
      return { type: null, code: null, isTest: false };
    }

    const segments = window.location.pathname.split('/').filter(Boolean);

    return {
      type: segments[0] || null,
      action: segments[1] || null,
      code: segments[2] || null,
      isTest: false
    };
  };

  // Get accurate location using GPS-first approach (from old code)
  const getAccurateLocation = async () => {
    let locationInfo = { 
      lat: null, 
      lon: null, 
      city: "Permission Denied", 
      state: "", 
      country: "",
      postal_code: "",
      full_address: "",
      accuracy: "low",
      source: "none"
    };

    try {
      // Check geolocation permission first
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
        setStatusMsg("Getting GPS location...");
        
        // Get GPS coordinates
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve, 
            reject,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });

        const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;
        locationInfo.lat = latitude;
        locationInfo.lon = longitude;
        locationInfo.accuracy = "high";
        locationInfo.source = "gps";

        setStatusMsg("Converting GPS to address...");

        // Reverse geocode to get address
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'SajPe-App/1.0' } }
        );
        
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          const addr = geoJson.address;
          
          locationInfo.city = addr.city || addr.town || addr.village || addr.county || "Unknown";
          locationInfo.state = addr.state || addr.region || "";
          locationInfo.country = addr.country || "";
          locationInfo.postal_code = addr.postcode || "";
          locationInfo.full_address = geoJson.display_name;
        }
      } else {
        // Permission denied or not supported - fall back to IP
        setStatusMsg("GPS denied, using IP location...");
        const ipLocation = await getIPLocation();
        return ipLocation;
      }
    } catch (err) {
      console.warn("GPS location failed, falling back to IP:", err);
      setStatusMsg("GPS failed, using IP location...");
      
      // Fallback to IP-based location
      const ipLocation = await getIPLocation();
      return ipLocation;
    }

    return locationInfo;
  };

  // Fallback IP-based location
  const getIPLocation = async () => {
    const apis = [
      {
        name: 'ip-api.com',
        fetch: async (ip) => {
          const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon`);
          const data = await res.json();
          if (data.status === 'fail') throw new Error(data.message);
          return {
            lat: data.lat,
            lon: data.lon,
            city: data.city || 'Unknown',
            state: data.regionName || 'Unknown',
            country: data.country || 'Unknown',
            postal_code: data.zip || '',
            full_address: `${data.city}, ${data.regionName}, ${data.country}`,
            accuracy: 'medium',
            source: 'ip'
          };
        }
      },
      {
        name: 'ipapi.co',
        fetch: async (ip) => {
          const res = await fetch(`https://ipapi.co/${ip}/json/`);
          const data = await res.json();
          if (data.error) throw new Error(data.reason);
          return {
            lat: data.latitude,
            lon: data.longitude,
            city: data.city || 'Unknown',
            state: data.region || 'Unknown',
            country: data.country_name || 'Unknown',
            postal_code: data.postal || '',
            full_address: `${data.city}, ${data.region}, ${data.country_name}`,
            accuracy: 'medium',
            source: 'ip'
          };
        }
      }
    ];

    // Get IP first
    let ip = "";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipJson = await ipRes.json();
      ip = ipJson.ip;
    } catch (e) {
      console.warn("IP fetch failed");
      return {
        lat: null,
        lon: null,
        city: "Unknown",
        state: "",
        country: "",
        postal_code: "",
        full_address: "Location Not Available",
        accuracy: "low",
        source: "none"
      };
    }

    // Try each API
    for (const api of apis) {
      try {
        console.log(`Trying ${api.name}...`);
        const result = await api.fetch(ip);
        console.log(`✅ ${api.name} succeeded`);
        return result;
      } catch (error) {
        console.warn(`❌ ${api.name} failed:`, error.message);
      }
    }

    // All failed
    return {
      lat: null,
      lon: null,
      city: "Unknown",
      state: "",
      country: "",
      postal_code: "",
      full_address: "Location Not Available",
      accuracy: "low",
      source: "none"
    };
  };

  // Navigation Flow Logic
  const performRedirection = (deviceType, type, code) => {
    console.log(`🚀 Redirection | Device: ${deviceType} | Type: ${type} | Code: ${code}`);

    // SAJ COMMUNITY - Always Play Store
    if (type === 'c') {
      setStatusMsg("Redirecting to Saj Community...");
      window.location.href = "https://play.google.com/store/apps/details?id=com.saj_community";
      return;
    }

    // DESKTOP/LAPTOP
    if (deviceType !== "Mobile" && deviceType !== "Tablet") {
      if (type === 'b') {
        setStatusMsg("Redirecting to Business Website...");
        window.location.href = "https://sajpeweb.raavan.site/business/enter-number";
      } else {
        setStatusMsg("Redirecting to SajPe Website...");
        window.location.href = "https://sajpeweb.raavan.site";
      }
      return;
    }

    // MOBILE/TABLET - Try app deep link first
    if (deviceType === "Mobile" || deviceType === "Tablet") {
      let appScheme, playStoreLink, appName;

      if (type === 'b') {
        appScheme = `sajbusiness://home?code=${code}`;
        playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_business";
        appName = "Saj Business";
      } else {
        appScheme = `sajpe://home?code=${code}`;
        playStoreLink = "https://play.google.com/store/apps/details?id=com.saj_pe";
        appName = "SajPe";
      }

      setStatusMsg(`Opening ${appName} App...`);
      
      // Magic deep link logic
      const start = Date.now();
      window.location.href = appScheme;

      setTimeout(() => {
        const end = Date.now();
        const elapsed = end - start;

        if (elapsed < 3000 && !document.hidden) {
          setStatusMsg("App not found. Redirecting to Play Store...");
          window.location.href = playStoreLink;
        }
      }, 2500);
    }
  };

  // Main scan handler
  const handleScan = async (manualType = null, manualCode = null) => {
    setLoading(true);
    setError("");
    setDeviceData(null);

    try {
      const info = getReferralInfo(manualType, manualCode);

      setStatusMsg("Scanning device...");

      // 1. Get device fingerprint
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();
      const strongDeviceID = fpResult.visitorId;

      // 2. Get browser/device info
      const parser = new UAParser();
      const result = parser.getResult();

      const osName = result.os.name || 'Unknown';
      const osVersion = result.os.version || '';
      const exactOS = `${osName} ${osVersion}`.trim();
      const browserName = result.browser.name || 'Unknown';
      const browserVersion = result.browser.version || '';
      const exactBrowser = `${browserName} ${browserVersion}`.trim();

      let rawType = result.device.type;
      let deviceType = "Desktop";

      if (rawType) {
        deviceType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      }

      // 3. Get IP address
      setStatusMsg("Fetching IP address...");
      let ipAddress = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        ipAddress = ipJson.ip;
      } catch (e) {
        console.warn("IP Error");
        ipAddress = "Unknown";
      }

      // 4. Get accurate location (GPS-first approach)
      const locationInfo = await getAccurateLocation();

      // 5. Prepare complete device data
      const finalPayload = {
        identity: {
          stable_hardware_id: strongDeviceID
        },
        network: {
          ip_address: ipAddress
        },
        location: locationInfo,
        device_specs: {
          type: deviceType,
          os: exactOS,
          browser: exactBrowser,
          model: result.device.model || result.device.vendor || "Generic System"
        },
        source_type: info.type,
        referral_code: info.code
      };

      setDeviceData(finalPayload);
      console.log("🚀 USER DATA:", finalPayload);

      // 6. Save to backend API
      setStatusMsg("Saving device info...");
      const apiPayload = {
        stable_hardware_id: strongDeviceID,
        ip_address: ipAddress,
        device_type: deviceType,
        os: exactOS,
        browser: exactBrowser,
        model: finalPayload.device_specs.model,
        city: locationInfo.city,
        state: locationInfo.state,
        country: locationInfo.country,
        postal_code: locationInfo.postal_code,
        latitude: locationInfo.lat,
        longitude: locationInfo.lon,
        location_accuracy: locationInfo.accuracy,
        location_source: locationInfo.source,
        source_type: info.type,
        referral_code: info.code,
      };

      const saveResult = await saveDeviceDataSecurely(apiPayload);

      if (saveResult.success) {
        setStatusMsg("✅ Device info saved!");
        // Trigger redirection after 1 second
        setTimeout(() => {
          performRedirection(deviceType, info.type, info.code);
        }, 1000);
      } else {
        setError("Failed to save. Redirecting anyway...");
        performRedirection(deviceType, info.type, info.code);
      }

    } catch (err) {
      console.error("Scan Error:", err);
      setError("Scan failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAppName = (type) => {
    switch (type) {
      case 'b': return 'Saj Business';
      case 'c': return 'Saj Community';
      default: return 'SajPe';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'b': return 'bg-green-600';
      case 'c': return 'bg-purple-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white">

      {/* CURRENT URL INFO */}
      {currentType && currentCode && (
        <div className="mb-6 p-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl w-full max-w-md shadow-2xl">
          <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest text-center">
            Current Referral Details
          </h2>
          <div className="space-y-2 text-center">
            <div>
              <span className="text-gray-400 text-sm">App Type:</span>
              <span className="ml-2 text-white font-bold text-lg">
                {getAppName(currentType)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Referral Code:</span>
              <span className="ml-2 text-green-400 font-mono font-bold text-xl">
                {currentCode}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN ACTION BUTTON */}
      {currentType && currentCode && (
        <div className="mb-10 w-full max-w-md">
          <button
            onClick={() => handleScan(currentType, currentCode)}
            disabled={loading}
            className={`w-full ${getColor(currentType)} hover:opacity-90 py-6 rounded-2xl font-bold text-xl flex flex-col items-center transition-all active:scale-95 shadow-2xl disabled:opacity-50`}
          >
            {loading ? (
              <>
                <span className="animate-pulse">Processing...</span>
                <span className="text-sm opacity-70 mt-2">Please wait</span>
              </>
            ) : (
              <>
                <span>Open {getAppName(currentType)}</span>
                <span className="text-sm opacity-70 mt-2">Code: {currentCode}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STATUS DISPLAY */}
      <div className="text-center w-full max-w-md">
        {statusMsg && (
          <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/30 text-blue-400 font-mono text-sm animate-pulse mb-4">
            🚀 {statusMsg}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* DEVICE CARD */}
      <DeviceCard data={deviceData} />

      {/* TESTING SECTION */}
      {(!currentType || !currentCode) && (
        <div className="mt-10 p-6 bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
          <h2 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest text-center">
            Test Navigation Flow
          </h2>
          <p className="text-gray-500 text-sm text-center mb-4">
            No referral URL detected. Use format: /type/r/code
          </p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { name: "SajPe Test", type: "s", code: "105", color: "bg-blue-600" },
              { name: "Business Test", type: "b", code: "202", color: "bg-green-600" },
              { name: "Community Test", type: "c", code: "303", color: "bg-purple-600" }
            ].map((link) => (
              <button
                key={link.type}
                onClick={() => handleScan(link.type, link.code)}
                disabled={loading}
                className={`${link.color} hover:opacity-90 py-3 rounded-lg font-bold flex flex-col items-center transition-all active:scale-95`}
              >
                <span>{link.name}</span>
                <span className="text-[10px] opacity-70">Code: {link.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}