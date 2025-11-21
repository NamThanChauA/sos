import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
}

export default function RescueModal({ isOpen, onClose, onConfirm }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
          <h3 className="font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle size={20} /> XÁC NHẬN CỨU HỘ
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 text-sm italic mb-6 leading-relaxed text-justify border-l-4 border-gray-300 pl-3">
            "Tôi không dám chắc, nhưng nếu bạn không phải cứu hộ. Xin đừng phá hoại, hãy giúp cho nụ cười của những người bạn không quen biết được nở rộ vào ngày nắng lên."
          </p>

          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const code = (form.elements.namedItem('code') as HTMLInputElement).value;
            onConfirm(code);
          }}>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Mã Đội cứu hộ</label>
            <input 
              name="code" type="text" placeholder="Nhập mã..." autoFocus
              className="w-full p-3 border-2 text-gray-600 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg text-center mb-6"
            />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onClose} className="py-3 rounded-lg font-bold text-gray-600 bg-gray-100">Hủy bỏ</button>
              <button type="submit" className="py-3 rounded-lg font-bold text-white bg-blue-600 shadow-lg active:scale-95">Xác nhận</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}