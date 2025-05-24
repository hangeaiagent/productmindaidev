import React from 'react';
import { Loader } from 'lucide-react';

interface SafeLoaderProps {
  className?: string;
  size?: number;
}

// 安全的Loader组件，避免DOM更新错误
export const SafeLoader: React.FC<SafeLoaderProps> = ({ className = '', size = 16 }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    // 返回一个占位元素，避免布局跳动
    return <span className={className} style={{ width: size, height: size, display: 'inline-block' }} />;
  }

  return <Loader className={className} size={size} />;
}; 