import { Phone, Navigation, CheckCircle, Package, HeartPulse } from 'lucide-react';

interface Victim {
  id: number;
  phone: string;
  name: string;
  lat: number;
  long: number;
  created_at: string;
  status: string;
  type?: string; // 'SOS' | 'SUPPLY'
  distance?: number;
}

interface Props {
  data: Victim;
  onMarkDone: (id: number) => void;
}

export default function VictimCard({ data, onMarkDone }: Props) {
  // Format khoảng cách
  const distStr = data.distance 
    ? (data.distance < 1 ? `${Math.round(data.distance * 1000)}m` : `${data.distance.toFixed(1)}km`)
    : '?';

  const isSOS = data.type === 'SOS' || !data.type; // Mặc định là SOS nếu không có type

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 relative ${isSOS ? 'border-red-500' : 'border-orange-500'}`}>
      {/* Badge Loại hình */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${isSOS ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
        {isSOS ? <><HeartPulse size={12}/> KHẨN CẤP</> : <><Package size={12}/> LƯƠNG THỰC</>}
      </div>

      <div className="flex justify-between items-start mb-3 pr-20">
        <div>
          <div className="font-bold text-lg text-black">{data.name || 'Người dân'}</div>
          <div className="font-mono text-gray-600 text-lg font-bold tracking-wider">{data.phone}</div>
          <div className="text-xs text-gray-400 mt-1">
            {data.created_at ? new Date(data.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}
          </div>
        </div>
        <div className="text-right min-w-[60px] absolute right-4 top-10">
          <span className={`block text-2xl font-bold ${data.distance && data.distance < 1 ? 'text-green-600' : 'text-red-600'}`}>
            {distStr}
          </span>
          <span className="text-xs text-gray-500">cách bạn</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <a href={`tel:${data.phone}`} className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-700 font-bold rounded-lg active:scale-95 transition">
          <Phone size={18} /> GỌI
        </a>
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.long}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-3 bg-blue-100 text-blue-700 font-bold rounded-lg active:scale-95 transition"
        >
          <Navigation size={18} /> CHỈ ĐƯỜNG
        </a>
      </div>

      <button 
        onClick={() => onMarkDone(data.id)}
        className="w-full mt-3 py-3 bg-gray-50 text-gray-500 font-bold rounded-lg border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-200 transition text-sm"
      >
        <CheckCircle size={16} /> ĐÁNH DẤU ĐÃ XONG
      </button>
    </div>
  );
}