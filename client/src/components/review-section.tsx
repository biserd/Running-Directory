import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetReviews, apiGetReviewSummary, apiGetMyReview, apiSubmitReview, apiDeleteReview } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Star, Trash2, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";

function StarRating({ rating, onRate, interactive = false, size = "md" }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const px = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => onRate?.(star)}
          data-testid={`star-${star}`}
        >
          <Star
            className={`${px} transition-colors ${
              star <= (hover || rating)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingSummary({ itemType, itemId }: { itemType: string; itemId: number }) {
  const { data: summary } = useQuery({
    queryKey: ["/api/reviews/summary", itemType, itemId],
    queryFn: () => apiGetReviewSummary(itemType, itemId),
  });

  if (!summary || summary.count === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <StarRating rating={0} size="sm" />
        <span>No reviews yet</span>
      </div>
    );
  }

  const avg = Math.round(summary.avgRating * 10) / 10;

  return (
    <div className="flex items-center gap-2" data-testid="review-summary">
      <StarRating rating={Math.round(avg)} size="sm" />
      <span className="font-semibold text-sm" data-testid="text-avg-rating">{avg}</span>
      <span className="text-sm text-muted-foreground" data-testid="text-review-count">
        ({summary.count} {summary.count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}

function ReviewForm({ itemType, itemId, existingReview, onCancel }: {
  itemType: string;
  itemId: number;
  existingReview?: { rating: number; comment?: string | null } | null;
  onCancel?: () => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: apiSubmitReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/summary", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/mine", itemType, itemId] });
      onCancel?.();
    },
  });

  return (
    <div className="bg-muted/30 border rounded-lg p-4 space-y-3" data-testid="review-form">
      <div>
        <label className="text-sm font-medium mb-1 block">Your Rating</label>
        <StarRating rating={rating} onRate={setRating} interactive size="md" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          data-testid="input-review-comment"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={rating === 0 || submitMutation.isPending}
          onClick={() => submitMutation.mutate({ itemType, itemId, rating, comment: comment || undefined })}
          data-testid="button-submit-review"
        >
          {submitMutation.isPending ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-review">
            Cancel
          </Button>
        )}
      </div>
      {submitMutation.isError && (
        <p className="text-sm text-destructive">{submitMutation.error.message}</p>
      )}
    </div>
  );
}

function ReviewItem({ review, isOwner, itemType, itemId }: {
  review: { id: number; rating: number; comment?: string | null; userName: string | null; createdAt: string | Date | null; userId: number };
  isOwner: boolean;
  itemType: string;
  itemId: number;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteReview(review.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/summary", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/mine", itemType, itemId] });
    },
  });

  return (
    <div className="border-b last:border-0 py-4 first:pt-0" data-testid={`review-item-${review.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium" data-testid={`text-reviewer-${review.id}`}>
              {review.userName || "Anonymous Runner"}
            </span>
            {review.createdAt && (
              <span className="text-xs text-muted-foreground ml-2">
                {format(new Date(review.createdAt), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-review-${review.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground mt-2 ml-10" data-testid={`text-review-comment-${review.id}`}>
          {review.comment}
        </p>
      )}
    </div>
  );
}

export function ReviewSection({ itemType, itemId }: { itemType: "race" | "route"; itemId: number }) {
  const { user, openLogin } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: reviewsList } = useQuery({
    queryKey: ["/api/reviews", itemType, itemId],
    queryFn: () => apiGetReviews(itemType, itemId),
  });

  const { data: myReview } = useQuery({
    queryKey: ["/api/reviews/mine", itemType, itemId],
    queryFn: () => apiGetMyReview(itemType, itemId),
    enabled: !!user,
  });

  const hasMyReview = myReview && myReview.id;

  return (
    <section data-testid="section-reviews">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-2xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Reviews
        </h2>
        <RatingSummary itemType={itemType} itemId={itemId} />
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        {user ? (
          <>
            {!hasMyReview && !showForm && (
              <Button
                variant="outline"
                onClick={() => setShowForm(true)}
                className="mb-4"
                data-testid="button-write-review"
              >
                Write a Review
              </Button>
            )}
            {hasMyReview && !showForm && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Your review</p>
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={myReview.rating} size="sm" />
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={() => setShowForm(true)}
                    data-testid="button-edit-review"
                  >
                    Edit
                  </Button>
                </div>
                {myReview.comment && (
                  <p className="text-sm text-muted-foreground">{myReview.comment}</p>
                )}
              </div>
            )}
            {showForm && (
              <div className="mb-4">
                <ReviewForm
                  itemType={itemType}
                  itemId={itemId}
                  existingReview={hasMyReview ? myReview : null}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Sign in to leave a review</p>
            <Button variant="outline" size="sm" onClick={openLogin} data-testid="button-login-to-review">
              Sign In
            </Button>
          </div>
        )}

        {reviewsList && reviewsList.length > 0 ? (
          <div data-testid="reviews-list">
            {reviewsList.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                isOwner={user?.id === review.userId}
                itemType={itemType}
                itemId={itemId}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-reviews">
            No reviews yet. Be the first to share your experience!
          </p>
        )}
      </div>
    </section>
  );
}
