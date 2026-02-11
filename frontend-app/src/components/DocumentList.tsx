/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import React, { useState } from 'react';
import { Document } from '../services/documentService';
import { useUserTimeZone } from '../hooks/useUserTimeZone';
import { formatDate } from '../utils/datetime';

interface DocumentListProps {
    documents: Document[];
    onUpload?: (file: File) => void;
    onDownload?: (doc: Document) => void;
    onPreview?: (doc: Document) => string; // Returns preview URL
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onUpload, onDownload, onPreview }) => {
    const [filter, setFilter] = useState<'all' | 'uploaded' | 'generated' | 'stored'>('all');
    const [hoveredDoc, setHoveredDoc] = useState<Document | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const timeZone = useUserTimeZone();

    const filteredDocs = documents.filter(doc => filter === 'all' || doc.type === filter);

    const handleMouseMove = (e: React.MouseEvent) => {
        setTooltipPos({ x: e.clientX + 20, y: e.clientY + 20 });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && onUpload) {
            onUpload(e.target.files[0]);
        }
    };

    const getIcon = (fileType: string) => {
        const type = fileType.toLowerCase();
        if (['pdf'].includes(type)) return (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        );
        if (['csv', 'xls', 'xlsx'].includes(type)) return (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        );
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return (
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        );
        return (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        );
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Reset pagination when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
    const currentDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="glass-panel mt-8 relative">
            {/* Tooltip Preview */}
            {hoveredDoc && onPreview && (
                <div 
                    className="fixed z-50 p-2 bg-surface-1 border border-white/10 rounded-lg shadow-xl pointer-events-none"
                    style={{ left: tooltipPos.x, top: tooltipPos.y, maxWidth: '300px' }}
                >
                    <div className="w-64 h-48 bg-black/20 rounded overflow-hidden flex items-center justify-center">
                        {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(hoveredDoc.fileType.toLowerCase()) ? (
                            <img src={onPreview(hoveredDoc)} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                             <div className="flex flex-col items-center text-text-secondary">
                                {getIcon(hoveredDoc.fileType)}
                                <span className="mt-2 text-xs">Preview not available</span>
                             </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold m-0">Documents & Files</h3>
                    <span className="text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                        {filteredDocs.length}
                    </span>
                </div>
                <div className="flex bg-bg-secondary/30 p-1 rounded-lg">
                    {(['all', 'uploaded', 'generated', 'stored'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                                filter === t 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {filteredDocs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg bg-white/5">
                    <div className="mb-3 text-text-secondary">
                        <svg className="w-10 h-10 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-text-secondary mb-4">No documents found.</p>
                    {onUpload && (
                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm">
                            Upload Document
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="overflow-hidden rounded-lg border border-white/5">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-text-secondary text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3 text-right">Size</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {currentDocs.map((doc) => (
                                    <tr 
                                        key={doc.id} 
                                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                                        onMouseEnter={() => setHoveredDoc(doc)}
                                        onMouseLeave={() => setHoveredDoc(null)}
                                        onMouseMove={handleMouseMove}
                                        onClick={() => onDownload?.(doc)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {getIcon(doc.fileType)}
                                                <span className="font-medium text-text-primary group-hover:text-primary transition-colors">
                                                    {doc.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                                                ${doc.type === 'generated' ? 'bg-purple-500/10 text-purple-400' : 
                                                  doc.type === 'uploaded' ? 'bg-blue-500/10 text-blue-400' : 
                                                  'bg-gray-500/10 text-gray-400'}`}>
                                                {doc.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">
                                            {formatDate(doc.date, timeZone)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-text-secondary font-mono text-xs">
                                            {doc.size}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                // Click handled by row, prevent propagation if needed
                                                onClick={(e) => { e.stopPropagation(); onDownload?.(doc); }}
                                                className="text-text-secondary hover:text-primary p-1 rounded-full hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                                                title="Download"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-2">
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
            )}
            
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
            />

            {filteredDocs.length > 0 && onUpload && (
                <div className="mt-4 flex justify-end">
                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-sm text-text-secondary hover:text-primary">
                        + Upload new document
                    </button>
                </div>
            )}
        </div>
    );
};
