import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackgroundPreview() {
  const navigate = useNavigate();

  return (
    <div 
      className="relative w-full h-screen bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/neural-bg.png')" }}
    >
      <div className="absolute top-8 left-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-black/70 transition-colors shadow-lg"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Overlay to simulate how cards will look on top */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[250px] rounded-3xl bg-black/40 backdrop-blur-md border border-orange-500/20 shadow-2xl flex flex-col items-center justify-center p-8">
          <h2 className="text-orange-400 font-semibold tracking-wider text-sm mb-2">Sample Dashboard Card</h2>
          <p className="text-gray-300 text-xs text-center">
            This card is placed on top of the generated neural network background to help you visualize the final integration.
          </p>
        </div>
      </div>
    </div>
  );
}
