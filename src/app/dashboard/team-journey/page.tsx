"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { ProductCard } from "@/components/team-journey/product-card";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/contexts/app-context";
import {
  getAllTeamsForJourney,
  getUserTeamsForJourney,
  getArchivedTeamsForJourney,
  transformTeamToProduct,
} from "@/lib/database";
import type { DatabaseTeam } from "@/lib/database";
import { Product } from "@/types/team-journey";

type SortOption = "name" | "date" | "status" | "revenue";
type SortOrder = "asc" | "desc";

export default function TeamJourneyPage() {
  const { user } = useAppContext();
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Separate state for input value
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const sortOrder: SortOrder = "desc"; // Fixed sort order for now

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const options = {
        searchQuery: searchQuery || undefined,
        sortBy,
        sortOrder,
        status: "all" as const,
      };

      // Load all products
      const allTeams = await getAllTeamsForJourney(user.id, options);
      setAllProducts(
        allTeams
          .filter((team) => Array.isArray(team.team_members))
          .map((team) =>
            transformTeamToProduct(team as unknown as DatabaseTeam, user.id)
          )
        // ...existing code...
      );

      // Load user's products
      const userTeams = await getUserTeamsForJourney(user.id, options);
      setMyProducts(
        userTeams
          .filter((team) => Array.isArray(team.team_members))
          .map((team) =>
            transformTeamToProduct(team as unknown as DatabaseTeam, user.id)
          )
        // ...existing code...
      );

      // Load archived products
      const archivedTeams = await getArchivedTeamsForJourney(user.id, {
        searchQuery: searchQuery || undefined,
        sortBy,
        sortOrder,
      });
      setArchivedProducts(
        archivedTeams
          .filter((team) => Array.isArray(team.team_members))
          .map((team) =>
            transformTeamToProduct(team as unknown as DatabaseTeam, user.id)
          )
        // ...existing code...
      );
    } catch (error) {
      console.error("Error loading team data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const handleSearch = (value: string) => {
    setSearchInput(value); // Update input value immediately for UI responsiveness
  };

  const handleSort = (value: string) => {
    setSortBy(value as SortOption);
  };

  const handleTeamCreated = () => {
    // Refresh data when a new team is created
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Products</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Products</h1>
      </div>

      {/* Tabs and Controls */}
      <div className="space-y-4">
        {/* Tabs */}
        <Tabs defaultValue="all-products" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="all-products">All Products</TabsTrigger>
              <TabsTrigger value="my-products">My Products</TabsTrigger>
              <TabsTrigger value="archive">Archive</TabsTrigger>
            </TabsList>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-64"
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={handleSort}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                </SelectContent>
              </Select>

              {/* Add Product */}
              <Button
                className="gap-2 bg-foreground text-background hover:bg-foreground/80"
                onClick={() => setShowCreateTeamDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent value="all-products" className="space-y-4 mt-6">
            {allProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-products" className="space-y-4 mt-6">
            {myProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                You haven&apos;t created any products yet. Click &quot;Add
                Product&quot; to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-4 mt-6">
            {archivedProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No archived products
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Team Creation Dialog */}
        <CreateTeamDialog
          open={showCreateTeamDialog}
          onOpenChange={setShowCreateTeamDialog}
          onTeamCreated={handleTeamCreated}
        />
      </div>
    </div>
  );
}
