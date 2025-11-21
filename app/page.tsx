'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// Sử dụng thẻ a thay vì Link để đảm bảo tương thích build
import { 
  Send, MapPin, LifeBuoy, CheckCircle, AlertTriangle, 
  Copy, UserPlus 
} from 'lucide-react';

export default function VictimPage() {
  // Chế độ: 'SOS' (Tự cứu) hoặc 'REPORT_OTHER' (Báo hộ người khác)
  const [mode, setMode] = useState<'SOS' | 'REPORT_OTHER'>('SOS');
  
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Tọa độ nhập tay (Dùng cho chế độ Báo Hộ)
  const [manualLat, setManualLat] = useState('');
  const [manualLong, setManualLong] = useState('');

  // Tọa độ thực tế (Dùng Ref để gửi API, State để hiển thị UI)
  const coordsRef = useRef<{ lat: number; long: number } | null>(null);
  const [displayCoords, setDisplayCoords] = useState<{ lat: number; long: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'finding' | 'found' | 'error'>('finding');
  
  const [errors, setErrors] = useState({ phone: '', coords: '' });

  // 1. LẤY GPS & CHECK TRẠNG THÁI GỬI
  useEffect(() => {
    const sentStatus = localStorage.getItem('sos_sent');
    if (sentStatus === 'true') setIsSent(true);

    const getLoc = () => {
        if (!navigator.geolocation) { setGpsStatus('error'); return; }
        
        // Sử dụng watchPosition để cập nhật liên tục khi di chuyển
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newCoords = { lat: pos.coords.latitude, long: pos.coords.longitude };
                coordsRef.current = newCoords;
                setDisplayCoords(newCoords); // Cập nhật giao diện
                setGpsStatus('found');
            },
            (err) => { 
                console.warn("GPS Error:", err); 
                // Không set error ngay để tránh làm user hoang mang
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    };
    getLoc();
  }, []);

  // 2. HÀM COPY TỌA ĐỘ
  const handleCopyLocation = () => {
    if (!displayCoords) {
        alert("Chưa lấy được tọa độ! Vui lòng đợi GPS...");
        return;
    }
    const text = `${displayCoords.lat},${displayCoords.long}`;
    
    // Hỗ trợ copy trên các trình duyệt
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ Đã copy tọa độ!\nHãy gửi tin nhắn hoặc Zalo cho người thân ngay.");
        });
    } else {
        // Fallback
        alert(`Tọa độ của bạn là:\n${text}\n\n(Hãy chép lại hoặc chụp màn hình)`);
    }
  };

  // 3. VALIDATE & GỬI
  const validateInputs = () => {
    let isValid = true;
    let newErrors = { phone: '', coords: '' };
    
    // Validate Phone
    if (!phone || !/^[0-9]{10,11}$/.test(phone)) { newErrors.phone = 'SĐT không hợp lệ'; isValid = false; }
    
    // Validate Tọa độ (Nếu là báo hộ)
    if (mode === 'REPORT_OTHER') {
        if (!manualLat || !manualLong) { newErrors.coords = 'Phải nhập tọa độ từ tin nhắn'; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSendSOS = async () => {
    if (!validateInputs()) return;
    setIsSending(true);

    let finalLat = 0;
    let finalLong = 0;

    if (mode === 'SOS') {
        // Lấy tự động
        finalLat = coordsRef.current?.lat || 0;
        finalLong = coordsRef.current?.long || 0;
        
        // Ép lấy lại lần cuối nếu chưa có
        if (finalLat === 0) {
            try {
                const pos: any = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
                });
                finalLat = pos.coords.latitude;
                finalLong = pos.coords.longitude;
            } catch (e) { 
                alert("⚠️ Không lấy được vị trí! Vui lòng bật GPS.");
                setIsSending(false);
                return;
            }
        }
    } else {
        // Lấy từ nhập tay
        finalLat = parseFloat(manualLat);
        finalLong = parseFloat(manualLong);
    }

    try {
      await axios.post('https://sos-api-k9iv.onrender.com/api/sos', { 
        phone, 
        name: mode === 'REPORT_OTHER' ? `${name} (Báo hộ)` : name, 
        lat: finalLat, 
        long: finalLong, 
      });
      
      if (mode === 'SOS') {
          localStorage.setItem('sos_sent', 'true');
          setIsSent(true);
      } else {
          alert("✅ Đã báo tin hộ thành công! Cảm ơn bạn.");
          // Reset form báo hộ để nhập tiếp người khác
          setPhone(''); setName(''); setManualLat(''); setManualLong('');
      }
    } catch (error) {
      alert("❌ Lỗi mạng! Vui lòng thử lại hoặc COPY TỌA ĐỘ gửi SMS cho người thân nhờ báo giúp.");
    } finally {
      setIsSending(false);
    }
  };

  // --- MÀN HÌNH ĐÃ GỬI ---
  if (isSent) {
    return (
        <div className="min-h-screen bg-green-50 p-4 flex flex-col items-center justify-center text-center font-sans">
             <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border-t-8 border-green-500">
                <div className="flex justify-center mb-4 text-green-600 animate-bounce">
                    <CheckCircle size={80} />
                </div>
                <h1 className="text-2xl font-bold text-green-700 mb-2">ĐÃ GỬI TÍN HIỆU!</h1>
                <p className="text-gray-700 mb-6">Vị trí của bạn đã được ghi nhận.</p>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-left text-sm mb-6">
                    <p className="font-bold text-yellow-800 mb-1 flex items-center gap-1">
                        <AlertTriangle size={16} /> LƯU Ý QUAN TRỌNG:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Giữ yên vị trí để dễ tìm kiếm.</li>
                        <li>Tiết kiệm pin tối đa.</li>
                        <li>Chuẩn bị vật nổi/áo phao.</li>
                    </ul>
                </div>
                <button onClick={() => { localStorage.removeItem('sos_sent'); setIsSent(false); }} className="text-sm text-gray-400 underline">Gửi lại / Di chuyển chỗ khác</button>
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <a href="/rescue" className="text-blue-600 font-bold text-sm flex items-center justify-center gap-2">
                        <LifeBuoy size={16} /> Danh sách cứu hộ
                    </a>
                </div>
            </div>
        </div>
    )
  }

  // --- MÀN HÌNH CHÍNH ---
  return (
    <div className="min-h-screen bg-red-50 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl overflow-hidden border-t-8 border-red-600">
        
        <div className="p-4 text-center border-b border-gray-100">
             <h1 className="text-3xl font-bold text-red-600 mb-1">SOS KHẨN CẤP</h1>
             <p className="text-gray-600 text-md">Vì để không ai bị bỏ lại</p>
             <p className="text-gray-600 text-md">Hãy sử dụng khi bạn thật sự cần cứu trợ</p>
             <p className="text-md font-bold text-blue-800 bg-blue-50 inline-block px-3 py-1 rounded-full">Người Việt Thương Người Việt</p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex border-b bg-gray-50">
            <button onClick={() => setMode('SOS')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'SOS' ? 'bg-white text-red-600 border-t-2 border-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <Send size={16}/> CẦN CỨU (SOS)
            </button>
            <button onClick={() => setMode('REPORT_OTHER')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'REPORT_OTHER' ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <UserPlus size={16}/> BÁO HỘ
            </button>
        </div>

        <div className="p-6">
            {mode === 'SOS' ? (
                <>
                    {/* KHUNG HIỂN THỊ TỌA ĐỘ (Black Box) */}
                    <div className="bg-gray-900 rounded-xl p-4 text-center mb-4 relative overflow-hidden group">
                        <p className="text-gray-400 text-xs uppercase font-bold mb-1 flex items-center justify-center gap-1">
                            <MapPin size={12}/> Vị trí hiện tại của bạn
                        </p>
                        
                        {gpsStatus === 'found' && displayCoords ? (
                            <div>
                                <p className="text-white text-xl font-mono font-bold tracking-wider">
                                    {displayCoords.lat.toFixed(5)}, {displayCoords.long.toFixed(5)}
                                </p>
                                <button 
                                    onClick={handleCopyLocation}
                                    className="mt-3 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors w-full"
                                >
                                    <Copy size={16}/> COPY TỌA ĐỘ
                                </button>
                            </div>
                        ) : (
                            <div className="py-2">
                                <p className="text-yellow-400 animate-pulse font-bold text-sm">📡 Đang dò tìm vệ tinh...</p>
                            </div>
                        )}
                    </div>

                    {/* CẢNH BÁO QUAN TRỌNG */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6 rounded-r-lg">
                        <div className="flex gap-2">
                            <AlertTriangle className="text-yellow-600 shrink-0" size={20}/>
                            <div className="text-xs text-gray-700">
                                <p className="font-bold text-yellow-800 mb-1">PHAO CỨU SINH THỨ 2:</p>
                                <p>Hãy <strong>COPY TỌA ĐỘ</strong> ở trên. Nếu mất mạng Internet, hãy gửi tin nhắn SMS chứa tọa độ này cho người thân để họ vào đây báo tin giúp bạn.</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold mb-1">🆘 Bạn nhận được tin nhắn cầu cứu?</p>
                    <p>Hãy nhập SĐT và Tọa độ (Kinh độ, Vĩ độ) chính xác từ tin nhắn SMS vào đây để chuyển tới đội cứu hộ.</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">SỐ ĐIỆN THOẠI {mode === 'SOS' ? '(CỦA BẠN)' : '(NGƯỜI CẦN CỨU)'}</label>
                    <input 
                        type="tel" placeholder="Nhập SĐT..." 
                        className={`w-full p-4 text-lg border-2 rounded-lg focus:outline-none font-bold text-black placeholder:text-gray-400 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-red-500'}`}
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                {mode === 'SOS' && (
                    <input 
                        type="text" placeholder="Họ tên (Tùy chọn)" 
                        className={`w-full p-4 text-lg border-2 rounded-lg focus:outline-none font-bold text-black placeholder:text-gray-400 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-red-500'}`}
                        value={name} onChange={(e) => setName(e.target.value)}
                    />
                )}

                {mode === 'REPORT_OTHER' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">VĨ ĐỘ (LAT)</label>
                            <input 
                                type="number" placeholder="VD: 10.123..." 
                                className={`w-full p-3 border rounded-lg font-mono text-sm ${errors.coords ? 'border-red-500' : 'border-gray-200'}`}
                                value={manualLat} onChange={(e) => setManualLat(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">KINH ĐỘ (LONG)</label>
                            <input 
                                type="number" placeholder="VD: 106.456..." 
                                className={`w-full p-3 border rounded-lg font-mono text-sm ${errors.coords ? 'border-red-500' : 'border-gray-200'}`}
                                value={manualLong} onChange={(e) => setManualLong(e.target.value)}
                            />
                        </div>
                        <p className="col-span-2 text-xs text-gray-400 text-center italic">Nhập chính xác số từ tin nhắn SMS</p>
                    </div>
                )}
            </div>

            <div className="mt-6">
                <button 
                    onClick={handleSendSOS} disabled={isSending}
                    className={`w-full py-4 rounded-xl text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all
                        ${mode === 'SOS' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isSending ? 'ĐANG GỬI...' : (mode === 'SOS' ? 'GỬI TÍN HIỆU NGAY' : 'BÁO TIN HỘ')}
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