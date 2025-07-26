import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (accessToken: string, profile: any) => Promise<void>;
}

export default function AuthModal({ isOpen, onClose, onAuthenticate }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    try {
      // Get the OAuth URL from the backend
      const response = await fetch('/api/auth/microsoft/url');
      const data = await response.json();
      
      if (data.authUrl) {
        // Open Microsoft OAuth in a new window to avoid CORS issues
        const popup = window.open(
          data.authUrl,
          'microsoft-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Listen for the popup to close or receive a message
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setIsLoading(false);
            // Refresh the page to check for authentication
            window.location.reload();
          }
        }, 1000);
        
        // Listen for messages from the popup
        const messageListener = (event: MessageEvent) => {
          if (event.data.type === 'OAUTH_SUCCESS' && event.data.user) {
            clearInterval(checkClosed);
            popup?.close();
            window.removeEventListener('message', messageListener);
            setIsLoading(false);
            
            // Store user data and trigger authentication callback
            const userData = event.data.user;
            localStorage.setItem("user", JSON.stringify(userData));
            onAuthenticate("", userData); // Call the parent callback
            onClose(); // Close the modal
          }
        };
        
        window.addEventListener('message', messageListener);
      } else {
        throw new Error('Failed to get authentication URL');
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 ms-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-ms-gray-500">
            AI Email Organizer
          </DialogTitle>
          <DialogDescription className="text-ms-gray-400">
            Connect your Office 365 account to get started
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full ms-blue hover:ms-blue-dark text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
            </svg>
            <span>{isLoading ? "Signing in..." : "Sign in with Microsoft"}</span>
          </Button>

          <div className="text-xs text-ms-gray-300 text-center space-y-1">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
            <p>We only access your emails to provide AI assistance.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
