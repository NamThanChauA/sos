'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Navigation, Phone, RefreshCw, MapPin, CheckCircle, 
    X, AlertTriangle, HeartPulse, Package, Info 
} from 'lucide-react';

// --- TYPES ---
interface Victim {
  id: number;
  phone: string;
  name: string;
  lat: number;
  long: number;
  created_at: string;
  status: string;
  type?: string; // 'SOS' hoặc 'SUPPLY'
  distance?: number; 
}

export default function RescuerDashboard() {
  const [victims, setVictims] = useState<Victim[]>([]);
  
  // State Tab: Mặc định là SOS (Cứu người)
  const [activeTab, setActiveTab] = useState<'SOS' | 'SUPPLY'>('SOS');
  
  const [myLocation, setMyLocation] = useState<{ lat: number; long: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // State cho Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inputCode, setInputCode] = useState('');

  // --- HELPER: TÍNH KHOẢNG CÁCH ---
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

  // --- 1. LẤY GPS ---
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

  // --- 2. LẤY DỮ LIỆU ---
  const fetchData = async () => {
      if (loading) return; 
      setLoading(true);
      
      try {
        const res = await axios.get('https://sos-api-k9iv.onrender.com/api/sos', { timeout: 15000 }); 
        let data: Victim[] = res.data;

        // Tính khoảng cách nếu có GPS
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
            alert("Mạng yếu. Vui lòng bấm LÀM MỚI lại.");
        }
      } finally {
        setLoading(false);
      }
  };

  // Chạy lần đầu
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- 3. XỬ LÝ HOÀN THÀNH (Modal) ---
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

  // --- LOGIC LỌC DANH SÁCH THEO TAB ---
  const filteredVictims = victims.filter((v) => {
      if (activeTab === 'SOS') {
          return v.type === 'SOS' || !v.type;
      } else {
          return v.type === 'SUPPLY';
      }
  });

  return (
    <div className="p-4 bg-gray-100 min-h-screen pb-20 font-sans">
      
      {/* HEADER & NÚT RELOAD */}
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

      {/* --- THÔNG ĐIỆP GỬI ANH EM CỨU HỘ --- */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <p className="text-sm text-gray-700 italic mb-2 leading-relaxed">
            "Em cảm ơn các anh em đã tham gia cứu hộ, em chúc mọi điều an lành đến với các anh em."
        </p>
        
        <div className="bg-white p-3 rounded-lg border border-blue-100 mb-2">
            <p className="text-sm font-bold text-blue-900 flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="flex items-center gap-1"><Info size={16}/> Mã đánh dấu thành công:</span> 
                <span className="text-red-600 text-lg font-mono bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-block w-fit mt-1 sm:mt-0">DBLMM</span>
            </p>
            <p className="text-[15px] font-medium text-black mt-1">("Đồng Bào Là Máu Mủ")</p>
        </div>

        <p className="text-xs text-gray-500 mt-2 pt-2">
            Để tránh những hành vi xấu và bất tiện. Em hy vọng sẽ không ai bị bỏ lại và đừng ai làm điều gì bậy bạ.
        </p>
        <p className="text-xs text-gray-500 pt-2">
            Chân thành.
        </p>
      </div>

      {/* --- BỘ LỌC TAB (SOS / LƯƠNG THỰC) --- */}
      <div className="flex gap-3 mb-4">
          <button 
            onClick={() => setActiveTab('SOS')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all
                ${activeTab === 'SOS' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-400 border-transparent'}`}
          >
              <HeartPulse size={20} className={activeTab === 'SOS' ? 'animate-pulse' : ''} />
              CỨU NGƯỜI ({victims.filter(v => !v.type || v.type === 'SOS').length})
          </button>

          <button 
            onClick={() => setActiveTab('SUPPLY')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all
                ${activeTab === 'SUPPLY' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-400 border-transparent'}`}
          >
              <Package size={20} />
              LƯƠNG THỰC ({victims.filter(v => v.type === 'SUPPLY').length})
          </button>
      </div>
      
      {/* CẢNH BÁO GPS */}
      {!myLocation && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 mb-4 rounded-lg text-sm flex items-center gap-2 animate-pulse">
            <MapPin size={16} /> 
            {gpsError || 'Đang dò tìm vị trí của bạn...'}
          </div>
      )}

      {/* DANH SÁCH NẠN NHÂN */}
      <div className="space-y-4">
        {filteredVictims.map((victim) => (
          <div key={victim.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 relative ${victim.type === 'SUPPLY' ? 'border-orange-500' : 'border-red-600'}`}>
            
            {/* LABEL LOẠI HÌNH (Góc phải trên) */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-bold text-white flex items-center gap-1
                ${victim.type === 'SUPPLY' ? 'bg-orange-500' : 'bg-red-600'}`}
            >
                {victim.type === 'SUPPLY' ? <><Package size={10}/> TIẾP TẾ</> : <><HeartPulse size={10}/> KHẨN CẤP</>}
            </div>

            <div className="flex justify-between items-start mb-3 mt-2">
                <div>
                    <div className="font-bold text-lg text-black">{victim.name || 'Người dân'}</div>
                    <div className="font-mono text-gray-600 text-lg font-bold tracking-wider">{victim.phone}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        {victim.created_at ? new Date(victim.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                </div>
                
                {/* Hiển thị khoảng cách */}
                <div className="text-right min-w-[80px] pt-4">
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
                className="w-full mt-4 py-3 bg-gray-50 text-gray-500 font-bold rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-200 hover:text-gray-800 transition text-sm"
            >
                <CheckCircle size={16} /> ĐÁNH DẤU ĐÃ XONG
            </button>
          </div>
        ))}
        
        {filteredVictims.length === 0 && !loading && (
            <div className="text-center text-gray-400 mt-10 py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <p>Hiện tại chưa có yêu cầu {activeTab === 'SOS' ? 'Cứu người' : 'Lương thực'} nào.</p>
            </div>
        )}
      </div>

      {/* --- MODAL XÁC NHẬN (POPUP) --- */}
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
                        "Tôi không dám chắc, nhưng nếu bạn không phải cứu hộ. Xin đừng phá hoại, hãy giúp cho nụ cười của những người bạn không quen biết được nở rộ vào ngày nắng lên."
                    </p>

                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Mã Đội cứu hộ</label>
                    <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="Nhập mã xác nhận..."
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