'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, LifeBuoy, CheckCircle, AlertTriangle, UserPlus, HeartPulse, Package } from 'lucide-react';
import LocationBox from './components/LocationBox';
import GPSIndicator from './components/GPSIndicator';

export default function VictimPage() {
  // States
  const [mode, setMode] = useState<'SOS' | 'REPORT_OTHER'>('SOS');
  const [requestType, setRequestType] = useState<'SOS' | 'SUPPLY'>('SOS');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLong, setManualLong] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  // GPS Logic
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
    // Validate
    if (!phone || phone.length < 10) return alert("SĐT không hợp lệ");
    if (mode === 'REPORT_OTHER' && (!manualLat || !manualLong)) return alert("Thiếu tọa độ");

    setIsSending(true);
    let lat = 0, long = 0;

    if (mode === 'SOS') {
        lat = coordsRef.current?.lat || 0;
        long = coordsRef.current?.long || 0;
        if (lat === 0) {
            // Thử lấy lần cuối
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
      await axios.post('https://sos-api-k9iv.onrender.com/api/sos', {
        phone, name: mode === 'REPORT_OTHER' ? `${name} (Báo hộ)` : name,
        lat, long, type: requestType
      });

      if (mode === 'SOS') {
          localStorage.setItem('sos_sent', 'true');
          setIsSent(true);
      } else {
          alert("✅ Đã báo hộ thành công!");
          setPhone(''); setName(''); setManualLat(''); setManualLong('');
      }
    } catch {
      alert("Lỗi mạng! Hãy thử COPY TỌA ĐỘ gửi SMS cho người thân.");
    } finally {
      setIsSending(false);
    }
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
                    <p className="font-bold text-yellow-800 mb-1 flex items-center gap-1"><AlertTriangle size={16}/> LƯU Ý:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Giữ yên vị trí.</li>
                        <li>Tiết kiệm pin.</li>
                        <li>Chuẩn bị vật nổi.</li>
                    </ul>
                </div>
                <button onClick={() => { localStorage.removeItem('sos_sent'); setIsSent(false); }} className="text-sm text-gray-400 underline">Gửi lại / Di chuyển chỗ khác</button>
                 <div className="mt-6 pt-6 border-t border-gray-100">
                    <a href="/rescue" className="text-blue-600 font-bold text-sm flex items-center justify-center gap-2"><LifeBuoy size={16} /> Danh sách cứu hộ</a>
                </div>
            </div>
        </div>
    );
  }

  // --- RENDER: Màn hình chính ---
  return (
    <div className="min-h-screen bg-red-50 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl overflow-hidden border-t-8 border-red-600">
        <div className="p-4 text-center border-b border-gray-100">
             <h1 className="text-3xl font-bold text-red-600 mb-1">SOS KHẨN CẤP</h1>
             <p className="text-xs text-black">Vì để không ai bị bỏ lại</p>
             <p className="text-xs text-black">Hãy sử dụng nếu bạn thật sự cần</p>
             <p className=" font-bold text-blue-800 bg-blue-50 inline-block px-3 py-1 rounded-full mt-1">Người Việt Thương Người Việt</p>
        </div>

        {/* Tabs: Tự cứu / Báo hộ */}
        <div className="flex border-b bg-gray-50">
            <button onClick={() => setMode('SOS')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 ${mode === 'SOS' ? 'bg-white text-red-600 border-t-2 border-red-600' : 'text-gray-400'}`}>
                <Send size={16}/> SOS
            </button>
            <button onClick={() => setMode('REPORT_OTHER')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 ${mode === 'REPORT_OTHER' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-400'}`}>
                <UserPlus size={16}/> BÁO HỘ
            </button>
        </div>

        <div className="p-6">
            {/* Chọn Loại hình SOS / Lương thực */}
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase text-center">Bạn đang cần gì?</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => setRequestType('SOS')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${requestType === 'SOS' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400'}`}>
                    <HeartPulse size={28} className={requestType === 'SOS' ? 'animate-pulse' : ''} /> <span className="font-bold text-xs">CỨU NGƯỜI</span>
                </button>
                <button onClick={() => setRequestType('SUPPLY')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${requestType === 'SUPPLY' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-400'}`}>
                    <Package size={28} /> <span className="font-bold text-xs">LƯƠNG THỰC</span>
                </button>
            </div>

            {/* Hiển thị GPS nếu là SOS */}
            {mode === 'SOS' && (
                <>
                    <LocationBox lat={displayCoords?.lat || 0} long={displayCoords?.long || 0} loading={gpsStatus !== 'found'} />
                    <GPSIndicator status={gpsStatus} />
                </>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">SỐ ĐIỆN THOẠI</label>
                    <input type="tel" placeholder="Nhập SĐT..." className="w-full p-4 text-lg border-2 rounded-lg font-bold text-black focus:outline-none focus:border-blue-500" value={phone} onChange={(e) => setPhone(e.target.value)}/>
                </div>
                {mode === 'SOS' && <input type="text" placeholder="Họ tên (Tùy chọn)" className="w-full p-4 text-lg border-2 rounded-lg font-bold text-black focus:outline-none focus:border-blue-500" value={name} onChange={(e) => setName(e.target.value)}/>}
                
                {mode === 'REPORT_OTHER' && (
                    <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-lg">
                        <input type="number" placeholder="Vĩ độ (Lat)" className="p-2 border rounded text-sm" value={manualLat} onChange={(e) => setManualLat(e.target.value)}/>
                        <input type="number" placeholder="Kinh độ (Long)" className="p-2 border rounded text-sm" value={manualLong} onChange={(e) => setManualLong(e.target.value)}/>
                        <p className="col-span-2 text-xs text-blue-600 text-center">Nhập từ tin nhắn SMS</p>
                    </div>
                )}

                <button onClick={handleSend} disabled={isSending} className={`w-full py-4 rounded-xl text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-4 ${requestType === 'SOS' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                    {isSending ? 'ĐANG GỬI...' : (requestType === 'SOS' ? 'GỬI YÊU CẦU CỨU HỘ' : 'GỬI YÊU CẦU TIẾP TẾ')}
                </button>
            </div>
        </div>
      </div>
      <div className="mt-8 text-center pb-4"><a href="/rescue" className="inline-flex items-center gap-2 text-blue-600 bg-white px-5 py-3 rounded-full font-bold text-sm shadow-md"><LifeBuoy size={18} /> Bạn là đội cứu hộ?</a></div>
    </div>
  );
}