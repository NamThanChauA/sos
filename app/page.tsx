'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// Sử dụng thẻ a thay vì Link để đảm bảo tương thích build
import { 
  Send, MapPin, LifeBuoy, CheckCircle, AlertTriangle, 
  Copy, UserPlus, HeartPulse, Package, ShieldAlert, Clock 
} from 'lucide-react';
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
  
  // State cho Báo Hộ
  const [agreePolicy, setAgreePolicy] = useState(false); // Checkbox cam kết
  const [cooldown, setCooldown] = useState(0); // Thời gian chờ đếm ngược

  // GPS Logic
  const coordsRef = useRef<{ lat: number; long: number } | null>(null);
  const [displayCoords, setDisplayCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'finding' | 'found' | 'error'>('finding');

  // 1. Khởi tạo & Check Cooldown
  useEffect(() => {
    // Check xem đã gửi SOS chính chủ chưa
    if (localStorage.getItem('sos_sent') === 'true') setIsSent(true);

    // Check xem có đang bị Cooldown báo hộ không
    const lastReportTime = localStorage.getItem('last_report_time');
    if (lastReportTime) {
        const diff = Math.floor((Date.now() - parseInt(lastReportTime)) / 1000);
        if (diff < 60) {
            setCooldown(60 - diff); // Nếu chưa đủ 60s thì set thời gian đếm ngược
        }
    }

    // Lấy GPS
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

  // Effect đếm ngược Cooldown
  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (cooldown > 0) {
          interval = setInterval(() => {
              setCooldown((prev) => prev - 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [cooldown]);

  // 2. HÀM COPY TỌA ĐỘ
  const handleCopyLocation = () => {
    if (!displayCoords) return alert("Chưa lấy được tọa độ! Vui lòng đợi GPS...");
    const text = `${displayCoords.lat},${displayCoords.long}`;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => alert("✅ Đã copy tọa độ!"));
    } else {
        alert(`Tọa độ: ${text}`);
    }
  };

  // 3. Xử lý Gửi
  const handleSend = async () => {
    // Validate chung
    if (!phone || phone.length < 10) return alert("SĐT không hợp lệ");
    
    // Validate riêng cho Báo Hộ
    if (mode === 'REPORT_OTHER') {
        if (!manualLat || !manualLong) return alert("Thiếu tọa độ");
        if (!agreePolicy) return alert("Bạn cần tích vào ô cam kết chịu trách nhiệm.");
        if (cooldown > 0) return alert(`Vui lòng đợi ${cooldown} giây nữa để báo trường hợp tiếp theo.`);
    }

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
      await axios.post('https://sos-api-k9iv.onrender.com/api/sos', {
        phone, 
        name: mode === 'REPORT_OTHER' ? `${name} (Báo hộ)` : name,
        lat, long, type: requestType
      });

      if (mode === 'SOS') {
          localStorage.setItem('sos_sent', 'true');
          setIsSent(true);
      } else {
          alert("✅ Đã báo tin hộ thành công! Cảm ơn tấm lòng của bạn.");
          
          // SET COOLDOWN: Lưu thời điểm hiện tại và bắt đầu đếm ngược 60s
          localStorage.setItem('last_report_time', Date.now().toString());
          setCooldown(60);

          // Reset form
          setPhone(''); setName(''); setManualLat(''); setManualLong(''); setAgreePolicy(false);
      }
    } catch {
      alert("Lỗi mạng! Hãy thử COPY TỌA ĐỘ gửi SMS cho người thân.");
    } finally {
      setIsSending(false);
    }
  };

  // --- RENDER: Màn hình đã gửi (Cho chính chủ) ---
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
                <button onClick={() => { localStorage.removeItem('sos_sent'); setIsSent(false); }} className="text-sm text-gray-400 underline">Gửi lại / Di chuyển chỗ khác</button>
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
             <p className="text-xs font-medium text-black">Vì để không ai bị bỏ lại</p>
             <p className="text-xs font-medium text-black mb-2">Hãy sử dụng nếu bạn thật sự cần</p>
             <p className="text-xs font-bold text-blue-800 bg-blue-50 inline-block px-3 py-1 rounded-full">Người Việt Thương Người Việt</p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex border-b bg-gray-50">
            <button onClick={() => setMode('SOS')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'SOS' ? 'bg-white text-red-600 border-t-2 border-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <Send size={16}/> CẦN CỨU (SOS)
            </button>
            <button onClick={() => setMode('REPORT_OTHER')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'REPORT_OTHER' ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <UserPlus size={16}/> BÁO HỘ NGƯỜI THÂN
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

            {/* Hiển thị GPS nếu là chế độ TỰ CỨU */}
            {mode === 'SOS' && (
                <>
                    <LocationBox lat={displayCoords?.lat || 0} long={displayCoords?.long || 0} loading={gpsStatus !== 'found'} />
                    <GPSIndicator status={gpsStatus} />
                </>
            )}

            {/* Hướng dẫn cho chế độ BÁO HỘ */}
            {mode === 'REPORT_OTHER' && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold mb-1">🆘 Bạn nhận được tin nhắn cầu cứu?</p>
                    <p>Hãy nhập thông tin chính xác từ tin nhắn SMS vào bên dưới để chuyển tới đội cứu hộ.</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">SỐ ĐIỆN THOẠI {mode === 'SOS' ? '(CỦA BẠN)' : '(NGƯỜI CẦN CỨU)'}</label>
                    <input 
                        type="tel" placeholder="Nhập SĐT..." 
                        className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg font-bold text-black focus:outline-none focus:border-blue-500 shadow-sm"
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">HỌ VÀ TÊN</label>
                    <input 
                        type="text" 
                        placeholder={mode === 'SOS' ? "Họ tên (Không bắt buộc)..." : "Tên người gặp nạn (Lấy từ SMS)..."} 
                        className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg font-bold text-black focus:outline-none focus:border-blue-500 shadow-sm"
                        value={name} onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Ô nhập tọa độ tay (Chỉ hiện khi Báo Hộ) */}
                {mode === 'REPORT_OTHER' && (
                    <>
                        <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div>
                                <label className="block text-xs font-bold text-blue-700 mb-1">VĨ ĐỘ (LAT)</label>
                                <input type="number" placeholder="VD: 10.123..." className="w-full p-2 border rounded text-sm text-black font-bold" value={manualLat} onChange={(e) => setManualLat(e.target.value)}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-700 mb-1">KINH ĐỘ (LONG)</label>
                                <input type="number" placeholder="VD: 106.456..." className="w-full p-2 border rounded text-sm text-black font-bold" value={manualLong} onChange={(e) => setManualLong(e.target.value)}/>
                            </div>
                            <p className="col-span-2 text-xs text-blue-600 text-center italic">Nhập chính xác số từ tin nhắn SMS</p>
                        </div>

                        {/* CHECKBOX CAM KẾT + COOLDOWN TIMER */}
                        <div className="flex items-start gap-2 mt-2 p-2 bg-gray-50 rounded">
                            <input 
                                type="checkbox" 
                                id="policy" 
                                className="mt-1 w-4 h-4"
                                checked={agreePolicy}
                                onChange={(e) => setAgreePolicy(e.target.checked)}
                            />
                            <label htmlFor="policy" className="text-xs text-gray-600 leading-tight cursor-pointer select-none">
                                Tôi xin cam kết thông tin trên là chính xác và chịu trách nhiệm nếu cố tình báo tin giả (<ShieldAlert size={10} className="inline"/>).
                            </label>
                        </div>
                    </>
                )}

                {/* Nút Gửi */}
                <button 
                    onClick={handleSend} 
                    disabled={isSending || (mode === 'REPORT_OTHER' && cooldown > 0)}
                    className={`w-full py-4 rounded-xl text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-4
                        ${mode === 'REPORT_OTHER' && cooldown > 0 
                            ? 'bg-gray-400 cursor-not-allowed' // Nút xám khi đang Cooldown
                            : (requestType === 'SOS' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600')
                        }`}
                >
                    {isSending ? 'ĐANG GỬI...' : (
                        mode === 'SOS' 
                            ? (requestType === 'SOS' ? 'GỬI YÊU CẦU CỨU HỘ' : 'GỬI YÊU CẦU TIẾP TẾ') 
                            : (cooldown > 0 ? `CHỜ ${cooldown}s ĐỂ BÁO TIẾP` : 'GỬI TIN BÁO HỘ')
                    )}
                    {mode === 'REPORT_OTHER' && cooldown > 0 && <Clock size={20} className="animate-spin"/>}
                </button>
            </div>
        </div>
      </div>
      
      <div className="mt-8 text-center pb-4">
        <a href="/rescue" className="inline-flex items-center gap-2 text-blue-600 bg-white px-5 py-3 rounded-full font-bold text-sm shadow-md border border-blue-100 hover:bg-blue-50 transition">
            <LifeBuoy size={18} /> Bạn là đội cứu hộ?
        </a>
      </div>
    </div>
  );
}