// src/app/api/get-ip/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  // Next.js ke pass user ki details headers me hoti hain
  let ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  
  // Agar IP list hai (comma separated), to pehla wala user ka hota hai
  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  // Fallback agar localhost par hain
  if (!ip) {
    ip = "127.0.0.1 (Localhost)";
  }

  return NextResponse.json({ ip: ip });
}