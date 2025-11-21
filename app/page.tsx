'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Send, MapPin, LifeBuoy, CheckCircle, AlertTriangle } from 'lucide-react';

export default function VictimPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // State mới: Kiểm tra xem đã gửi tin chưa (để hiện màn hình xanh)
  const [isSent, setIsSent] = useState(false);

  // Dùng useRef để lưu tọa độ ngầm
  const coordsRef = useRef<{ lat: number; long: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'finding' | 'found' | 'error'>('finding');
  const [errors, setErrors] = useState({ phone: '', name: '' });

  // 1. CHECK TRẠNG THÁI GỬI & LẤY GPS NGẦM
  useEffect(() => {
    // Kiểm tra localStorage xem máy này đã gửi SOS chưa
    const sentStatus = localStorage.getItem('sos_sent');
    if (sentStatus === 'true') {
        setIsSent(true);
    }

    // Logic lấy GPS ngầm ngay khi vào web
    const getLoc = () => {
      if (!navigator.geolocation) {
        setGpsStatus('error');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coordsRef.current = { lat: pos.coords.latitude, long: pos.coords.longitude };
          setGpsStatus('found');
        },
        (err) => {
          // Không làm gì để tránh hoang mang, sẽ ép lấy lại khi bấm Gửi
          console.warn("GPS Background Error:", err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };
    getLoc();
  }, []);

  // 2. Validate Form
  const validateInputs = () => {
    let isValid = true;
    let newErrors = { phone: '', name: '' };

    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phone) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
      isValid = false;
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = 'SĐT phải là số (10-11 số)';
      isValid = false;
    }

    const nameRegex = /^[a-zA-ZÀ-ỹ\s]{1,50}$/;
    if (name && !nameRegex.test(name)) {
      newErrors.name = 'Tên chỉ chứa chữ cái';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 3. Xử lý Gửi SOS
  const handleSendSOS = async () => {
    if (!validateInputs()) return;
    setIsSending(true);

    // Lấy tọa độ từ biến chạy ngầm
    let finalLat = coordsRef.current?.lat || 0;
    let finalLong = coordsRef.current?.long || 0;

    // Nếu chưa có (vẫn là 0), cố gắng "ép" lấy thêm lần nữa trong 5 giây
    if (finalLat === 0 || finalLong === 0) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 5000, 
            maximumAge: 0 
          });
        });
        finalLat = pos.coords.latitude;
        finalLong = pos.coords.longitude;
      } catch (e: any) {
        let msg = "Không thể lấy vị trí.";
        if (e.code === 1) msg = "Bạn đã CHẶN quyền truy cập vị trí. Hãy vào Cài đặt -> Cho phép.";
        else if (e.code === 2) msg = "GPS yếu hoặc chưa bật.";
        
        alert(`⚠️ LỖI ĐỊNH VỊ:\n${msg}\n\nVui lòng bật GPS trên điện thoại và thử lại.`);
        setIsSending(false);
        return; // Dừng ngay nếu không có tọa độ
      }
    }

    try {
      // Gửi lên Server Render
      await axios.post('https://sos-api-k9iv.onrender.com/api/sos', { 
        phone,
        name,
        lat: finalLat,
        long: finalLong,
      });
      
      // Gửi thành công -> Lưu vào LocalStorage
      localStorage.setItem('sos_sent', 'true');
      setIsSent(true); // Chuyển sang màn hình Xanh

    } catch (error) {
      alert("❌ Lỗi mạng! Vui lòng kiểm tra 4G/Wifi.");
    } finally {
      setIsSending(false);
    }
  };

  // ------------------------------------------------
  // MÀN HÌNH 1: NẾU ĐÃ GỬI THÀNH CÔNG (Màu Xanh)
  // ------------------------------------------------
  if (isSent) {
    return (
        <div className="min-h-screen bg-green-50 p-4 flex flex-col items-center justify-center text-center font-sans">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl border-t-8 border-green-500">
                <div className="flex justify-center mb-4 text-green-600 animate-bounce">
                    <CheckCircle size={80} />
                </div>
                <h1 className="text-2xl font-bold text-green-700 mb-2">ĐÃ GỬI TÍN HIỆU!</h1>
                <p className="text-gray-700 mb-4 font-bold text-lg">
                    Đội cứu hộ đã nhận được vị trí của bạn.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-left">
                    <div className="flex items-center gap-2 font-bold text-yellow-800 mb-2">
                        <AlertTriangle size={18} /> LỜI KHUYÊN:
                    </div>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                        <li><strong>Giữ yên vị trí</strong> để cứu hộ dễ tìm.</li>
                        <li>Tiết kiệm pin điện thoại tối đa.</li>
                        <li>Chuẩn bị vật nổi/áo phao nếu nước dâng.</li>
                    </ul>
                </div>

                <button 
                    onClick={() => {
                        if(confirm("Bạn có chắc muốn gửi tín hiệu mới? Chỉ làm điều này nếu bạn đã di chuyển sang chỗ khác.")) {
                            localStorage.removeItem('sos_sent');
                            setIsSent(false);
                            setPhone('');
                        }
                    }}
                    className="text-sm text-gray-400 underline hover:text-gray-600 py-2"
                >
                    Tôi đã di chuyển / Muốn gửi lại
                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                    <Link href="/rescue" className="text-blue-600 font-bold text-sm flex items-center justify-center gap-2">
                        <LifeBuoy size={16} /> Xem danh sách cứu hộ
                    </Link>
                </div>
            </div>
        </div>
    )
  }

  // ------------------------------------------------
  // MÀN HÌNH 2: FORM GỬI SOS (Màu Đỏ - Mặc định)
  // ------------------------------------------------
  return (
    <div className="min-h-screen bg-red-50 p-4 flex flex-col justify-between font-sans">
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6 border-t-8 border-red-600">

            <h1 className="text-3xl font-bold text-red-600 mb-2 text-center">SOS KHẨN CẤP</h1>
            <div className="text-center space-y-2 mb-6">
                <p className="text-gray-600">Vì để không ai bị bỏ lại, hãy sử dụng khi bạn thật sự cần cứu trợ.</p>
                <p className="text-gray-600 text-sm italic">Nếu không, hãy giúp mình 1 share để chúng ta cùng nhau làm điều gì đó ý nghĩa.</p>
                <p className="text-blue-800 font-bold uppercase bg-blue-50 py-2 rounded mt-2 text-sm">Người Việt Thương Người Việt</p>
            </div>

            {/* Chỉ báo GPS */}
            <div className="flex items-center justify-center gap-2 mb-4 text-xs text-gray-500 bg-gray-100 p-2 rounded-lg">
                <MapPin size={14} className={gpsStatus === 'found' ? 'text-green-600' : 'text-gray-400 animate-pulse'} />
                {gpsStatus === 'found' ? 'Đã bắt được vị trí chính xác' : 'Đang định vị ngầm...'}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">SỐ ĐIỆN THOẠI (BẮT BUỘC)</label>
                    <input 
                    type="tel" 
                    placeholder="Nhập SĐT của bạn..." 
                    className={`w-full p-4 text-xl border-2 rounded-lg focus:outline-none font-bold text-black placeholder:text-gray-400 shadow-sm ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-red-500'}`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1 ml-1">{errors.phone}</p>}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">HỌ VÀ TÊN (TÙY CHỌN)</label>
                    <input 
                    type="text" 
                    placeholder="Ví dụ: Nguyễn Văn A..." 
                    className={`w-full p-3 border rounded-lg text-lg font-bold text-black placeholder:text-gray-400 shadow-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1 ml-1">{errors.name}</p>}
                </div>
            </div>

            <div className="mt-8">
                <button 
                onClick={handleSendSOS}
                disabled={isSending}
                className={`w-full py-4 rounded-xl text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2 transform transition-all
                    ${isSending ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 active:scale-95 shadow-red-200'}`}
                >
                {isSending ? 'ĐANG GỬI...' : <><Send size={24} /> GỬI TÍN HIỆU NGAY</>}
                </button>
            </div>
        </div>
      </div>

      {/* Footer Link Cứu Hộ */}
      <div className="mt-8 text-center pb-4">
        <Link href="/rescue" className="inline-flex items-center gap-2 text-blue-600 bg-white px-5 py-3 rounded-full font-bold text-sm shadow-md border border-blue-100 hover:bg-blue-50 transition">
            <LifeBuoy size={18} />
            Bạn là đội cứu hộ? Bấm vào đây
        </Link>
      </div>

    </div>
  );
}