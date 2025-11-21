'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigation, Phone, RefreshCw, MapPin } from 'lucide-react';

interface Victim {
  id: number;
  phone: string;
  name: string;
  lat: number;
  long: number;
  created_at: string;
  status: string;
  distance?: number; 
}

export default function RescuerDashboard() {
  const [victims, setVictims] = useState<Victim[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; long: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Hàm tính khoảng cách (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Trả về Km
  };

  // Hàm hiển thị khoảng cách "dân dã"
  const formatDistance = (km: number) => {
    if (km < 1) {
        // Nếu dưới 1km thì hiện số mét (làm tròn chục)
        return `${Math.round(km * 1000)}m`; 
    }
    // Nếu trên 1km thì hiện số lẻ 1 chữ số
    return `${km.toFixed(1)}km`;
  };

  // 1. Lấy vị trí Cứu hộ (Thử liên tục nếu chưa được)
  useEffect(() => {
    if (!navigator.geolocation) {
        setGpsError('Máy không hỗ trợ GPS');
        return;
    }
    // Theo dõi vị trí liên tục (watchPosition) thay vì chỉ lấy 1 lần
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            setMyLocation({ lat: pos.coords.latitude, long: pos.coords.longitude });
            setGpsError(''); // Xóa lỗi nếu đã bắt được
        },
        (err) => {
            console.error(err);
            setGpsError('Chưa lấy được vị trí của BẠN. Hãy bật GPS để xem khoảng cách.');
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Fetch Data
  const fetchData = async () => {
      setLoading(true);
      try {
        // URL Backend Render
        const res = await axios.get('https://sos-api-k9iv.onrender.com/api/sos'); 
        let data: Victim[] = res.data;

        if (myLocation) {
          data = data.map(v => ({
            ...v,
            distance: calculateDistance(myLocation.lat, myLocation.long, v.lat, v.long)
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        setVictims(data);
      } catch (err) {
        console.error("Lỗi lấy data", err);
      } finally {
        setLoading(false);
      }
  };

  // Polling dữ liệu và update khi có vị trí mới
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); 
    return () => clearInterval(interval);
  }, [myLocation]);

  return (
    <div className="p-4 bg-gray-100 min-h-screen pb-20">
      <div className="flex justify-between items-center mb-2 sticky top-0 bg-gray-100 z-10 py-2">
        <h1 className="text-2xl font-bold text-blue-900">DANH SÁCH CỨU HỘ</h1>
        <button onClick={fetchData} className="p-2 bg-white rounded-full shadow active:bg-gray-200">
             <RefreshCw size={20} className={loading ? 'animate-spin text-blue-600' : 'text-gray-600'} />
        </button>
      </div>
      
      {/* Báo lỗi GPS của người cứu hộ */}
      {!myLocation && (
          <div className="bg-yellow-200 text-yellow-800 p-3 mb-4 rounded-lg text-sm flex items-center gap-2 animate-pulse">
            <MapPin size={16} /> 
            {gpsError || 'Đang dò tìm vị trí của bạn...'}
          </div>
      )}

      <div className="space-y-3">
        {victims.map((victim) => (
          <div key={victim.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="font-bold text-lg text-black">{victim.name || 'Người dân'}</div>
                    <div className="font-mono text-gray-600 text-lg font-bold">{victim.phone}</div>
                    <div className="text-xs text-gray-400 mt-1">
                        {victim.created_at ? new Date(victim.created_at).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                    </div>
                </div>
                <div className="text-right min-w-[80px]">
                    {/* Hiển thị khoảng cách thông minh */}
                    <span className={`block text-2xl font-bold ${victim.distance && victim.distance < 1 ? 'text-green-600' : 'text-red-600'}`}>
                        {victim.distance !== undefined ? formatDistance(victim.distance) : '?'}
                    </span>
                    <span className="text-xs text-gray-500">cách bạn</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:${victim.phone}`} className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-700 font-bold rounded-lg active:scale-95 transition">
                <Phone size={18} /> GỌI NGAY
              </a>
              
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${victim.lat},${victim.long}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-blue-100 text-blue-700 font-bold rounded-lg active:scale-95 transition"
              >
                <Navigation size={18} /> CHỈ ĐƯỜNG
              </a>
            </div>
          </div>
        ))}
        
        {victims.length === 0 && !loading && (
            <div className="text-center text-gray-500 mt-10">Chưa có tin SOS nào.</div>
        )}
      </div>
    </div>
  );
}