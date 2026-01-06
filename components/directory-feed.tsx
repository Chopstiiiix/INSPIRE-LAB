"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { getFeed, toggleFollow } from "@/app/actions/feed";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, Loader2, MapPin, Briefcase } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SkillTag {
  id: string;
  name: string;
  category: string | null;
}

interface ToolTag {
  id: string;
  name: string;
  category: string | null;
}

interface DirectoryFeedProps {
  skillTags: SkillTag[];
  toolTags: ToolTag[];
}

interface ProfileTile {
  id: string;
  name: string | null;
  handle: string | null;
  avatar: string | null;
  roleTitle: string | null;
  location: string | null;
  featuredSkills: Array<{
    id: string;
    name: string;
    category: string | null;
    level: string;
  }>;
  featuredTools: Array<{
    id: string;
    name: string;
  }>;
  activeProject: {
    id: string;
    title: string;
  } | null;
  isFollowing: boolean;
}

export function DirectoryFeed({ skillTags, toolTags }: DirectoryFeedProps) {
  const [tiles, setTiles] = useState<ProfileTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [hasActiveProject, setHasActiveProject] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "following" | "relevance">("newest");
  const [showFilters, setShowFilters] = useState(false);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // Load initial feed
  const loadFeed = useCallback(
    async (reset = false) => {
      setIsLoading(true);

      const result = await getFeed({
        search: search || undefined,
        skillTagIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        toolTagIds: selectedToolIds.length > 0 ? selectedToolIds : undefined,
        location: location || undefined,
        hasActiveProject: hasActiveProject || undefined,
        sortBy,
        cursor: reset ? undefined : cursor || undefined,
      });

      if (result.success && result.tiles) {
        if (reset) {
          setTiles(result.tiles);
        } else {
          setTiles((prev) => [...prev, ...result.tiles!]);
        }
        setCursor(result.nextCursor);
        setHasMore(result.hasMore || false);
      }

      setIsLoading(false);
    },
    [search, selectedSkillIds, selectedToolIds, location, hasActiveProject, sortBy, cursor]
  );

  // Initial load
  useEffect(() => {
    loadFeed(true);
  }, [search, selectedSkillIds, selectedToolIds, location, hasActiveProject, sortBy]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadFeed(false);
    }
  }, [inView, hasMore, isLoading, loadFeed]);

  // Handle follow toggle
  const handleToggleFollow = async (userId: string) => {
    const result = await toggleFollow(userId);
    if (result.success) {
      setTiles((prev) =>
        prev.map((tile) =>
          tile.id === userId ? { ...tile, isFollowing: result.isFollowing! } : tile
        )
      );
    }
  };

  // Toggle skill filter
  const toggleSkillFilter = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  // Toggle tool filter
  const toggleToolFilter = (toolId: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setSelectedSkillIds([]);
    setSelectedToolIds([]);
    setLocation("");
    setHasActiveProject(false);
    setSortBy("newest");
  };

  const hasActiveFilters =
    search ||
    selectedSkillIds.length > 0 ||
    selectedToolIds.length > 0 ||
    location ||
    hasActiveProject;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Directory</h1>
        <p className="text-gray-400">Discover and connect with professionals</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, handle, role, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="border-zinc-800"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {[
                  search ? 1 : 0,
                  selectedSkillIds.length,
                  selectedToolIds.length,
                  location ? 1 : 0,
                  hasActiveProject ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </Badge>
            )}
          </Button>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="following">Following First</SelectItem>
              <SelectItem value="relevance">Most Relevant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4 bg-zinc-900 border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-400">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Location</label>
              <Input
                placeholder="Filter by location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Has Active Project Filter */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasActiveProject"
                checked={hasActiveProject}
                onChange={(e) => setHasActiveProject(e.target.checked)}
                className="rounded border-zinc-700"
              />
              <label htmlFor="hasActiveProject" className="text-sm text-gray-300 cursor-pointer">
                Has active projects
              </label>
            </div>

            {/* Skill Tags Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Skills</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {Object.entries(
                  skillTags.reduce((acc, tag) => {
                    if (!acc[tag.category]) acc[tag.category] = [];
                    acc[tag.category].push(tag);
                    return acc;
                  }, {} as Record<string, SkillTag[]>)
                ).map(([category, tags]) => (
                  <div key={category} className="w-full">
                    <div className="text-xs text-gray-500 mb-1">{category}</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleSkillFilter(tag.id)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            selectedSkillIds.includes(tag.id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-zinc-800 text-gray-300 border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tool Tags Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tools</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {Object.entries(
                  toolTags.reduce((acc, tag) => {
                    if (!acc[tag.category]) acc[tag.category] = [];
                    acc[tag.category].push(tag);
                    return acc;
                  }, {} as Record<string, ToolTag[]>)
                ).map(([category, tags]) => (
                  <div key={category} className="w-full">
                    <div className="text-xs text-gray-500 mb-1">{category}</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => toggleToolFilter(tag.id)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            selectedToolIds.includes(tag.id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-zinc-800 text-gray-300 border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Grid */}
      {isLoading && tiles.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : tiles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400">No profiles found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tiles.map((tile) => (
              <Card
                key={tile.id}
                className="p-4 bg-zinc-900 border-white hover:border-zinc-500 transition-colors"
              >
                <div className="flex flex-col gap-3">
                  {/* Avatar and Name */}
                  <div className="flex items-start gap-3">
                    <Link href={`/u/${tile.handle}`}>
                      <Avatar className="h-12 w-12 border border-zinc-700">
                        <AvatarFallback className="bg-zinc-800 text-white">
                          {tile.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${tile.handle}`}>
                        <h3 className="font-semibold text-white truncate hover:underline">
                          {tile.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-400 truncate">@{tile.handle}</p>
                    </div>
                  </div>

                  {/* Role Title */}
                  {tile.roleTitle && (
                    <p className="text-sm text-gray-300 line-clamp-2">{tile.roleTitle}</p>
                  )}

                  {/* Location */}
                  {tile.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{tile.location}</span>
                    </div>
                  )}

                  {/* Featured Skills */}
                  {tile.featuredSkills.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium">Top Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {tile.featuredSkills.map((skill) => (
                          <Badge
                            key={skill.id}
                            variant="secondary"
                            className="text-xs bg-zinc-800 text-gray-300"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Featured Tools */}
                  {tile.featuredTools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tile.featuredTools.map((tool) => (
                        <Badge
                          key={tool.id}
                          variant="outline"
                          className="text-xs border-zinc-700 text-gray-400"
                        >
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Active Project Badge */}
                  {tile.activeProject && (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <Briefcase className="h-3 w-3" />
                      <span className="truncate">Active: {tile.activeProject.title}</span>
                    </div>
                  )}

                  {/* Follow Button */}
                  <Button
                    variant={tile.isFollowing ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleFollow(tile.id)}
                    className="w-full mt-2"
                  >
                    {tile.isFollowing ? "Following" : "Follow"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!hasMore && tiles.length > 0 && (
            <p className="text-center text-gray-500 py-8">No more profiles to load</p>
          )}
        </>
      )}
    </div>
  );
}
