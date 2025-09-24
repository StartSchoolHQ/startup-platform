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
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          </div>
          <Badge
            variant={product.status === "Active" ? "default" : "secondary"}
            className={
              product.status === "Active"
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-gray-100 text-gray-800"
            }
          >
            {product.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {/* Metrics */}
        <div className="space-y-4">
          {/* Clients */}
          <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-sm">
                {product.customers.count}
              </div>
              <div className="text-xs text-muted-foreground">Clients</div>
            </div>
          </div>

          {/* Revenue */}
          <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
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
          <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-orange-100">
              <Trophy className="h-4 w-4 text-orange-600" />
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

      <CardFooter className="pt-0 flex items-center justify-between">
        {/* Team Members Avatar Stack */}
        <AvatarStack users={product.teamMembers} maxVisible={4} size="md" />

        {/* View Product Button */}
        <Button
          className="bg-black text-white hover:bg-gray-800"
          size="sm"
          asChild
        >
          <a href={`/dashboard/team-journey/${product.id}`}>View Product</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
