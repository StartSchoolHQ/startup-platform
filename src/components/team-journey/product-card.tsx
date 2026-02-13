import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Trophy, ExternalLink } from "lucide-react";
import { AvatarStack } from "@/components/team-journey/avatar-stack";
import { Product } from "@/types/team-journey";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card
      className={`flex h-full w-full max-w-[500px] flex-col transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
        product.isCurrentUserMember
          ? "border-[#0000ff]/30 bg-[#0000ff]/5 ring-2 ring-[#0000ff]/20"
          : ""
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="mr-3 flex-1 space-y-1">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <div className="h-10 overflow-hidden">
              <p
                className="text-muted-foreground text-sm leading-5"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {product.description}
              </p>
            </div>
          </div>
          <Badge
            variant={product.status === "Active" ? "default" : "secondary"}
            className={
              product.status === "Active"
                ? "border-[#ff78c8]/20 bg-[#ff78c8]/10 text-[#ff78c8] hover:bg-[#ff78c8]/20"
                : "bg-muted text-muted-foreground"
            }
          >
            {product.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 pb-4">
        {/* Metrics */}
        <div className="space-y-4">
          {/* Clients */}
          <div className="border-border flex items-center gap-3 rounded-md border p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <Users className="h-4 w-4 text-black dark:text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                {product.customers.count}
              </div>
              <div className="text-muted-foreground text-xs">Members</div>
            </div>
          </div>

          {/* Revenue */}
          <div className="border-border flex items-center gap-3 rounded-md border p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <DollarSign className="h-4 w-4 text-black dark:text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                ${product.revenue.amount}
              </div>
              <div className="text-muted-foreground text-xs">
                {product.revenue.label}
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="border-border flex items-center gap-3 rounded-md border p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <Trophy className="h-4 w-4 text-black dark:text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                {product.points.amount.toLocaleString()}
              </div>
              <div className="text-muted-foreground text-xs">Points Earned</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-3 pt-0">
        {/* Website Link (if available) */}
        {product.website && (
          <div className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2"
              asChild
            >
              <a
                href={
                  product.website.startsWith("http")
                    ? product.website
                    : `https://${product.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Visit Website
              </a>
            </Button>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex w-full items-center justify-between">
          {/* Team Members Avatar Stack */}
          <AvatarStack users={product.teamMembers} maxVisible={4} size="md" />

          {/* View Product Button */}
          <Button
            className="bg-foreground text-background hover:bg-foreground/90"
            size="sm"
            asChild
          >
            <Link href={`/dashboard/team-journey/${product.id}`}>
              View Product
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
