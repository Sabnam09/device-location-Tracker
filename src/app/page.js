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

  // Get precise GPS location
  const getGPSLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.warn("GPS error:", error.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Reverse geocode GPS coordinates to address
  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'SajPe-App/1.0' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const addr = data.address;
        return {
          city: addr.city || addr.town || addr.village || addr.county || 'Unknown',
          state: addr.state || addr.region || 'Unknown',
          country: addr.country || 'Unknown',
          postal_code: addr.postcode || '',
          full_address: data.display_name || 'Address Not Available',
          latitude: lat,
          longitude: lon,
          accuracy: 'high',
          source: 'gps'
        };
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error);
    }
    return null;
  };

  // Get location from IP with multiple fallback APIs
  const getLocationFromIP = async (ip) => {
    // Try multiple APIs in sequence
    const apis = [
      {
        name: 'ip-api.com',
        fetch: async () => {
          const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon`);
          const data = await res.json();
          if (data.status === 'fail') throw new Error(data.message);
          return {
            city: data.city || 'Unknown',
            state: data.regionName || 'Unknown',
            country: data.country || 'Unknown',
            postal_code: data.zip || '',
            latitude: data.lat,
            longitude: data.lon,
            full_address: `${data.city}, ${data.regionName}, ${data.country}`,
            accuracy: 'medium',
            source: 'ip'
          };
        }
      },
      {
        name: 'ipapi.co',
        fetch: async () => {
          const res = await fetch(`https://ipapi.co/${ip}/json/`);
          const data = await res.json();
          if (data.error) throw new Error(data.reason);
          return {
            city: data.city || 'Unknown',
            state: data.region || 'Unknown',
            country: data.country_name || 'Unknown',
            postal_code: data.postal || '',
            latitude: data.latitude,
            longitude: data.longitude,
            full_address: `${data.city}, ${data.region}, ${data.country_name}`,
            accuracy: 'medium',
            source: 'ip'
          };
        }
      },
      {
        name: 'ipwhois.app',
        fetch: async () => {
          const res = await fetch(`https://ipwhois.app/json/${ip}`);
          const data = await res.json();
          if (!data.success) throw new Error('API failed');
          return {
            city: data.city || 'Unknown',
            state: data.region || 'Unknown',
            country: data.country || 'Unknown',
            postal_code: data.postal || '',
            latitude: data.latitude,
            longitude: data.longitude,
            full_address: `${data.city}, ${data.region}, ${data.country}`,
            accuracy: 'medium',
            source: 'ip'
          };
        }
      }
    ];

    // Try each API until one succeeds
    for (const api of apis) {
      try {
        console.log(`Trying ${api.name}...`);
        const result = await api.fetch();
        console.log(`✅ ${api.name} succeeded`);
        return result;
      } catch (error) {
        console.warn(`❌ ${api.name} failed:`, error.message);
      }
    }

    // All APIs failed - return fallback
    return {
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      postal_code: '',
      full_address: 'Location Not Available',
      accuracy: 'low',
      source: 'none'
    };
  };

  // Get accurate location: GPS first, then IP fallback
  const getAccurateLocation = async (ip) => {
    setStatusMsg("Requesting GPS location...");
    
    // Try GPS first
    const gpsCoords = await getGPSLocation();
    
    if (gpsCoords) {
      setStatusMsg("Converting GPS to address...");
      const addressData = await reverseGeocode(gpsCoords.latitude, gpsCoords.longitude);
      
      if (addressData) {
        return addressData;
      }
    }

    // Fallback to IP-based location
    setStatusMsg("Using IP-based location...");
    return await getLocationFromIP(ip);
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
    if (deviceType !== "Mobile") {
      if (type === 'b') {
        setStatusMsg("Redirecting to Business Website...");
        window.location.href = "https://sajpeweb.raavan.site/business/enter-number";
      } else {
        setStatusMsg("Redirecting to SajPe Website...");
        window.location.href = "https://sajpeweb.raavan.site";
      }
      return;
    }

    // MOBILE - Try app deep link first
    if (deviceType === "Mobile") {
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
      window.location.href = appScheme;

      // Fallback to Play Store after 2.5s
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.location.href = playStoreLink;
        }
      }, 2500);
    }
  };

  // Main scan handler
  const handleScan = async (manualType = null, manualCode = null) => {
    setLoading(true);
    setError("");

    try {
      const info = getReferralInfo(manualType, manualCode);

      setStatusMsg("Detecting device...");

      // Get device fingerprint
      const fp = await FingerprintJS.load();
      const fpResult = await fp.get();

      // Get browser/device info
      const parser = new UAParser();
      const result = parser.getResult();
      const deviceType = result.device.type ?
        result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1) :
        "Desktop";

      // Get IP address
      setStatusMsg("Fetching IP address...");
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Get accurate location
      const locationData = await getAccurateLocation(ip);

      // Prepare complete device data
      const deviceInfo = {
        identity: {
          stable_hardware_id: fpResult.visitorId,
        },
        network: {
          ip_address: ip,
        },
        device_specs: {
          type: deviceType,
          os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
          browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
          model: result.device.model || result.device.vendor || 'Generic',
          vendor: result.device.vendor || 'Unknown',
        },
        location: {
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          postal_code: locationData.postal_code,
          full_address: locationData.full_address,
          latitude: locationData.latitude || null,
          longitude: locationData.longitude || null,
          accuracy: locationData.accuracy,
          source: locationData.source
        },
        source_type: info.type,
        referral_code: info.code,
      };

      setDeviceData(deviceInfo);

      // Save to backend API
      setStatusMsg("Saving device info...");
      const apiPayload = {
        stable_hardware_id: fpResult.visitorId,
        ip_address: ip,
        device_type: deviceType,
        os: deviceInfo.device_specs.os,
        browser: deviceInfo.device_specs.browser,
        model: deviceInfo.device_specs.model,
        vendor: deviceInfo.device_specs.vendor,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
        postal_code: locationData.postal_code,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        location_accuracy: locationData.accuracy,
        location_source: locationData.source,
        source_type: info.type,
        referral_code: info.code,
      };

      const saveResult = await saveDeviceDataSecurely(apiPayload);

      if (saveResult.success) {
        setStatusMsg("✅ Device info saved!");
        // UNCOMMENT TO ENABLE NAVIGATION
        // setTimeout(() => {
        //   performRedirection(deviceType, info.type, info.code);
        // }, 1000);
      } else {
        setError("Failed to save. Check data below.");
        // UNCOMMENT TO ENABLE NAVIGATION ON ERROR
        // performRedirection(deviceType, info.type, info.code);
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