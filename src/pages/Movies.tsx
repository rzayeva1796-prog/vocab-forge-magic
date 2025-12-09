import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Search, Star, Clock, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: number;
  duration: string;
  genre: string;
  description: string;
}

const mockMovies: Movie[] = [
  { id: 1, title: "Inception", poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=450&fit=crop", rating: 8.8, year: 2010, duration: "2h 28m", genre: "Sci-Fi", description: "A thief who steals corporate secrets through dream-sharing technology." },
  { id: 2, title: "The Dark Knight", poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop", rating: 9.0, year: 2008, duration: "2h 32m", genre: "Action", description: "Batman faces the Joker in an epic battle for Gotham's soul." },
  { id: 3, title: "Interstellar", poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&h=450&fit=crop", rating: 8.6, year: 2014, duration: "2h 49m", genre: "Sci-Fi", description: "A team of explorers travel through a wormhole in space." },
  { id: 4, title: "Pulp Fiction", poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop", rating: 8.9, year: 1994, duration: "2h 34m", genre: "Crime", description: "The lives of two mob hitmen intertwine in four tales of violence." },
  { id: 5, title: "The Matrix", poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=450&fit=crop", rating: 8.7, year: 1999, duration: "2h 16m", genre: "Sci-Fi", description: "A computer hacker learns about the true nature of reality." },
  { id: 6, title: "Forrest Gump", poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=450&fit=crop", rating: 8.8, year: 1994, duration: "2h 22m", genre: "Drama", description: "The story of a man with a low IQ who accomplished great things." },
  { id: 7, title: "The Godfather", poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop", rating: 9.2, year: 1972, duration: "2h 55m", genre: "Crime", description: "The aging patriarch of an organized crime dynasty transfers control." },
  { id: 8, title: "Fight Club", poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300&h=450&fit=crop", rating: 8.8, year: 1999, duration: "2h 19m", genre: "Drama", description: "An insomniac office worker forms an underground fight club." },
];

const categories = ["Trending", "Action", "Sci-Fi", "Drama", "Crime", "Comedy"];

const Movies = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [activeCategory, setActiveCategory] = useState("Trending");

  const filteredMovies = mockMovies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredMovie = mockMovies[0];

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
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Film ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/50 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!searchQuery && (
        <section className="relative h-[70vh] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${featuredMovie.poster})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
          
          <div className="absolute bottom-20 left-8 right-8 max-w-2xl">
            <h2 className="text-5xl font-bold mb-4">{featuredMovie.title}</h2>
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                {featuredMovie.rating}
              </span>
              <span>{featuredMovie.year}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {featuredMovie.duration}
              </span>
              <span className="px-2 py-0.5 bg-red-600 rounded text-xs">{featuredMovie.genre}</span>
            </div>
            <p className="text-gray-300 mb-6 line-clamp-2">{featuredMovie.description}</p>
            <div className="flex gap-3">
              <Button 
                className="bg-white text-black hover:bg-white/90 font-semibold"
                onClick={() => setSelectedMovie(featuredMovie)}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Oynat
              </Button>
              <Button variant="outline" className="border-gray-500 text-white hover:bg-white/10">
                <Plus className="w-5 h-5 mr-2" />
                Listeme Ekle
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className={`px-4 ${searchQuery ? 'pt-24' : 'pt-8'}`}>
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "ghost"}
              className={`whitespace-nowrap ${
                activeCategory === category 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-8">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              className="group relative cursor-pointer transition-transform hover:scale-105"
              onClick={() => setSelectedMovie(movie)}
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-semibold text-sm mb-1">{movie.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-3 h-3 fill-current" />
                      {movie.rating}
                    </span>
                    <span>{movie.year}</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Play className="w-6 h-6 fill-white text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedMovie(null)}
        >
          <div 
            className="bg-gray-900 rounded-xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64">
              <img
                src={selectedMovie.poster}
                alt={selectedMovie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setSelectedMovie(null)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6 -mt-16 relative">
              <h2 className="text-3xl font-bold mb-2">{selectedMovie.title}</h2>
              <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  {selectedMovie.rating}
                </span>
                <span>{selectedMovie.year}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedMovie.duration}
                </span>
                <span className="px-2 py-0.5 bg-red-600 rounded text-xs">{selectedMovie.genre}</span>
              </div>
              <p className="text-gray-300 mb-6">{selectedMovie.description}</p>
              <div className="flex gap-3">
                <Button className="bg-red-600 hover:bg-red-700 flex-1">
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Şimdi İzle
                </Button>
                <Button variant="outline" className="border-gray-600 hover:bg-white/10">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Movies;
