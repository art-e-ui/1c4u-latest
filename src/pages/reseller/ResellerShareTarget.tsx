import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ResellerShareTarget() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const title = searchParams.get("title");
    const text = searchParams.get("text");
    const url = searchParams.get("url");

    console.log("Shared content:", { title, text, url });

    // In a real app, you might want to save this to a "draft" or "inbox"
    // For now, we'll just redirect to the dashboard with a success message
    // or stay here for a moment to show we received it.
    
    const timer = setTimeout(() => {
      navigate("/reseller/dashboard", { 
        state: { 
          message: "Content shared successfully!",
          sharedData: { title, text, url }
        } 
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Processing Shared Content</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <LoadingSpinner size={32} />
          <p className="text-muted-foreground text-center">
            We're processing the content you shared. You'll be redirected to your dashboard shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
