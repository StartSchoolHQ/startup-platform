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
import { Search, Plus, Package, PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/team-journey/product-card";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { TeamListSkeleton } from "@/components/ui/team-list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/contexts/app-context";
import {
  getAllTeamsForJourney,
  getUserTeamsForJourney,
  getArchivedTeamsForJourney,
  transformTeamToProduct,
} from "@/lib/database";
import type { DatabaseTeam } from "@/lib/database";
import { Product } from "@/types/team-journey";

type SortOption = "name" | "date" | "status";
type SortOrder = "asc" | "desc";

export default function TeamJourneyPage() {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Separate state for input value
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [activeTab, setActiveTab] = useState("all-products");
  const sortOrder: SortOrder = "desc"; // Fixed sort order for now

  // React Query: All products
  const { data: allProducts = [], isPending: isLoadingAll } = useQuery({
    queryKey: ["teamJourney", "all", user?.id],
    queryFn: async () => {
      const options = { status: "all" as const };
      const allTeams = await getAllTeamsForJourney(user!.id, options);
      return (allTeams as DatabaseTeam[])
        .filter((team) => team && Array.isArray(team.team_members))
        .map((team) => transformTeamToProduct(team, user!.id));
    },
    enabled: !!user?.id,
  });

  // React Query: User's products
  const { data: myProducts = [], isPending: isLoadingMy } = useQuery({
    queryKey: ["teamJourney", "my", user?.id],
    queryFn: async () => {
      const options = { status: "all" as const };
      const userTeams = await getUserTeamsForJourney(user!.id, options);
      return (userTeams as DatabaseTeam[])
        .filter((team) => team && Array.isArray(team.team_members))
        .map((team) => transformTeamToProduct(team, user!.id));
    },
    enabled: !!user?.id,
  });

  // React Query: Archived products
  const { data: archivedProducts = [], isPending: isLoadingArchived } =
    useQuery({
      queryKey: ["teamJourney", "archived", user?.id],
      queryFn: async () => {
        const archivedTeams = await getArchivedTeamsForJourney(user!.id, {});
        return (archivedTeams as DatabaseTeam[])
          .filter((team) => team && Array.isArray(team.team_members))
          .map((team) => transformTeamToProduct(team, user!.id));
      },
      enabled: !!user?.id,
    });

  const loading = isLoadingAll || isLoadingMy || isLoadingArchived;

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
    queryClient.invalidateQueries({ queryKey: ["teamJourney"] });
  };

  // Client-side sorting function
  const sortProducts = (products: Product[]) => {
    const sorted = [...products];

    sorted.sort((a, b) => {
      // Always prioritize user's teams first
      if (a.isCurrentUserMember && !b.isCurrentUserMember) return -1;
      if (!a.isCurrentUserMember && b.isCurrentUserMember) return 1;

      // Then apply the selected sort
      let comparison = 0;

      switch (sortBy) {
        case "name":
          // A→Z alphabetical
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          // Sort by name if date field not available
          comparison = a.name.localeCompare(b.name);
          break;
        case "status":
          // Alphabetical (Active → Archived, etc.)
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          // Default: sort by name
          comparison = a.name.localeCompare(b.name);
      }

      return comparison;
    });

    return sorted;
  };

  // Client-side filtering function
  const filterProducts = (products: Product[]) => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query),
    );
  };

  // Get sorted and filtered products for each tab
  const filteredAllProducts = sortProducts(filterProducts(allProducts));
  const filteredMyProducts = sortProducts(filterProducts(myProducts));
  const filteredArchivedProducts = sortProducts(
    filterProducts(archivedProducts),
  );

  // Get header text based on active tab
  const getHeaderText = () => {
    switch (activeTab) {
      case "all-products":
        return "All Products";
      case "my-products":
        return "My Products";
      case "archive":
        return "Archive";
      default:
        return "All Products";
    }
  };

  if (loading) {
    return <TeamListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{getHeaderText()}</h1>
      </div>

      {/* Tabs and Controls */}
      <div className="space-y-4">
        {/* Tabs */}
        <Tabs
          defaultValue="all-products"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex items-center justify-between">
            <TabsList className="grid w-[380px] grid-cols-3">
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
                </SelectContent>
              </Select>

              {/* Add Product */}
              <Button
                className="gap-2 bg-[#ff78c8] hover:bg-[#ff78c8]/90 text-white"
                onClick={() => setShowCreateTeamDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent
            value="all-products"
            className="space-y-4 mt-6 min-h-[600px]"
          >
            {filteredAllProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title={searchQuery ? "No Products Found" : "No Products Yet"}
                description={
                  searchQuery
                    ? `No products match "${searchQuery}". Try adjusting your search.`
                    : "No products have been created yet. Be the first to start a new product!"
                }
                action={
                  searchQuery
                    ? {
                        label: "Clear Search",
                        onClick: () => {
                          setSearchQuery("");
                          setSearchInput("");
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAllProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="my-products"
            className="space-y-4 mt-6 min-h-[600px]"
          >
            {filteredMyProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title={searchQuery ? "No Products Found" : "No Products Yet"}
                description={
                  searchQuery
                    ? `No products match "${searchQuery}". Try adjusting your search.`
                    : "You haven't created or joined any products yet. Click 'Add Product' to get started!"
                }
                action={
                  searchQuery
                    ? {
                        label: "Clear Search",
                        onClick: () => {
                          setSearchQuery("");
                          setSearchInput("");
                        },
                      }
                    : {
                        label: "Add Product",
                        onClick: () => setShowCreateTeamDialog(true),
                      }
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMyProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-4 mt-6 min-h-[600px]">
            {filteredArchivedProducts.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title={
                  searchQuery
                    ? "No Archived Products Found"
                    : "No Archived Products"
                }
                description={
                  searchQuery
                    ? `No archived products match "${searchQuery}". Try adjusting your search.`
                    : "You don't have any archived products. Archived products will appear here."
                }
                action={
                  searchQuery
                    ? {
                        label: "Clear Search",
                        onClick: () => {
                          setSearchQuery("");
                          setSearchInput("");
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArchivedProducts.map((product) => (
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
