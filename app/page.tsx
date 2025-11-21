'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, MapPin, LifeBuoy, CheckCircle, AlertTriangle, 
  Copy, UserPlus, HeartPulse, Package, RefreshCcw 
} from 'lucide-react';
import LocationBox from './components/LocationBox';
import GPSIndicator from './components/GPSIndicator';

export default function VictimPage() {
  const [mode, setMode] = useState<'SOS' | 'REPORT_OTHER'>('SOS');
  const [requestType, setRequestType] = useState<'SOS' | 'SUPPLY'>('SOS');
  
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLong, setManualLong] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  const coordsRef = useRef<{ lat: number; long: number } | null>(null);
  const [displayCoords, setDisplayCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'finding' | 'found' | 'error'>('finding');

  // 1. Khởi tạo
  useEffect(() => {
    if (localStorage.getItem('sos_sent') === 'true') setIsSent(true);

    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const coords = { lat: pos.coords.latitude, long: pos.coords.longitude };
            coordsRef.current = coords;
            setDisplayCoords(coords);
            setGpsStatus('found');
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Xử lý Gửi
  const handleSend = async () => {
    if (!phone || phone.length < 10) return alert("SĐT không hợp lệ");
    if (mode === 'REPORT_OTHER' && (!manualLat || !manualLong)) return alert("Thiếu tọa độ");

    setIsSending(true);
    let lat = 0, long = 0;

    if (mode === 'SOS') {
        lat = coordsRef.current?.lat || 0;
        long = coordsRef.current?.long || 0;
        if (lat === 0) {
            try {
                const pos: any = await new Promise((resolve, reject) => 
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                );
                lat = pos.coords.latitude;
                long = pos.coords.longitude;
            } catch {
                alert("Không lấy được GPS. Hãy bật định vị!");
                setIsSending(false);
                return;
            }
        }
    } else {
        lat = parseFloat(manualLat);
        long = parseFloat(manualLong);
    }

    try {
      const res = await axios.post('https://sos-api-k9iv.onrender.com/api/sos', {
        phone, 
        name: mode === 'REPORT_OTHER' ? `${name} (Báo hộ)` : name,
        lat, long, type: requestType
      });

      if (mode === 'SOS') {
          // LƯU ID VÀ PHONE ĐỂ SAU NÀY XÓA/CẬP NHẬT
          localStorage.setItem('sos_sent', 'true');
          localStorage.setItem('sos_id', res.data.data.id); 
          localStorage.setItem('sos_phone', phone);
          setIsSent(true);
      } else {
          alert("✅ Đã báo tin hộ thành công!");
          setPhone(''); setName(''); setManualLat(''); setManualLong('');
      }
    } catch {
      alert("Lỗi mạng! Hãy thử COPY TỌA ĐỘ gửi SMS cho người thân.");
    } finally {
      setIsSending(false);
    }
  };

  // 3. Xử lý Reset / Gửi lại (CÓ XÓA TIN CŨ)
  const handleReset = async () => {
      if (!confirm("⚠️ CẢNH BÁO:\nHành động này sẽ xóa yêu cầu cũ và cập nhật vị trí mới của bạn.\n\nBạn có chắc chắn muốn gửi lại không?")) {
          return;
      }

      // Thử xóa tin cũ trên server (nếu có mạng)
      const oldId = localStorage.getItem('sos_id');
      const oldPhone = localStorage.getItem('sos_phone');

      if (oldId && oldPhone) {
          try {
              await axios.post('https://sos-api-k9iv.onrender.com/api/sos/cancel', {
                  id: parseInt(oldId),
                  phone: oldPhone
              });
          } catch (e) {
              console.error("Không xóa được tin cũ (có thể do mất mạng), nhưng vẫn cho reset form");
          }
      }

      // Xóa local storage và reset giao diện
      localStorage.removeItem('sos_sent');
      localStorage.removeItem('sos_id');
      // Giữ lại số điện thoại (sos_phone) để người dùng đỡ phải nhập lại, hoặc xóa tùy bạn. 
      // Ở đây mình giữ lại state phone hiện tại.
      setIsSent(false);
  };

  // --- RENDER: Màn hình đã gửi ---
  if (isSent) {
    return (
        <div className="min-h-screen bg-green-50 p-4 flex flex-col items-center justify-center text-center font-sans">
             <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border-t-8 border-green-500">
                <CheckCircle size={80} className="text-green-600 mx-auto mb-4 animate-bounce"/>
                <h1 className="text-2xl font-bold text-green-700 mb-2">ĐÃ GỬI TÍN HIỆU!</h1>
                <p className="text-gray-700 mb-6">Đội cứu hộ đã nhận được thông tin.</p>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-left text-sm mb-6">
                    <p className="font-bold text-yellow-800 mb-1 flex items-center gap-1"><AlertTriangle size={16}/> LƯU Ý QUAN TRỌNG:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Giữ yên vị trí.</li>
                        <li>Tiết kiệm pin tối đa.</li>
                        <li>Chuẩn bị vật nổi/áo phao.</li>
                    </ul>
                </div>

                {/* NÚT GỬI LẠI / DI CHUYỂN */}
                <button 
                    onClick={handleReset} 
                    className="w-full py-3 bg-white border-2 border-gray-300 text-gray-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition"
                >
                    <RefreshCcw size={18} /> TÔI ĐÃ DI CHUYỂN / GỬI LẠI
                </button>
                <p className="text-xs text-gray-400 mt-2">Chỉ bấm khi bạn thay đổi vị trí hoặc cập nhật tình hình</p>

                 <div className="mt-6 pt-6 border-t border-gray-100">
                    <a href="/rescue" className="text-blue-600 font-bold text-sm flex items-center justify-center gap-2"><LifeBuoy size={16} /> Danh sách cứu hộ</a>
                </div>
            </div>
        </div>
    )
  }

  // --- RENDER: Màn hình chính ---
  return (
    <div className="min-h-screen bg-red-50 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl overflow-hidden border-t-8 border-red-600">
        
        <div className="p-4 text-center border-b border-gray-100">
             <h1 className="text-3xl font-bold text-red-600 mb-1">SOS KHẨN CẤP</h1>
             <p className="text-xs font-bold text-blue-800 bg-blue-50 inline-block px-3 py-1 rounded-full">Người Việt Thương Người Việt</p>
        </div>

        <div className="flex border-b bg-gray-50">
            <button onClick={() => setMode('SOS')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'SOS' ? 'bg-white text-red-600 border-t-2 border-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <Send size={16}/> TỰ CỨU
            </button>
            <button onClick={() => setMode('REPORT_OTHER')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'REPORT_OTHER' ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <UserPlus size={16}/> BÁO HỘ
            </button>
        </div>

        <div className="p-6">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase text-center">Bạn đang cần gì?</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => setRequestType('SOS')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${requestType === 'SOS' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400 hover:border-red-200'}`}>
                    <HeartPulse size={28} className={requestType === 'SOS' ? 'animate-pulse' : ''} /> <span className="font-bold text-xs">CỨU NGƯỜI</span>
                </button>
                <button onClick={() => setRequestType('SUPPLY')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${requestType === 'SUPPLY' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-400 hover:border-orange-200'}`}>
                    <Package size={28} /> <span className="font-bold text-xs">LƯƠNG THỰC</span>
                </button>
            </div>

            {mode === 'SOS' && (
                <>
                    <LocationBox lat={displayCoords?.lat || 0} long={displayCoords?.long || 0} loading={gpsStatus !== 'found'} />
                    <GPSIndicator status={gpsStatus} />
                </>
            )}

            {mode === 'REPORT_OTHER' && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold mb-1">🆘 Bạn nhận được tin nhắn cầu cứu?</p>
                    <p>Hãy nhập SĐT và Tọa độ chính xác từ tin nhắn SMS vào đây.</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">SỐ ĐIỆN THOẠI {mode === 'SOS' ? '(CỦA BẠN)' : '(NGƯỜI CẦN CỨU)'}</label>
                    <input type="tel" placeholder="Nhập SĐT..." className="w-full p-4 text-lg border-2 rounded-lg font-bold text-black focus:outline-none focus:border-blue-500" value={phone} onChange={(e) => setPhone(e.target.value)}/>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">HỌ VÀ TÊN</label>
                    <input type="text" placeholder={mode === 'SOS' ? "Họ tên (Không bắt buộc)..." : "Tên người gặp nạn..."} className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg font-bold text-black focus:outline-none focus:border-blue-500 shadow-sm" value={name} onChange={(e) => setName(e.target.value)}/>
                </div>

                {mode === 'REPORT_OTHER' && (
                    <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div>
                            <label className="block text-xs font-bold text-blue-700 mb-1">VĨ ĐỘ (LAT)</label>
                            <input type="number" placeholder="VD: 10.123..." className="w-full p-2 border rounded text-sm text-black font-bold" value={manualLat} onChange={(e) => setManualLat(e.target.value)}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-blue-700 mb-1">KINH ĐỘ (LONG)</label>
                            <input type="number" placeholder="VD: 106.456..." className="w-full p-2 border rounded text-sm text-black font-bold" value={manualLong} onChange={(e) => setManualLong(e.target.value)}/>
                        </div>
                    </div>
                )}

                <button onClick={handleSend} disabled={isSending} className={`w-full py-4 rounded-xl text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-4 ${requestType === 'SOS' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                    {isSending ? 'ĐANG GỬI...' : (mode === 'SOS' ? (requestType === 'SOS' ? 'GỬI YÊU CẦU CỨU HỘ' : 'GỬI YÊU CẦU TIẾP TẾ') : 'GỬI TIN BÁO HỘ')}
                </button>
            </div>
        </div>
      </div>
      
      <div className="mt-8 text-center pb-4"><a href="/rescue" className="inline-flex items-center gap-2 text-blue-600 bg-white px-5 py-3 rounded-full font-bold text-sm shadow-md"><LifeBuoy size={18} /> Bạn là đội cứu hộ?</a></div>
    </div>
  );
}