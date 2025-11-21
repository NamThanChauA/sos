import { MapPin } from 'lucide-react';

interface Props {
  status: 'finding' | 'found' | 'error';
}

export default function GPSIndicator({ status }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4 text-xs text-gray-500 bg-gray-100 p-2 rounded-lg">
      <MapPin 
        size={14} 
        className={status === 'found' ? 'text-green-600' : 'text-gray-400 animate-pulse'} 
      />
      {status === 'found' 
        ? 'Đã bắt được vị trí chính xác' 
        : status === 'error' 
          ? 'Không lấy được vị trí (Hãy bật GPS)' 
          : 'Đang định vị ngầm...'}
    </div>
  );
}