// src/app/rescue/page.tsx
'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigation, Phone, Map } from 'lucide-react';

// Định nghĩa kiểu dữ liệu
interface Victim {
  id: string;
  phone: string;
  name: string;
  lat: number;
  long: number;
  timestamp: string;
  status: string;
  distance?: number; // Sẽ tính ở client
}

export default function RescuerDashboard() {
  const [victims, setVictims] = useState<Victim[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; long: number } | null>(null);

  // Công thức Haversine tính khoảng cách (km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Bán kính trái đất
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 1. Lấy vị trí người cứu hộ
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setMyLocation({ lat: pos.coords.latitude, long: pos.coords.longitude });
    });
  }, []);

  // 2. Fetch dữ liệu và sắp xếp (Polling mỗi 10s)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Thay URL Golang của bạn vào đây
        const res = await axios.get('https://sos-api-k9iv.onrender.com/api/sos'); 
        let data: Victim[] = res.data;

        // Nếu đã có vị trí cứu hộ, tính khoảng cách và sort
        if (myLocation) {
          data = data.map(v => ({
            ...v,
            distance: calculateDistance(myLocation.lat, myLocation.long, v.lat, v.long)
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        setVictims(data);
      } catch (err) {
        console.error("Lỗi lấy data", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto refresh 10s
    return () => clearInterval(interval);
  }, [myLocation]);

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">ĐỘI CỨU HỘ - DANH SÁCH SOS</h1>
      
      {!myLocation && <div className="bg-yellow-200 p-2 mb-2 text-sm">Đang lấy vị trí của bạn để tính khoảng cách...</div>}

      <div className="space-y-3">
        {victims.map((victim) => (
          <div key={victim.id} className="bg-white p-4 rounded shadow border-l-4 border-red-500 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">{victim.name || 'Người dân'} - {victim.phone}</div>
              <div className="text-gray-500 text-sm">
                Cách bạn: <span className="font-bold text-red-600">{victim.distance ? `${victim.distance.toFixed(1)} km` : '? km'}</span>
              </div>
              <div className="text-xs text-gray-400">{new Date(victim.timestamp).toLocaleTimeString()}</div>
            </div>
            
            <div className="flex gap-2">
               {/* Nút Gọi */}
              <a href={`tel:${victim.phone}`} className="p-3 bg-green-500 text-white rounded-full shadow">
                <Phone size={20} />
              </a>
              {/* Nút Mở Map Google */}
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${victim.lat},${victim.long}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-blue-500 text-white rounded-full shadow"
              >
                <Navigation size={20} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}