import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Search, Plus, Link, Lock, X, ChevronRight, Upload, Trash2, History, Music2, Pause } from "lucide-react";
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

interface MusicItem {
  id: string;
  title: string;
  cover_url: string | null;
  category: string | null;
}

interface Album {
  id: string;
  music_id: string;
  name: string;
  display_order: number;
}

interface Track {
  id: string;
  album_id: string;
  track_number: number;
  name: string;
  audio_url: string | null;
  package_id: string | null;
}

interface WordPackage {
  id: string;
  name: string;
}

interface ListenHistory {
  track_id: string;
  listened_at: string;
  completed: boolean;
}

const Music = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [musicItems, setMusicItems] = useState<MusicItem[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicItem | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [wordPackages, setWordPackages] = useState<WordPackage[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Category filter
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Listen history
  const [listenHistory, setListenHistory] = useState<ListenHistory[]>([]);
  const [showListenHistory, setShowListenHistory] = useState(false);
  
  // Admin dialogs
  const [showAddMusicDialog, setShowAddMusicDialog] = useState(false);
  const [showManageLinksDialog, setShowManageLinksDialog] = useState(false);
  const [managingMusic, setManagingMusic] = useState<MusicItem | null>(null);
  const [musicToDelete, setMusicToDelete] = useState<MusicItem | null>(null);
  
  // Add music form
  const [newMusicTitle, setNewMusicTitle] = useState("");
  const [newMusicCategory, setNewMusicCategory] = useState("Müzik");
  const [newMusicCover, setNewMusicCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add album/track form
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newTrackNumber, setNewTrackNumber] = useState("");
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackLink, setNewTrackLink] = useState("");
  const [newTrackPackageId, setNewTrackPackageId] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  
  // Audio player
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Package unlock status
  const [packageStars, setPackageStars] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMusic();
    fetchWordPackages();
    if (user) {
      checkAdminStatus();
      fetchPackageStars();
      fetchListenHistory();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMusic) {
      fetchAlbumsAndTracks(selectedMusic.id);
    }
  }, [selectedMusic]);

  useEffect(() => {
    if (managingMusic) {
      fetchAlbumsAndTracks(managingMusic.id);
    }
  }, [managingMusic]);

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

  const fetchMusic = async () => {
    const { data, error } = await supabase
      .from("music")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching music:", error);
    } else {
      setMusicItems(data || []);
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

  const fetchAlbumsAndTracks = async (musicId: string) => {
    const { data: albumsData } = await supabase
      .from("music_albums")
      .select("*")
      .eq("music_id", musicId)
      .order("display_order");
    
    setAlbums(albumsData || []);

    if (albumsData && albumsData.length > 0) {
      const albumIds = albumsData.map(a => a.id);
      const { data: tracksData } = await supabase
        .from("music_tracks")
        .select("*")
        .in("album_id", albumIds)
        .order("display_order");
      
      setTracks(tracksData || []);
    } else {
      setTracks([]);
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

  const fetchListenHistory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("listen_history")
      .select("track_id, listened_at, completed")
      .eq("user_id", user.id)
      .order("listened_at", { ascending: false });
    
    setListenHistory(data || []);
  };

  const isTrackUnlocked = (track: Track): boolean => {
    if (!track.package_id) return true;
    const minStars = packageStars[track.package_id];
    return minStars !== undefined && minStars >= 5;
  };

  const isTrackListened = (trackId: string): boolean => {
    return listenHistory.some(h => h.track_id === trackId);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMusicCover(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMusic = async () => {
    if (!newMusicTitle.trim()) {
      toast.error("Müzik adı gerekli");
      return;
    }

    let coverUrl = null;

    if (newMusicCover) {
      const fileExt = newMusicCover.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("movie-covers")
        .upload(`music/${fileName}`, newMusicCover);

      if (uploadError) {
        toast.error("Kapak yüklenemedi");
        console.error(uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("movie-covers")
        .getPublicUrl(`music/${fileName}`);
      
      coverUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("music")
      .insert({ 
        title: newMusicTitle.trim(), 
        cover_url: coverUrl,
        category: newMusicCategory.trim() || "Müzik"
      });

    if (error) {
      toast.error("Müzik eklenemedi");
      console.error(error);
    } else {
      toast.success("Müzik eklendi");
      setShowAddMusicDialog(false);
      setNewMusicTitle("");
      setNewMusicCategory("Müzik");
      setNewMusicCover(null);
      setCoverPreview(null);
      fetchMusic();
    }
  };

  const handleDeleteMusic = async () => {
    if (!musicToDelete) return;

    const { data: albumsData } = await supabase
      .from("music_albums")
      .select("id")
      .eq("music_id", musicToDelete.id);

    if (albumsData && albumsData.length > 0) {
      const albumIds = albumsData.map(a => a.id);
      await supabase.from("music_tracks").delete().in("album_id", albumIds);
      await supabase.from("music_albums").delete().eq("music_id", musicToDelete.id);
    }

    if (musicToDelete.cover_url) {
      const fileName = musicToDelete.cover_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from("movie-covers").remove([`music/${fileName}`]);
      }
    }

    const { error } = await supabase
      .from("music")
      .delete()
      .eq("id", musicToDelete.id);

    if (error) {
      toast.error("Müzik silinemedi");
      console.error(error);
    } else {
      toast.success("Müzik silindi");
      fetchMusic();
    }
    setMusicToDelete(null);
  };

  const handleAddAlbum = async () => {
    if (!managingMusic || !newAlbumName.trim()) {
      toast.error("Albüm adı gerekli");
      return;
    }

    const { error } = await supabase
      .from("music_albums")
      .insert({
        music_id: managingMusic.id,
        name: newAlbumName.trim(),
        display_order: albums.length
      });

    if (error) {
      toast.error("Albüm eklenemedi");
    } else {
      toast.success("Albüm eklendi");
      setNewAlbumName("");
      fetchAlbumsAndTracks(managingMusic.id);
    }
  };

  const handleAddTrack = async () => {
    if (!selectedAlbumId || !newTrackNumber || !newTrackName.trim()) {
      toast.error("Parça numarası ve adı gerekli");
      return;
    }

    const { error } = await supabase
      .from("music_tracks")
      .insert({
        album_id: selectedAlbumId,
        track_number: parseInt(newTrackNumber),
        name: newTrackName.trim(),
        audio_url: newTrackLink || null,
        package_id: newTrackPackageId || null,
        display_order: tracks.filter(t => t.album_id === selectedAlbumId).length
      });

    if (error) {
      toast.error("Parça eklenemedi");
    } else {
      toast.success("Parça eklendi");
      setNewTrackNumber("");
      setNewTrackName("");
      setNewTrackLink("");
      setNewTrackPackageId("");
      if (managingMusic) {
        fetchAlbumsAndTracks(managingMusic.id);
      }
    }
  };

  const handlePlayTrack = async (track: Track) => {
    if (!isTrackUnlocked(track)) {
      toast.error("Bu parçayı dinlemek için kelime paketini tamamlayın");
      return;
    }
    if (!track.audio_url) {
      toast.error("Ses linki bulunamadı");
      return;
    }

    if (user) {
      await supabase
        .from("listen_history")
        .upsert({
          user_id: user.id,
          track_id: track.id,
          listened_at: new Date().toISOString(),
          completed: false
        }, { onConflict: 'user_id,track_id' });
      
      fetchListenHistory();
    }

    if (playingTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setPlayingTrack(track);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (playingTrack && audioRef.current) {
      audioRef.current.src = getAudioUrl(playingTrack.audio_url || "");
      audioRef.current.play();
    }
  }, [playingTrack]);

  const getAudioUrl = (url: string): string => {
    // Handle YouTube and other audio sources
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // For YouTube, we'll use an iframe instead
      return url;
    }
    return url;
  };

  const filteredMusic = musicItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // Music detail view
  if (selectedMusic) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-purple-900/90 to-transparent px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMusic(null)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">{selectedMusic.title}</h1>
          </div>
        </header>

        <div className="pt-20 px-4 pb-24">
          {/* Music cover */}
          <div className="flex gap-4 mb-6">
            {selectedMusic.cover_url && (
              <img
                src={selectedMusic.cover_url}
                alt={selectedMusic.title}
                className="w-32 h-32 object-cover rounded-lg shadow-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{selectedMusic.title}</h2>
              {selectedMusic.category && (
                <span className="inline-block px-2 py-1 bg-purple-600/20 text-purple-300 text-sm rounded mb-2">
                  {selectedMusic.category}
                </span>
              )}
              <p className="text-gray-400">{albums.length} Albüm</p>
            </div>
          </div>

          {/* Albums and Tracks */}
          {albums.map((album) => (
            <div key={album.id} className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">{album.name}</h3>
              <div className="space-y-2">
                {tracks
                  .filter(t => t.album_id === album.id)
                  .sort((a, b) => a.track_number - b.track_number)
                  .map((track) => {
                    const unlocked = isTrackUnlocked(track);
                    const listened = isTrackListened(track.id);
                    const packageName = wordPackages.find(p => p.id === track.package_id)?.name;
                    const isCurrentlyPlaying = playingTrack?.id === track.id && isPlaying;
                    
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          unlocked 
                            ? "bg-purple-900/30 hover:bg-purple-900/50 cursor-pointer" 
                            : "bg-gray-900/50 opacity-60"
                        } ${isCurrentlyPlaying ? "ring-2 ring-purple-400" : ""}`}
                        onClick={() => unlocked && handlePlayTrack(track)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          unlocked ? "bg-purple-600" : "bg-gray-700"
                        }`}>
                          {unlocked ? (
                            isCurrentlyPlaying ? (
                              <Pause className="w-5 h-5 fill-white" />
                            ) : (
                              <Play className="w-5 h-5 fill-white" />
                            )
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            {track.track_number}. {track.name}
                            {listened && (
                              <span className="text-xs text-green-500">✓ Dinlendi</span>
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

          {albums.length === 0 && (
            <p className="text-gray-500 text-center py-8">Henüz albüm eklenmemiş</p>
          )}
        </div>

        {/* Audio Player Bar */}
        {playingTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-purple-950/95 backdrop-blur-sm p-4 border-t border-purple-800">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePlayTrack(playingTrack)}
                className="text-white hover:bg-white/10"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <div className="flex-1">
                <p className="font-medium text-sm">{playingTrack.name}</p>
                <p className="text-xs text-gray-400">{selectedMusic?.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPlayingTrack(null);
                  setIsPlaying(false);
                  if (audioRef.current) {
                    audioRef.current.pause();
                  }
                }}
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
    );
  }

  // Main music list
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-purple-900/90 to-transparent px-4 py-3">
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
            <h1 className="text-2xl font-bold text-purple-400">MusicBox</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowListenHistory(true)}
                className="text-white hover:bg-white/10"
              >
                <History className="w-5 h-5" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddMusicDialog(true)}
                className="text-white hover:bg-white/10"
              >
                <Plus className="w-6 h-6" />
              </Button>
            )}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Müzik ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/50 border-purple-700 text-white placeholder:text-gray-500"
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
              ? "bg-purple-600 hover:bg-purple-700 border-0" 
              : "border-purple-700 text-gray-300 hover:bg-purple-800"
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
                ? "bg-purple-600 hover:bg-purple-700 border-0" 
                : "border-purple-700 text-gray-300 hover:bg-purple-800"
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Music Grid */}
      <div className="px-4 pb-8">
        {filteredMusic.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">
              {musicItems.length === 0 ? "Henüz müzik eklenmemiş" : "Müzik bulunamadı"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMusic.map((item) => (
              <div key={item.id} className="space-y-2">
                <div
                  className="group relative cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedMusic(item)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-purple-900/50">
                    {item.cover_url ? (
                      <img
                        src={item.cover_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-12 h-12 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      {item.category && (
                        <span className="text-xs text-purple-300">{item.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="w-6 h-6 fill-white text-white" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-center truncate">{item.title}</p>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-purple-700 hover:bg-purple-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingMusic(item);
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
                        setMusicToDelete(item);
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

      {/* Add Music Dialog */}
      <Dialog open={showAddMusicDialog} onOpenChange={setShowAddMusicDialog}>
        <DialogContent className="bg-purple-950 border-purple-800 text-white">
          <DialogHeader>
            <DialogTitle>Yeni Müzik Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="aspect-square w-32 mx-auto rounded-lg overflow-hidden bg-purple-900 cursor-pointer flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                  <p className="text-xs text-purple-400">Kapak Resmi</p>
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
              placeholder="Müzik/Albüm Adı"
              value={newMusicTitle}
              onChange={(e) => setNewMusicTitle(e.target.value)}
              className="bg-purple-900 border-purple-700"
            />
            <Input
              placeholder="Kategori (örn: Pop, Rock, Klasik)"
              value={newMusicCategory}
              onChange={(e) => setNewMusicCategory(e.target.value)}
              className="bg-purple-900 border-purple-700"
            />
            <Button
              onClick={handleAddMusic}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Listen History Dialog */}
      <Dialog open={showListenHistory} onOpenChange={setShowListenHistory}>
        <DialogContent className="bg-purple-950 border-purple-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Dinleme Geçmişi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {listenHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz dinleme geçmişi yok</p>
            ) : (
              listenHistory.map((history) => {
                const track = tracks.find(t => t.id === history.track_id);
                const album = track ? albums.find(a => a.id === track.album_id) : null;
                
                return (
                  <div
                    key={history.track_id}
                    className="flex items-center gap-3 p-3 bg-purple-900/50 rounded-lg"
                  >
                    <Music2 className="w-4 h-4 text-purple-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {track?.name || "Bilinmeyen parça"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.listened_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Music Confirmation */}
      <AlertDialog open={!!musicToDelete} onOpenChange={() => setMusicToDelete(null)}>
        <AlertDialogContent className="bg-purple-950 border-purple-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Müziği Sil</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              "{musicToDelete?.title}" müziğini ve tüm albüm/parçalarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-purple-900 border-purple-700 hover:bg-purple-800">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMusic}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Links Dialog */}
      <Dialog open={showManageLinksDialog} onOpenChange={setShowManageLinksDialog}>
        <DialogContent className="bg-purple-950 border-purple-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{managingMusic?.title} - Link Yönetimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Add Album */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-400">Albüm Ekle</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Albüm adı (örn: Albüm 1)"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="bg-purple-900 border-purple-700"
                />
                <Button onClick={handleAddAlbum} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Existing Albums */}
            {albums.map((album) => (
              <div key={album.id} className="space-y-2">
                <h4 className="font-semibold text-purple-400">{album.name}</h4>
                {tracks
                  .filter(t => t.album_id === album.id)
                  .sort((a, b) => a.track_number - b.track_number)
                  .map((track) => (
                    <div key={track.id} className="text-sm bg-purple-900/50 p-2 rounded flex items-center gap-2">
                      <span className="text-gray-400">{track.track_number}.</span>
                      <span>{track.name}</span>
                      {track.package_id && (
                        <span className="text-xs text-gray-500">
                          ({wordPackages.find(p => p.id === track.package_id)?.name})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            ))}

            {/* Add Track */}
            {albums.length > 0 && (
              <div className="space-y-2 border-t border-purple-800 pt-4">
                <h4 className="font-semibold text-sm text-gray-400">Parça Ekle</h4>
                <Select value={selectedAlbumId || ""} onValueChange={setSelectedAlbumId}>
                  <SelectTrigger className="bg-purple-900 border-purple-700">
                    <SelectValue placeholder="Albüm seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-purple-950 border-purple-700">
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    placeholder="No"
                    value={newTrackNumber}
                    onChange={(e) => setNewTrackNumber(e.target.value)}
                    className="w-16 bg-purple-900 border-purple-700"
                    type="number"
                  />
                  <Input
                    placeholder="Parça adı"
                    value={newTrackName}
                    onChange={(e) => setNewTrackName(e.target.value)}
                    className="flex-1 bg-purple-900 border-purple-700"
                  />
                </div>
                <Input
                  placeholder="Ses linki (MP3, YouTube, vb.)"
                  value={newTrackLink}
                  onChange={(e) => setNewTrackLink(e.target.value)}
                  className="bg-purple-900 border-purple-700"
                />
                <Select value={newTrackPackageId} onValueChange={setNewTrackPackageId}>
                  <SelectTrigger className="bg-purple-900 border-purple-700">
                    <SelectValue placeholder="Kelime paketi (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent className="bg-purple-950 border-purple-700 max-h-48">
                    {wordPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddTrack} className="w-full bg-purple-600 hover:bg-purple-700">
                  Parça Ekle
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Music;
