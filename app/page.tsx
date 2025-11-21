'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link'; // <--- THÊM DÒNG NÀY
import { Send, MapPin, LifeBuoy } from 'lucide-react';

export default function VictimPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Dùng useRef để lưu tọa độ ngầm, không gây re-render giao diện liên tục
  const coordsRef = useRef<{ lat: number; long: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'finding' | 'found' | 'error'>('finding');

  // Validation State
  const [errors, setErrors] = useState({ phone: '', name: '' });

  // 1. CHẠY NGẦM: Tự động lấy tọa độ ngay khi vào web
  useEffect(() => {
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
          // Không set error ngay để tránh làm người dùng hoang mang, cứ để nó chạy ngầm
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };
    getLoc();
  }, []);

  // 2. Hàm Validate
  const validateInputs = () => {
    let isValid = true;
    let newErrors = { phone: '', name: '' };

    // Validate Phone: Chỉ số, độ dài 10-11 số (VN)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phone) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
      isValid = false;
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = 'SĐT phải là số (10-11 số), không chứa ký tự';
      isValid = false;
    }

    // Validate Name: Chỉ chữ (bao gồm tiếng Việt), max 50 ký tự
    // Regex này chấp nhận tiếng Việt có dấu và khoảng trắng
    const nameRegex = /^[a-zA-ZÀ-ỹ\s]{1,50}$/;
    if (name && !nameRegex.test(name)) { // Tên là tùy chọn, nhưng nếu nhập thì phải đúng
      newErrors.name = 'Tên chỉ chứa chữ cái, không quá 50 ký tự';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 3. Hàm Gửi
const handleSendSOS = async () => {
    if (!validateInputs()) return;
    setIsSending(true);

    // 1. Lấy tọa độ từ biến chạy ngầm
    let finalLat = coordsRef.current?.lat || 0;
    let finalLong = coordsRef.current?.long || 0;

    // 2. Nếu chưa có (vẫn là 0), cố gắng "ép" lấy thêm lần nữa trong 5 giây
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
      } catch (e: any) { // Thêm :any để đọc được code lỗi
        // XỬ LÝ THÔNG BÁO LỖI THÂN THIỆN
        let msg = "Không thể lấy vị trí.";
        if (e.code === 1) msg = "Bạn đã CHẶN quyền truy cập vị trí. Hãy vào Cài đặt -> Cho phép trình duyệt dùng Vị trí.";
        else if (e.code === 2) msg = "GPS bị mất sóng hoặc chưa bật.";
        else if (e.code === 3) msg = "Quá thời gian chờ (Mạng/GPS yếu).";
        
        console.error("GPS Error:", e); // Vẫn log để dev xem
        alert(`⚠️ LỖI ĐỊNH VỊ:\n${msg}\n\nVui lòng kiểm tra lại và thử lại.`);
      }

    }

    // 4. Nếu có tọa độ xịn rồi thì mới gửi
    try {
      await axios.post('https://sos-api-k9iv.onrender.com/api/sos', { 
        phone,
        name,
        lat: finalLat,
        long: finalLong,
      });
      alert("✅ ĐÃ GỬI THÀNH CÔNG! Hãy giữ yên vị trí và chờ cứu hộ.");
      setPhone('');
      setName('');
    } catch (error) {
      alert("❌ Lỗi mạng! Vui lòng kiểm tra 4G/Wifi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-50 p-4 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6 border-t-8 border-red-600">

        {/* Text yêu cầu của bạn */}
        <h1 className="text-3xl font-bold text-red-600 mb-2">SOS KHẨN CẤP</h1>
        <p className="text-gray-600 mb-4">Vì để không ai bị bỏ lại, hãy sử dụng khi bạn thật sự cần cứu trợ</p>
        <p className="text-gray-600 mb-4">Nếu không, hãy giúp mình 1 share để chúng ta cùng nhau làm điều gì đó ý nghĩa</p>
        <p className="text-black font-bold mb-4">Người Việt Thương Người Việt</p>

        {/* Chỉ báo GPS (Nhỏ gọn, không gây cản trở) */}
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
          <MapPin size={14} className={gpsStatus === 'found' ? 'text-green-500' : 'text-gray-400 animate-pulse'} />
          {gpsStatus === 'found' ? 'Đã bắt được vị trí' : 'Đang định vị ngầm...'}
        </div>

        <div className="mb-4">
          <input
            type="tel"
            placeholder="Số điện thoại (Bắt buộc)"
            className={`w-full p-4 text-xl border-2 rounded focus:outline-none font-bold text-black placeholder:text-gray-500 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-red-500'}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        {/* Ô nhập Họ tên */}
        <div>
          <input
            type="text"
            placeholder="Họ và tên (Tùy chọn)"
            className={`w-full p-3 border rounded text-lg font-bold text-black placeholder:text-gray-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSendSOS}
            disabled={isSending}
            className={`w-full py-4 rounded text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2
                ${isSending ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 active:scale-95 transition-transform'}`}
          >
            {isSending ? 'ĐANG GỬI...' : <><Send size={20} /> GỬI TÍN HIỆU NGAY</>}
          </button>
        </div>
      </div>

      <div className="mt-8 text-center pb-4">
        <Link href="/rescue" className="inline-flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full font-bold text-sm border border-blue-200 hover:bg-blue-100 transition">
            <LifeBuoy size={16} />
            Bạn là đội cứu hộ? Bấm vào đây
        </Link>
      </div>

    </div>
  );
}