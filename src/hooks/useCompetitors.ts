import { useState, useEffect, useCallback } from "react";
import { Competitor, SuggestedCompetitor } from "@/types/competitors";

export function useCompetitors(entityId: string) {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedCompetitor[]>([]);
    const [suggestionsTotal, setSuggestionsTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCompetitors = useCallback(async () => {
        try {
            setError(null);

            // First check if entity exists
            const entityRes = await fetch(`/api/entities/${entityId}`);
            if (!entityRes.ok) {
                if (entityRes.status === 404) {
                    setError("Entity not found. It may have been deleted. Please switch to another entity.");
                    return;
                }
            }

            const res = await fetch(`/api/entities/${entityId}/competitors`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch competitors");
            }

            setCompetitors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching competitors:", error);
            setError("Failed to load competitors. Please try again.");
            setCompetitors([]);
        } finally {
            setLoading(false);
        }
    }, [entityId]);

    const fetchSuggestions = useCallback(async () => {
        try {
            setLoadingSuggestions(true);
            const res = await fetch(`/api/entities/${entityId}/suggestions`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions ?? data);
                setSuggestionsTotal(data.totalCount ?? (data.suggestions ?? data).length);
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        } finally {
            setLoadingSuggestions(false);
        }
    }, [entityId]);

    useEffect(() => {
        if (entityId) {
            fetchCompetitors();
            fetchSuggestions();
        }
    }, [entityId, fetchCompetitors, fetchSuggestions]);

    const addCompetitors = async (names: string) => {
        try {
            const res = await fetch(`/api/entities/${entityId}/competitors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ names }),
            });

            if (res.ok) {
                const data = await res.json();
                fetchCompetitors();
                return { success: true, jobId: data.jobId };
            }
            return { success: false };
        } catch (error) {
            console.error("Error creating competitors:", error);
            return { success: false };
        }
    };

    const updateCompetitor = async (id: string, data: { name: string; website: string; aliases: string[] }) => {
        try {
            const res = await fetch(`/api/competitors/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setCompetitors(prev => prev.map(c =>
                    c.id === id ? { ...c, ...data } : c
                ));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating competitor:", error);
            return false;
        }
    };

    const deleteCompetitor = async (id: string) => {
        try {
            const res = await fetch(`/api/competitors/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setCompetitors(prev => prev.filter(c => c.id !== id));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error deleting competitor:", error);
            return false;
        }
    };

    const untrackCompetitor = async (competitor: Competitor) => {
        // Optimistic update
        setCompetitors(prev => prev.filter(c => c.id !== competitor.id));

        // Find matching suggestion to update status
        const suggestion = suggestions.find(s => s.name.toLowerCase() === competitor.name.toLowerCase());

        if (suggestion) {
            setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: 'untracked' } : s));
            try {
                await fetch(`/api/suggestions/${suggestion.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "untracked" }),
                });
            } catch (err) {
                console.error("Error updating suggestion status:", err);
            }
        } else {
            // Create a new suggestion record so it appears in Untracked list
            const tempId = `temp-${Date.now()}`;
            const newSuggestion = {
                id: tempId,
                name: competitor.name,
                website: competitor.website,
                status: 'untracked'
            };
            setSuggestions(prev => [newSuggestion, ...prev]);

            try {
                const res = await fetch(`/api/entities/${entityId}/suggestions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: competitor.name,
                        website: competitor.website,
                        status: 'untracked'
                    })
                });

                if (res.ok) {
                    const savedSuggestion = await res.json();
                    setSuggestions(prev => prev.map(s => s.id === tempId ? savedSuggestion : s));
                }
            } catch (err) {
                console.error("Error creating suggestion:", err);
                setSuggestions(prev => prev.filter(s => s.id !== tempId));
            }
        }

        try {
            const res = await fetch(`/api/competitors/${competitor.id}`, { method: "DELETE" });
            if (res.ok) {
                const data = await res.json();
                return { success: true, jobId: data.jobId };
            }
            return { success: false };
        } catch (error) {
            console.error("Error deleting competitor:", error);
            fetchCompetitors(); // Rollback
            return { success: false };
        }
    };

    const addSuggestion = async (suggestion: SuggestedCompetitor) => {
        try {
            // 1. Add as a tracked competitor
            const res = await fetch(`/api/entities/${entityId}/competitors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    names: suggestion.name,
                    competitors: [{
                        name: suggestion.name,
                        website: suggestion.website
                    }]
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // 2. Mark suggestion as tracked
                await fetch(`/api/suggestions/${suggestion.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "tracked" }),
                });

                fetchCompetitors();
                fetchSuggestions();
                return { success: true, jobId: data.jobId };
            }
            return { success: false };
        } catch (error) {
            console.error("Error adding suggestion:", error);
            return { success: false };
        }
    };

    const dismissSuggestion = async (suggestion: SuggestedCompetitor) => {
        // Optimistic
        setSuggestions(prev => prev.map(s =>
            s.id === suggestion.id ? { ...s, status: 'untracked' } : s
        ));

        try {
            await fetch(`/api/suggestions/${suggestion.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "untracked" }),
            });
            return true;
        } catch (error) {
            console.error("Error dismissing suggestion:", error);
            fetchSuggestions(); // Rollback
            return false;
        }
    };

    const removeSuggestion = async (id: string) => {
        try {
            const res = await fetch(`/api/suggestions/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setSuggestions(prev => prev.filter(s => s.id !== id));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error removing suggestion:", error);
            return false;
        }
    };

    return {
        competitors,
        suggestions,
        suggestionsTotal,
        loading,
        loadingSuggestions,
        error,
        fetchCompetitors,
        fetchSuggestions,
        addCompetitors,
        updateCompetitor,
        deleteCompetitor,
        untrackCompetitor,
        addSuggestion,
        dismissSuggestion,
        removeSuggestion
    };
}
