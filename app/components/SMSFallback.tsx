'use client';
import { MessageSquare, Smartphone, ArrowLeft, WifiOff } from 'lucide-react';

interface SMSFallbackProps {
  phone: string;
  name: string;
  lat: number;
  long: number;
  onBack: () => void; // Hàm quay lại để thử gửi lại bằng mạng
}

export default function SMSFallback({ phone, name, lat, long, onBack }: SMSFallbackProps) {
  
  const handleSendSMS = () => {
    // Số tổng đài cứu hộ (CẦN THAY ĐỔI SỐ THỰC TẾ Ở ĐÂY)
    const HOTLINE = "0987654321"; 
    
    // Nội dung tin nhắn
    const message = `SOS! Toi la ${name}. SDT: ${phone}. Vi tri: ${lat},${long}. Can cuu gap!`;
    
    // Tạo link SMS (tương thích cả Android và iOS)
    // Android dùng ?body=, iOS đôi khi cần &body= nhưng ?body= là chuẩn chung
    const smsLink = `sms:${HOTLINE}?&body=${encodeURIComponent(message)}`;
    
    // Mở app tin nhắn
    window.location.href = smsLink;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header báo lỗi mạng */}
        <div className="bg-yellow-500 p-6 text-center text-white">
            <div className="flex justify-center mb-2 animate-pulse">
                <WifiOff size={48} />
            </div>
            <h2 className="text-2xl font-bold">MẤT KẾT NỐI INTERNET!</h2>
            <p className="text-yellow-100 text-sm">Không thể gửi dữ liệu qua Wifi/4G.</p>
        </div>

        <div className="p-6 text-center">
            <p className="text-gray-700 mb-6 text-lg">
                Đừng lo lắng! Hãy chuyển sang gửi tin nhắn <strong>SMS</strong> (sóng điện thoại thường). Hệ thống đã soạn sẵn nội dung kèm tọa độ cho bạn.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 text-left">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Nội dung tin nhắn:</p>
                <p className="font-mono text-sm text-gray-800 break-words">
                    SOS! Toi la {name}. SDT: {phone}. Vi tri: {lat.toFixed(5)},{long.toFixed(5)}...
                </p>
            </div>

            <button 
                onClick={handleSendSMS}
                className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-xl shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 active:scale-95 transition-all mb-4"
            >
                <MessageSquare size={24} /> GỬI SMS NGAY
            </button>

            <button 
                onClick={onBack}
                className="w-full py-3 rounded-xl bg-white text-gray-500 font-bold border border-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50"
            >
                <ArrowLeft size={18} /> Thử lại bằng Internet
            </button>
        </div>
      </div>
      
      <p className="mt-6 text-gray-400 text-xs text-center max-w-xs">
        Lưu ý: Gửi SMS có thể tốn phí viễn thông tuỳ nhà mạng.
      </p>
    </div>
  );
}