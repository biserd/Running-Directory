import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiCheckFavorite, apiAddFavorite, apiRemoveFavorite } from "@/lib/api";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  itemType: "race" | "route";
  itemId: number;
  size?: "sm" | "md";
  className?: string;
}

export function FavoriteButton({ itemType, itemId, size = "md", className }: FavoriteButtonProps) {
  const { user, openLogin } = useAuth();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const { data } = useQuery({
    queryKey: ["/api/favorites/check", itemType, itemId],
    queryFn: () => apiCheckFavorite(itemType, itemId),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const isFavorited = optimistic !== null ? optimistic : data?.isFavorited ?? false;

  useEffect(() => {
    setOptimistic(null);
  }, [data?.isFavorited]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openLogin();
      return;
    }

    const newState = !isFavorited;
    setOptimistic(newState);

    try {
      if (newState) {
        await apiAddFavorite(itemType, itemId);
      } else {
        await apiRemoveFavorite(itemType, itemId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    } catch {
      setOptimistic(null);
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        buttonSize,
        "rounded-full transition-colors",
        isFavorited
          ? "text-red-500 hover:text-red-600 hover:bg-red-50"
          : "text-muted-foreground hover:text-red-500 hover:bg-red-50",
        className
      )}
      onClick={handleClick}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      data-testid={`button-favorite-${itemType}-${itemId}`}
    >
      <Heart className={cn(iconSize, isFavorited && "fill-current")} />
    </Button>
  );
}
