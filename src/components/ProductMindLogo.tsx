import React from "react";
import { Brain, Sparkles } from 'lucide-react';

interface ProductMindLogoProps {
  size?: number;
  className?: string;
}

const ProductMindLogo: React.FC<ProductMindLogoProps> = ({ size = 40, className = "" }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    {/* 背景圆形渐变 */}
    <div 
      className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl shadow-lg"
      style={{ 
        background: 'linear-gradient(135deg, #4F8CFF 0%, #A259FF 100%)',
        borderRadius: '20%'
      }}
    >
      {/* 内层半透明背景 */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30"></div>
      
      {/* 主图标 - Brain */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Brain 
          className="text-white relative z-10" 
          size={size * 0.5}
          strokeWidth={2}
        />
      </div>
      
      {/* 装饰 - Sparkles */}
      <Sparkles 
        className="text-yellow-300 absolute animate-pulse" 
        size={size * 0.25}
        style={{
          top: '-2px',
          right: '-2px'
        }}
      />
    </div>
  </div>
);

export default ProductMindLogo; 