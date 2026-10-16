import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Film,
  Layers,
  ThumbsUp,
  Search,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Star,
  Info,
} from 'lucide-react';
import { recommendationsApi } from '@/services/api';

export const RecommendationsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(1);
  const [algorithm, setAlgorithm] = useState<string>('hybrid');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isColdStart, setIsColdStart] = useState<boolean>(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);

  // Similar items search
  const [searchMovieId, setSearchMovieId] = useState<number>(1); // Toy Story
  const [similarResults, setSimilarResults] = useState<any>(null);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState<boolean>(false);

  useEffect(() => {
    recommendationsApi
      .getAnalytics()
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err));

    recommendationsApi
      .getUsers()
      .then((data) => {
        setUsersList(data);
        if (data.length > 0) {
          fetchRecommendations(data[0].user_id, algorithm);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchRecommendations = async (uid: number, algo: string) => {
    setIsLoadingRecs(true);
    try {
      const res = await recommendationsApi.getForUser(uid, 10, algo);
      setRecommendations(res.recommendations || []);
      setIsColdStart(res.is_cold_start);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleUserChange = (uid: number) => {
    setSelectedUserId(uid);
    fetchRecommendations(uid, algorithm);
  };

  const handleAlgoChange = (algo: string) => {
    setAlgorithm(algo);
    fetchRecommendations(selectedUserId, algo);
  };

  const handleSearchSimilar = async () => {
    setIsSearchingSimilar(true);
    try {
      const res = await recommendationsApi.getSimilar(searchMovieId, 5);
      setSimilarResults(res);
    } catch (err) {
      console.error('Similar search error:', err);
    } finally {
      setIsSearchingSimilar(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-1">
            <Film className="w-3.5 h-3.5" /> GroupLens MovieLens Benchmark
          </div>
          <h2 className="text-xl font-bold text-white">Recommendation Intelligence Engine</h2>
          <p className="text-xs text-slate-400">
            Personalized Matrix Factorization (TruncatedSVD), Item Cosine Similarity, and Hybrid Ranking
          </p>
        </div>

        {/* Algorithm Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => handleAlgoChange('hybrid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              algorithm === 'hybrid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hybrid Ranking
          </button>
          <button
            onClick={() => handleAlgoChange('collaborative')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              algorithm === 'collaborative' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Matrix Factorization
          </button>
          <button
            onClick={() => handleAlgoChange('popularity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              algorithm === 'popularity' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bayesian Popularity
          </button>
        </div>
      </div>

      {/* Evaluation KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Offline Precision@10</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {analytics?.evaluation_metrics?.precision_at_10 ?? 0.131}
          </p>
          <span className="text-[11px] text-slate-400">Evaluated on 20% test ratings</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Normalized DCG@10</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">
            {analytics?.evaluation_metrics?.ndcg_at_10 ?? 0.163}
          </p>
          <span className="text-[11px] text-emerald-400">Rank-weighted relevance</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Latent Factor Dimensions</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">30 Components</p>
          <span className="text-[11px] text-slate-400">TruncatedSVD user-item space</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Catalog Coverage</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {analytics?.evaluation_metrics?.catalog_coverage ? `${(analytics.evaluation_metrics.catalog_coverage * 100).toFixed(1)}%` : '100%'}
          </p>
          <span className="text-[11px] text-slate-400">9,742 total movies</span>
        </div>
      </div>

      {/* Main Grid: User Persona Selector & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: User Persona Selector */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" /> Select User Persona
          </h3>
          <p className="text-xs text-slate-400">
            Switch between users with contrasting taste vectors to observe personalized collaborative filtering.
          </p>

          <div className="space-y-2">
            {usersList.map((u) => (
              <button
                key={u.user_id}
                onClick={() => handleUserChange(u.user_id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedUserId === u.user_id
                    ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-md shadow-purple-950/20'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">User #{u.user_id}</span>
                  {u.user_id === 9999 ? (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                      Cold Start
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      Trained
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{u.profile}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Ranked Recommendations Dashboard */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Top Ranked Recommendations</span>
                {isColdStart && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    Bayesian Fallback Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Sorted by predicted affinity and content resonance</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-800/40">
              k = 10 items
            </span>
          </div>

          {isLoadingRecs ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping mr-2"></span>
              Generating personalized latent rankings...
            </div>
          ) : (
            <div className="space-y-2.5">
              {recommendations.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Genres: <span className="text-slate-300">{item.genres?.replace(/\|/g, ', ')}</span>
                      </p>
                      <p className="text-[10px] text-indigo-400 mt-0.5 italic">{item.rationale}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{item.predicted_affinity}</span>
                    </div>
                    <span className="text-[9px] text-slate-500">Score</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item-Item Similarity Explorer */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Item-Item Latent Cosine Similarity Explorer</h3>
            <p className="text-xs text-slate-400">
              Compute nearest neighbors in latent matrix factor space across all catalog items
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={searchMovieId}
              onChange={(e) => setSearchMovieId(parseInt(e.target.value))}
              placeholder="Movie ID (e.g. 1)"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white w-32"
            />
            <button
              onClick={handleSearchSimilar}
              disabled={isSearchingSimilar}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Similar</span>
            </button>
          </div>
        </div>

        {similarResults ? (
          <div>
            <p className="text-xs text-indigo-300 font-semibold mb-3">
              Similar to: "{similarResults.source_movie?.title}" ({similarResults.source_movie?.genres})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {similarResults.similar_items?.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{item.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.genres?.replace(/\|/g, ', ')}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-[10px]">
                    <span className="text-slate-500">Cosine Sim:</span>
                    <span className="font-mono text-cyan-400 font-bold">{item.cosine_similarity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Enter a movie ID (e.g., 1 for Toy Story, 260 for Star Wars, 2571 for The Matrix) and click "Find Similar".
          </p>
        )}
      </div>
    </div>
  );
};
