import { MapPin, Copy, AlertTriangle } from 'lucide-react';

interface Props {
  lat: number;
  long: number;
  loading: boolean;
}

export default function LocationBox({ lat, long, loading }: Props) {
  const handleCopy = () => {
    if (loading) return;
    const text = `${lat},${long}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert("Đã copy tọa độ!"));
    } else {
      alert(`Tọa độ: ${text}`);
    }
  };

  return (
    <>
      <div className="bg-gray-900 rounded-xl p-4 text-center mb-4 relative overflow-hidden">
        <p className="text-gray-400 text-xs uppercase font-bold mb-1 flex items-center justify-center gap-1">
          <MapPin size={12}/> Vị trí hiện tại của bạn
        </p>
        
        {!loading ? (
          <div>
            <p className="text-white text-xl font-mono font-bold tracking-wider">
              {lat.toFixed(5)}, {long.toFixed(5)}
            </p>
            <button 
              onClick={handleCopy}
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

      {/* Cảnh báo Phao cứu sinh thứ 2 */}
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
  );
}