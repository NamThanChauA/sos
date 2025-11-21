'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigation, Phone, RefreshCw, MapPin, CheckCircle, X, AlertTriangle } from 'lucide-react';

// --- TYPES ---
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

  // State cho Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inputCode, setInputCode] = useState('');

  // Hàm tính khoảng cách (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`; 
    return `${km.toFixed(1)}km`;
  };

  // 1. Lấy GPS
  useEffect(() => {
    if (!navigator.geolocation) {
        setGpsError('Thiết bị không hỗ trợ GPS');
        return;
    }
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            setMyLocation({ lat: pos.coords.latitude, long: pos.coords.longitude });
            setGpsError(''); 
        },
        (err) => {
            console.error(err);
            setGpsError('Vui lòng bật GPS để tính khoảng cách.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Fetch Data (Thêm Timeout để tránh icon xoay mãi)
  const fetchData = async () => {
      if (loading) return; // Chặn spam nút click
      setLoading(true);
      
      try {
        // Thêm timeout 15 giây. Nếu server ngủ đông quá lâu thì báo lỗi để user bấm lại.
        const res = await axios.get('https://sos-api-k9iv.onrender.com/api/sos', {
            timeout: 15000 
        }); 
        
        let data: Victim[] = res.data;

        if (myLocation) {
          data = data.map(v => ({
            ...v,
            distance: calculateDistance(myLocation.lat, myLocation.long, v.lat, v.long)
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        setVictims(data);
      } catch (err: any) {
        console.error("Lỗi lấy data", err);
        if (err.code === 'ECONNABORTED') {
            alert("Server đang khởi động (do dùng gói Free). Vui lòng bấm LÀM MỚI lại sau 30 giây.");
        }
      } finally {
        setLoading(false); // Đảm bảo icon luôn dừng xoay dù thành công hay thất bại
      }
  };

  // Chạy lần đầu
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- XỬ LÝ MODAL ---
  const openConfirmModal = (id: number) => {
      setSelectedId(id);
      setInputCode('');
      setShowModal(true);
  };

  const handleConfirmDone = async () => {
    if (!inputCode || selectedId === null) return;

    try {
        await axios.post('https://sos-api-k9iv.onrender.com/api/sos/done', {
            id: selectedId,
            code: inputCode
        });
        
        alert("Đã cập nhật trạng thái cứu hộ thành công!");
        setShowModal(false);
        fetchData(); 
    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            alert("❌ Sai mã đội cứu hộ.");
        } else {
            alert("Lỗi kết nối.");
        }
    }
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen pb-20 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-100 z-10 py-2 shadow-sm px-2 -mx-4">
        <h1 className="text-xl font-bold text-blue-900 pl-2">DANH SÁCH CỨU HỘ</h1>
        <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow active:bg-blue-700 font-bold text-sm mr-2 active:scale-95 transition-transform disabled:bg-blue-400"
        >
             <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
             {loading ? 'ĐANG TẢI...' : 'LÀM MỚI'}
        </button>
      </div>
      
      {/* GPS Warning */}
      {!myLocation && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 mb-4 rounded-lg text-sm flex items-center gap-2 animate-pulse">
            <MapPin size={16} /> 
            {gpsError || 'Đang dò tìm vị trí của bạn...'}
          </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {victims.map((victim) => (
          <div key={victim.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 relative">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="font-bold text-lg text-black">{victim.name || 'Người dân'}</div>
                    <div className="font-mono text-gray-600 text-lg font-bold tracking-wider">{victim.phone}</div>
                    <div className="text-xs text-gray-400 mt-1">
                        {victim.created_at ? new Date(victim.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                </div>
                <div className="text-right min-w-[80px]">
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

            <button 
                onClick={() => openConfirmModal(victim.id)}
                className="w-full mt-4 py-3 bg-gray-50 text-gray-500 font-bold rounded-lg border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-200 hover:text-gray-800 transition text-sm"
            >
                <CheckCircle size={16} /> ĐÁNH DẤU ĐÃ CỨU XONG
            </button>
          </div>
        ))}
        
        {victims.length === 0 && !loading && (
            <div className="text-center text-gray-400 mt-20">
                <p>Hiện tại không có tín hiệu SOS nào.</p>
            </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                    <h3 className="font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle size={20} /> XÁC NHẬN CỨU HỘ
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-gray-600 text-sm italic mb-6 leading-relaxed text-justify border-l-4 border-gray-300 pl-3">
                        "Hành động nhỏ, ý nghĩa lớn. Cảm ơn bạn đã hỗ trợ cộng đồng."
                    </p>

                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Mã Đội cứu hộ</label>
                    <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="Nhập mã..."
                        className="w-full p-3 border-2 text-gray-600 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg text-center mb-6"
                        autoFocus
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="py-3 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={handleConfirmDone}
                            disabled={!inputCode}
                            className={`py-3 rounded-lg font-bold text-white shadow-lg 
                                ${!inputCode ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                        >
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}