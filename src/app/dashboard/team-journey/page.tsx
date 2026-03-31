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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/app-context";
import {
  getAllTeamsForJourney,
  getUserTeamsForJourney,
  getArchivedTeamsForJourney,
  transformTeamToProduct,
} from "@/lib/database";
import type { DatabaseTeam } from "@/lib/database";
import { Product } from "@/types/team-journey";

type SortOption = "name" | "status";

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, k) => (
                  <Skeleton
                    key={k}
                    className="border-background h-8 w-8 rounded-full border-2"
                  />
                ))}
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TeamJourneyPage() {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Separate state for input value
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const validTabs = ["all-products", "my-products", "archive"];
  const tabFromUrl = searchParams.get("tab");
  const activeTab = validTabs.includes(tabFromUrl ?? "")
    ? tabFromUrl!
    : "all-products";

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "all-products") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, {
        scroll: false,
      });
    },
    [searchParams, router]
  );

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

  // Individual loading states used per-tab instead of a combined gate

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
        product.description?.toLowerCase().includes(query)
    );
  };

  // Get sorted and filtered products for each tab
  const filteredAllProducts = sortProducts(filterProducts(allProducts));
  const filteredMyProducts = sortProducts(filterProducts(myProducts));
  const filteredArchivedProducts = sortProducts(
    filterProducts(archivedProducts)
  );

  // Get header text based on active tab
  const getHeaderText = () => {
    switch (activeTab) {
      case "all-products":
        return "All Teams";
      case "my-products":
        return "My Teams";
      case "archive":
        return "Archive";
      default:
        return "All Teams";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">{getHeaderText()}</h1>
      </motion.div>

      {/* Tabs and Controls */}
      <div className="space-y-4">
        {/* Tabs */}
        <Tabs
          defaultValue="all-products"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full grid-cols-3 sm:w-fit">
              <TabsTrigger value="all-products">All Teams</TabsTrigger>
              <TabsTrigger value="my-products">My Teams</TabsTrigger>
              <TabsTrigger value="archive">Archive</TabsTrigger>
            </TabsList>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search..."
                  className="w-full pl-10 sm:w-64"
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={handleSort}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              {/* Add Product */}
              <Button
                className="gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                onClick={() => setShowCreateTeamDialog(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Product</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent
            value="all-products"
            className="mt-6 min-h-[600px] space-y-4"
          >
            {isLoadingAll ? (
              <CardGridSkeleton />
            ) : filteredAllProducts.length === 0 ? (
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAllProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="my-products"
            className="mt-6 min-h-[600px] space-y-4"
          >
            {isLoadingMy ? (
              <CardGridSkeleton />
            ) : filteredMyProducts.length === 0 ? (
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMyProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-6 min-h-[600px] space-y-4">
            {isLoadingArchived ? (
              <CardGridSkeleton />
            ) : filteredArchivedProducts.length === 0 ? (
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredArchivedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
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
