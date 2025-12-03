import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Trophy } from "lucide-react";
import { AvatarStack } from "@/components/team-journey/avatar-stack";
import { Product } from "@/types/team-journey";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card
      className={`w-full h-full flex flex-col transition-all duration-200 ${
        product.isCurrentUserMember
          ? "ring-2 ring-[#0000ff]/20 border-[#0000ff]/30 bg-[#0000ff]/5"
          : ""
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 mr-3">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <div className="h-10 overflow-hidden">
              <p
                className="text-sm text-muted-foreground leading-5"
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
                ? "bg-[#ff78c8]/10 text-[#ff78c8] hover:bg-[#ff78c8]/20 border-[#ff78c8]/20"
                : "bg-muted text-muted-foreground"
            }
          >
            {product.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4 flex-grow">
        {/* Metrics */}
        <div className="space-y-4">
          {/* Clients */}
          <div className="flex items-center gap-3 border border-border p-2 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {product.customers.count}
              </div>
              <div className="text-xs text-muted-foreground">Clients</div>
            </div>
          </div>

          {/* Revenue */}
          <div className="flex items-center gap-3 border border-border p-2 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                ${product.revenue.amount}
              </div>
              <div className="text-xs text-muted-foreground">
                {product.revenue.label}
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="flex items-center gap-3 border border-border p-2 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {product.points.amount.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Points Earned</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between mt-auto">
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
      </CardFooter>
    </Card>
  );
}
