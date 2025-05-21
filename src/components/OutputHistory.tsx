import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon, CheckIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { GeneratedOutput } from '../types';

const OutputHistory: React.FC = () => {
  const { generatedOutputs, refetchHistory } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (generatedOutputs.length <= 1) return null;

  // Exclude the most recent output (it's already displayed in the main output area)
  const historyItems = generatedOutputs.slice(1);

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleSetActive = async (analysisId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('template_versions')
        .update({ is_active: true })
        .eq('id', analysisId);

      if (updateError) throw updateError;
      
      // 重新加载项目历史
      await refetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置活动版本失败');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDelete = async (analysisId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('template_versions')
        .delete()
        .eq('id', analysisId)
        .eq('is_active', false); // 只允许删除非活动版本

      if (deleteError) throw deleteError;
      
      // 重新加载项目历史
      await refetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除版本失败');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <button
        className="w-full flex justify-between items-center px-6 py-4 text-left font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 border-b border-gray-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Previous Outputs ({historyItems.length})</span>
        {isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div className="divide-y divide-gray-200">
          {error && (
            <div className="px-6 py-2 bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}
          {historyItems.map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-800">{item.promptTitle}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-500">
                      {format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm')}
                    </p>
                    {item.is_active && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                        当前版本
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!item.is_active && (
                    <>
                      <button
                        onClick={() => handleSetActive(item.id)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="设为当前版本"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="删除版本"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => toggleExpand(item.id)}
                  >
                    {expandedItem === item.id ? (
                      <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Input:</span> {truncateText(item.input)}
                </p>
              </div>

              {expandedItem === item.id && (
                <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.output}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutputHistory;