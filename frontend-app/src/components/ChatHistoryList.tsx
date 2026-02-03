import React, { useState } from 'react';
import { HistoryItem } from '../services/aiService';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { formatDateTime } from '../utils/datetime';

interface ChatHistoryListProps {
  items: HistoryItem[];
}

export const ChatHistoryList: React.FC<ChatHistoryListProps> = ({ items }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const timeZone = useUserTimeZone();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset pagination when items change
  React.useEffect(() => {
    setCurrentPage(1);
    setExpandedIndex(null);
  }, [items]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedIndex(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="glass-panel text-center py-8 text-text-secondary mt-8">
        <h3 className="mb-2 text-xl font-semibold">Conversation History</h3>
        <p>No conversation history yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel mt-8">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold m-0">Conversation History</h3>
          <span className="text-xs text-text-secondary">
              {items.length} conversations
          </span>
      </div>
      <div className="space-y-4">
        {currentItems.map((item, index) => (
          <div 
            key={index} 
            className={`border border-white/5 rounded-lg overflow-hidden transition-all duration-200 ${expandedIndex === index ? 'bg-white/5' : 'hover:bg-white/5'}`}
          >
            <button 
              onClick={() => toggleExpand(index)}
              className="w-full text-left p-4 flex justify-between items-start"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary mb-1">
                  {item.timestamp ? formatDateTime(item.timestamp, timeZone) : 'Just now'}
                </p>
                <p className="font-medium truncate pr-4 text-text-primary">
                  {item.prompt}
                </p>
              </div>
              <div className="text-text-secondary mt-1">
                 {expandedIndex === index ? '−' : '+'}
              </div>
            </button>
            
            {expandedIndex === index && (
              <div className="p-4 pt-0 border-t border-white/5 bg-black/10">
                <div className="mb-4 pt-4">
                  <p className="text-xs uppercase tracking-wider text-text-secondary mb-1 font-semibold">You asked:</p>
                  <p className="text-text-primary whitespace-pre-wrap text-sm">{item.prompt}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-secondary mb-1 font-semibold">Assistant replied:</p>
                  <p className="text-text-primary whitespace-pre-wrap text-sm opacity-90">{item.response}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
              <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-ghost btn-sm text-xs disabled:opacity-30"
              >
                  Previous
              </button>
              <span className="text-xs text-text-secondary">
                  Page {currentPage} of {totalPages}
              </span>
              <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost btn-sm text-xs disabled:opacity-30"
              >
                  Next
              </button>
          </div>
      )}
    </div>
  );
};
