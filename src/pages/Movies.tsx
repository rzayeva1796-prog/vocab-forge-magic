import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Search, Plus, Link, Lock, X, ChevronRight, Upload, Trash2, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Movie {
  id: string;
  title: string;
  cover_url: string | null;
  category: string | null;
}

interface Season {
  id: string;
  movie_id: string;
  name: string;
  display_order: number;
}

interface Episode {
  id: string;
  season_id: string;
  episode_number: number;
  name: string;
  video_url: string | null;
  package_id: string | null;
}

interface WordPackage {
  id: string;
  name: string;
}

interface WatchHistory {
  episode_id: string;
  watched_at: string;
  completed: boolean;
}

const Movies = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [wordPackages, setWordPackages] = useState<WordPackage[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Category filter
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Watch history
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [showWatchHistory, setShowWatchHistory] = useState(false);
  
  // Admin dialogs
  const [showAddMovieDialog, setShowAddMovieDialog] = useState(false);
  const [showManageLinksDialog, setShowManageLinksDialog] = useState(false);
  const [managingMovie, setManagingMovie] = useState<Movie | null>(null);
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  
  // Add movie form
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [newMovieCategory, setNewMovieCategory] = useState("Dizi");
  const [newMovieCover, setNewMovieCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add season/episode form
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newEpisodeNumber, setNewEpisodeNumber] = useState("");
  const [newEpisodeName, setNewEpisodeName] = useState("");
  const [newEpisodeLink, setNewEpisodeLink] = useState("");
  const [newEpisodePackageId, setNewEpisodePackageId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  
  // Video player
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  
  // Package unlock status
  const [packageStars, setPackageStars] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMovies();
    fetchWordPackages();
    if (user) {
      checkAdminStatus();
      fetchPackageStars();
      fetchWatchHistory();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMovie) {
      fetchSeasonsAndEpisodes(selectedMovie.id);
    }
  }, [selectedMovie]);

  useEffect(() => {
    if (managingMovie) {
      fetchSeasonsAndEpisodes(managingMovie.id);
    }
  }, [managingMovie]);

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching movies:", error);
    } else {
      setMovies(data || []);
      // Extract unique categories
      const uniqueCategories = [...new Set((data || []).map(m => m.category).filter(Boolean))] as string[];
      setCategories(uniqueCategories);
    }
    setLoading(false);
  };

  const fetchWordPackages = async () => {
    const { data } = await supabase
      .from("word_packages")
      .select("id, name")
      .order("display_order");
    setWordPackages(data || []);
  };

  const fetchSeasonsAndEpisodes = async (movieId: string) => {
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("*")
      .eq("movie_id", movieId)
      .order("display_order");
    
    setSeasons(seasonsData || []);

    if (seasonsData && seasonsData.length > 0) {
      const seasonIds = seasonsData.map(s => s.id);
      const { data: episodesData } = await supabase
        .from("episodes")
        .select("*")
        .in("season_id", seasonIds)
        .order("display_order");
      
      setEpisodes(episodesData || []);
    } else {
      setEpisodes([]);
    }
  };

  const fetchPackageStars = async () => {
    if (!user) return;
    
    const { data: progressData } = await supabase
      .from("user_word_progress")
      .select("word_id, star_rating")
      .eq("user_id", user.id);

    const { data: learnedWords } = await supabase
      .from("learned_words")
      .select("id, package_id");

    if (!progressData || !learnedWords) return;

    const wordStars: Record<string, number> = {};
    progressData.forEach(p => {
      wordStars[p.word_id] = p.star_rating;
    });

    const packageMinStars: Record<string, number> = {};
    learnedWords.forEach(word => {
      if (word.package_id) {
        const stars = wordStars[word.id] || 0;
        if (packageMinStars[word.package_id] === undefined) {
          packageMinStars[word.package_id] = stars;
        } else {
          packageMinStars[word.package_id] = Math.min(packageMinStars[word.package_id], stars);
        }
      }
    });

    setPackageStars(packageMinStars);
  };

  const fetchWatchHistory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("watch_history")
      .select("episode_id, watched_at, completed")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false });
    
    setWatchHistory(data || []);
  };

  const isEpisodeUnlocked = (episode: Episode): boolean => {
    if (!episode.package_id) return true;
    const minStars = packageStars[episode.package_id];
    return minStars !== undefined && minStars >= 5;
  };

  const isEpisodeWatched = (episodeId: string): boolean => {
    return watchHistory.some(h => h.episode_id === episodeId);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMovieCover(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMovie = async () => {
    if (!newMovieTitle.trim()) {
      toast.error("Film adı gerekli");
      return;
    }

    let coverUrl = null;

    if (newMovieCover) {
      const fileExt = newMovieCover.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("movie-covers")
        .upload(fileName, newMovieCover);

      if (uploadError) {
        toast.error("Kapak yüklenemedi");
        console.error(uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("movie-covers")
        .getPublicUrl(fileName);
      
      coverUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("movies")
      .insert({ 
        title: newMovieTitle.trim(), 
        cover_url: coverUrl,
        category: newMovieCategory.trim() || "Dizi"
      });

    if (error) {
      toast.error("Film eklenemedi");
      console.error(error);
    } else {
      toast.success("Film eklendi");
      setShowAddMovieDialog(false);
      setNewMovieTitle("");
      setNewMovieCategory("Dizi");
      setNewMovieCover(null);
      setCoverPreview(null);
      fetchMovies();
    }
  };

  const handleDeleteMovie = async () => {
    if (!movieToDelete) return;

    // First delete all episodes and seasons
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("id")
      .eq("movie_id", movieToDelete.id);

    if (seasonsData && seasonsData.length > 0) {
      const seasonIds = seasonsData.map(s => s.id);
      await supabase.from("episodes").delete().in("season_id", seasonIds);
      await supabase.from("seasons").delete().eq("movie_id", movieToDelete.id);
    }

    // Delete cover from storage if exists
    if (movieToDelete.cover_url) {
      const fileName = movieToDelete.cover_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from("movie-covers").remove([fileName]);
      }
    }

    // Delete movie
    const { error } = await supabase
      .from("movies")
      .delete()
      .eq("id", movieToDelete.id);

    if (error) {
      toast.error("Film silinemedi");
      console.error(error);
    } else {
      toast.success("Film silindi");
      fetchMovies();
    }
    setMovieToDelete(null);
  };

  const handleAddSeason = async () => {
    if (!managingMovie || !newSeasonName.trim()) {
      toast.error("Sezon adı gerekli");
      return;
    }

    const { error } = await supabase
      .from("seasons")
      .insert({
        movie_id: managingMovie.id,
        name: newSeasonName.trim(),
        display_order: seasons.length
      });

    if (error) {
      toast.error("Sezon eklenemedi");
    } else {
      toast.success("Sezon eklendi");
      setNewSeasonName("");
      fetchSeasonsAndEpisodes(managingMovie.id);
    }
  };

  const handleAddEpisode = async () => {
    if (!selectedSeasonId || !newEpisodeNumber || !newEpisodeName.trim()) {
      toast.error("Bölüm numarası ve adı gerekli");
      return;
    }

    const { error } = await supabase
      .from("episodes")
      .insert({
        season_id: selectedSeasonId,
        episode_number: parseInt(newEpisodeNumber),
        name: newEpisodeName.trim(),
        video_url: newEpisodeLink || null,
        package_id: newEpisodePackageId || null,
        display_order: episodes.filter(e => e.season_id === selectedSeasonId).length
      });

    if (error) {
      toast.error("Bölüm eklenemedi");
    } else {
      toast.success("Bölüm eklendi");
      setNewEpisodeNumber("");
      setNewEpisodeName("");
      setNewEpisodeLink("");
      setNewEpisodePackageId("");
      if (managingMovie) {
        fetchSeasonsAndEpisodes(managingMovie.id);
      }
    }
  };

  const handlePlayEpisode = async (episode: Episode) => {
    if (!isEpisodeUnlocked(episode)) {
      toast.error("Bu bölümü izlemek için kelime paketini tamamlayın");
      return;
    }
    if (!episode.video_url) {
      toast.error("Video linki bulunamadı");
      return;
    }

    // Save to watch history
    if (user) {
      await supabase
        .from("watch_history")
        .upsert({
          user_id: user.id,
          episode_id: episode.id,
          watched_at: new Date().toISOString(),
          completed: false
        }, { onConflict: 'user_id,episode_id' });
      
      fetchWatchHistory();
    }

    setPlayingEpisode(episode);
  };

  const getEmbedUrl = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be") 
        ? url.split("/").pop()?.split("?")[0]
        : new URLSearchParams(new URL(url).search).get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com")) {
      const videoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || movie.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get watched episodes with movie info
  const getWatchedEpisodesWithInfo = () => {
    const watchedEpisodeIds = watchHistory.map(h => h.episode_id);
    const watchedEpisodes: Array<{ episode: Episode; movie: Movie; season: Season; watchedAt: string }> = [];
    
    movies.forEach(movie => {
      // We need to fetch seasons/episodes for each movie to show history
      // For simplicity, we'll use the current episodes state if a movie is selected
    });
    
    return watchedEpisodes;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Video player view
  if (playingEpisode) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPlayingEpisode(null)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold">{playingEpisode.name}</h1>
          </div>
        </header>
        <div className="pt-16 h-screen">
          <iframe
            src={getEmbedUrl(playingEpisode.video_url || "")}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  // Movie detail view
  if (selectedMovie) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMovie(null)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">{selectedMovie.title}</h1>
          </div>
        </header>

        <div className="pt-20 px-4 pb-8">
          {/* Movie cover */}
          <div className="flex gap-4 mb-6">
            {selectedMovie.cover_url && (
              <img
                src={selectedMovie.cover_url}
                alt={selectedMovie.title}
                className="w-32 h-48 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{selectedMovie.title}</h2>
              {selectedMovie.category && (
                <span className="inline-block px-2 py-1 bg-red-600/20 text-red-400 text-sm rounded mb-2">
                  {selectedMovie.category}
                </span>
              )}
              <p className="text-gray-400">{seasons.length} Sezon</p>
            </div>
          </div>

          {/* Seasons and Episodes */}
          {seasons.map((season) => (
            <div key={season.id} className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-red-500">{season.name}</h3>
              <div className="space-y-2">
                {episodes
                  .filter(ep => ep.season_id === season.id)
                  .sort((a, b) => a.episode_number - b.episode_number)
                  .map((episode) => {
                    const unlocked = isEpisodeUnlocked(episode);
                    const watched = isEpisodeWatched(episode.id);
                    const packageName = wordPackages.find(p => p.id === episode.package_id)?.name;
                    
                    return (
                      <div
                        key={episode.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          unlocked 
                            ? "bg-gray-800/50 hover:bg-gray-800 cursor-pointer" 
                            : "bg-gray-900/50 opacity-60"
                        }`}
                        onClick={() => unlocked && handlePlayEpisode(episode)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          unlocked ? "bg-red-600" : "bg-gray-700"
                        }`}>
                          {unlocked ? (
                            <Play className="w-5 h-5 fill-white" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            {episode.episode_number}. {episode.name}
                            {watched && (
                              <span className="text-xs text-green-500">✓ İzlendi</span>
                            )}
                          </p>
                          {packageName && (
                            <p className="text-xs text-gray-500">
                              Paket: {packageName} {!unlocked && "(5 yıldız gerekli)"}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          {seasons.length === 0 && (
            <p className="text-gray-500 text-center py-8">Henüz sezon eklenmemiş</p>
          )}
        </div>
      </div>
    );
  }

  // Main movies list
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/fun")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-red-600">FilmBox</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWatchHistory(true)}
                className="text-white hover:bg-white/10"
              >
                <History className="w-5 h-5" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddMovieDialog(true)}
                className="text-white hover:bg-white/10"
              >
                <Plus className="w-6 h-6" />
              </Button>
            )}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Film ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="pt-20 px-4">
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null 
              ? "bg-red-600 hover:bg-red-700 border-0" 
              : "border-gray-700 text-gray-300 hover:bg-gray-800"
            }
          >
            Tümü
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category 
                ? "bg-red-600 hover:bg-red-700 border-0" 
                : "border-gray-700 text-gray-300 hover:bg-gray-800"
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Movie Grid */}
      <div className="px-4 pb-8">
        {filteredMovies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">
              {movies.length === 0 ? "Henüz film eklenmemiş" : "Film bulunamadı"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMovies.map((movie) => (
              <div key={movie.id} className="space-y-2">
                <div
                  className="group relative cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedMovie(movie)}
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                    {movie.cover_url ? (
                      <img
                        src={movie.cover_url}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-semibold text-sm">{movie.title}</h3>
                      {movie.category && (
                        <span className="text-xs text-red-400">{movie.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="w-6 h-6 fill-white text-white" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-center truncate">{movie.title}</p>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-700 hover:bg-gray-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingMovie(movie);
                        setShowManageLinksDialog(true);
                      }}
                    >
                      <Link className="w-4 h-4 mr-1" />
                      Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-700 hover:bg-red-900/50 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovieToDelete(movie);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Movie Dialog */}
      <Dialog open={showAddMovieDialog} onOpenChange={setShowAddMovieDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Yeni Film/Dizi Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="aspect-[2/3] w-32 mx-auto rounded-lg overflow-hidden bg-gray-800 cursor-pointer flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                  <p className="text-xs text-gray-500">Kapak Resmi</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
            <Input
              placeholder="Film/Dizi Adı"
              value={newMovieTitle}
              onChange={(e) => setNewMovieTitle(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Input
              placeholder="Kategori (örn: Dizi, Film, Belgesel)"
              value={newMovieCategory}
              onChange={(e) => setNewMovieCategory(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              onClick={handleAddMovie}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Watch History Dialog */}
      <Dialog open={showWatchHistory} onOpenChange={setShowWatchHistory}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              İzleme Geçmişi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {watchHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz izleme geçmişi yok</p>
            ) : (
              watchHistory.map((history) => {
                const episode = episodes.find(e => e.id === history.episode_id);
                const season = episode ? seasons.find(s => s.id === episode.season_id) : null;
                const movie = season ? movies.find(m => m.id === season.movie_id) : null;
                
                return (
                  <div
                    key={history.episode_id}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                  >
                    <Play className="w-4 h-4 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {episode?.name || "Bilinmeyen bölüm"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.watched_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Movie Confirmation */}
      <AlertDialog open={!!movieToDelete} onOpenChange={() => setMovieToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Filmi Sil</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              "{movieToDelete?.title}" filmini ve tüm sezon/bölümlerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMovie}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Links Dialog */}
      <Dialog open={showManageLinksDialog} onOpenChange={setShowManageLinksDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{managingMovie?.title} - Link Yönetimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Add Season */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-400">Sezon Ekle</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Sezon adı (örn: Sezon 1)"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                <Button onClick={handleAddSeason} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Existing Seasons */}
            {seasons.map((season) => (
              <div key={season.id} className="space-y-2">
                <h4 className="font-semibold text-red-500">{season.name}</h4>
                {episodes
                  .filter(ep => ep.season_id === season.id)
                  .sort((a, b) => a.episode_number - b.episode_number)
                  .map((episode) => (
                    <div key={episode.id} className="text-sm bg-gray-800 p-2 rounded flex items-center gap-2">
                      <span className="text-gray-400">{episode.episode_number}.</span>
                      <span>{episode.name}</span>
                      {episode.package_id && (
                        <span className="text-xs text-gray-500">
                          ({wordPackages.find(p => p.id === episode.package_id)?.name})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            ))}

            {/* Add Episode */}
            {seasons.length > 0 && (
              <div className="space-y-2 border-t border-gray-800 pt-4">
                <h4 className="font-semibold text-sm text-gray-400">Bölüm Ekle</h4>
                <Select value={selectedSeasonId || ""} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Sezon seç" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Bölüm No"
                    type="number"
                    value={newEpisodeNumber}
                    onChange={(e) => setNewEpisodeNumber(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                  <Input
                    placeholder="Bölüm Adı"
                    value={newEpisodeName}
                    onChange={(e) => setNewEpisodeName(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <Input
                  placeholder="Video Linki"
                  value={newEpisodeLink}
                  onChange={(e) => setNewEpisodeLink(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                <Select value={newEpisodePackageId} onValueChange={setNewEpisodePackageId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Kelime Paketi Seç (Opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {wordPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddEpisode}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!selectedSeasonId}
                >
                  Bölüm Ekle
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Movies;
