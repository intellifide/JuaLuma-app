import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { widgetService } from '../services/widgets';
import { Widget, PaginatedResponse } from '../types';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = ["All", "Financial", "Productivity", "Analysis", "Utility", "General"];

export const Marketplace = () => {
    const { profile } = useAuth();
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 9;

    const hasPro = profile?.subscriptions?.some(s =>
        s.status === 'active' && ['pro', 'ultimate'].includes(s.plan || '')
    );

    useEffect(() => {
        const fetchWidgets = async () => {
            setLoading(true);
            try {
                const categoryFilter = selectedCategory === "All" ? undefined : selectedCategory.toLowerCase();
                const searchFilter = searchTerm.length > 0 ? searchTerm : undefined;

                const data = await widgetService.list(categoryFilter, searchFilter, page, pageSize);
                const responseData = data as unknown as (PaginatedResponse<Widget> | Widget[]);
                const items = Array.isArray(responseData) ? responseData : responseData.data || [];
                const total = Array.isArray(responseData) ? responseData.length : (responseData.total || items.length);
                setWidgets(items);
                setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
            } catch (error) {
                console.error("Failed to load widgets", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search slightly
        const timeoutId = setTimeout(() => {
            fetchWidgets();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [selectedCategory, searchTerm, page]); // Added 'page' to dependencies

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        setPage(1); // Reset to page 1 on category change
    };

    const handleDownload = async (id: string, isOwner: boolean) => {
        if (!hasPro && !isOwner) {
            // Should be blocked by UI, but double check
            window.alert("Pro subscription required to download.");
            return;
        }

        try {
            await widgetService.download(id);
            setWidgets(prev => prev.map(w => w.id === id ? { ...w, downloads: w.downloads + 1 } : w));
            window.alert("Widget downloaded successfully!");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            window.alert("Download failed: " + message);
        }
    };

    return (
        <div className="container py-16">
            <h1 className="text-center mb-4">JuaLuma Marketplace</h1>
            <p className="text-center text-lg text-text-secondary mb-12 max-w-[700px] mx-auto">
                Discover curated widgets and tools from developers to enhance your financial management experience.
            </p>

            {/* Developer Banner CTA */}
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg mb-12 text-center">
                <strong>Building widgets?</strong> Visit the <Link to="/developer-marketplace" className="font-semibold underline">Developer Marketplace</Link> to create and submit your own widgets for distribution.
            </div>

            {/* Filters & Search */}
            <div className="glass-panel mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-primary text-white'
                                : 'bg-white/5 hover:bg-white/10 text-text-secondary'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="w-full md:w-auto relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
                    <input
                        type="text"
                        placeholder="Search widgets..."
                        className="input pl-10 w-full md:w-64"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            {/* Widgets List */}
            {loading ? (
                <div className="text-center py-12 text-text-muted">Loading available widgets...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {widgets.map(widget => {
                        const isOwner = profile?.uid === widget.developer_uid;
                        const canDownload = hasPro || isOwner;

                        return (
                            <div key={widget.id} className="card flex flex-col relative overflow-hidden group">
                                <div className="mb-4 border-b border-white/10 pb-4">
                                    <h3 className="m-0 truncate" title={widget.name}>{widget.name}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <span className="badge bg-bg-secondary text-text-primary capitalize">{widget.category}</span>
                                        <span className="badge bg-bg-secondary text-text-primary flex items-center gap-1">
                                            {widget.rating_avg > 0 ? widget.rating_avg.toFixed(1) : "New"} ⭐
                                            ({widget.rating_count})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="line-clamp-3 text-text-secondary">{widget.description || "No description provided."}</p>
                                    <div className="text-sm text-text-muted mt-4 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Downloads:</span>
                                            <span className="font-mono text-text-primary">{widget.downloads.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Version:</span>
                                            <span className="font-mono text-text-primary">{widget.version}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Updated:</span>
                                            <span>{new Date(widget.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 relative z-10">
                                    <button
                                        className={`btn w-full transition-colors ${canDownload ? 'btn-outline hover:bg-white/5' : 'btn-disabled opacity-50 cursor-not-allowed'}`}
                                        onClick={() => canDownload && handleDownload(widget.id, isOwner)}
                                        disabled={!canDownload}
                                    >
                                        {canDownload ? 'Download / Install' : 'Pro Required'}
                                    </button>
                                </div>

                                {/* Paywall Overlay for Non-Pro */}
                                {!canDownload && (
                                    <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 p-4 text-center">
                                        <div className="text-xl font-bold mb-2">Pro Feature</div>
                                        <p className="text-sm text-text-secondary mb-4">Upgrade to Pro to download and use this widget.</p>
                                        <Link to="/pricing" className="btn btn-primary btn-sm">Upgrade Now</Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {widgets.length === 0 && (
                        <div className="col-span-full text-center py-16 glass-panel border border-dashed border-white/10">
                            <p className="text-xl text-text-secondary mb-2">No widgets found matching your criteria.</p>
                            <p className="text-text-muted">Try a different category or search term.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex justify-center gap-2 mb-16">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="flex items-center px-4 text-sm text-text-secondary">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Developer Info */}
            <div className="glass-panel">
                <h2 className="text-center mb-8">For Developers</h2>
                <div className="max-w-[800px] mx-auto">
                    <p className="mb-4">
                        Interested in developing widgets for the JuaLuma Marketplace? We&apos;re building a developer program that will allow you to create and distribute widgets that integrate with the JuaLuma platform.
                    </p>
                    <p className="mb-4">
                        Developers earn revenue based on user engagement (downloads) and verified ratings. All widgets must comply with our Developer Agreement and platform guidelines.
                    </p>
                    <p className="mb-4">
                        The Marketplace is currently in development. If you&apos;re interested in becoming a developer partner, please contact us for more information.
                    </p>
                    <div className="text-center mt-12">
                        <Link to="/developer-marketplace" className="btn btn-primary">Go to Developer Marketplace</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
