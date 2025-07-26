import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/auth-modal";
import Sidebar from "@/components/sidebar";
import EmailList from "@/components/email-list";
import ChatAssistant from "@/components/chat-assistant";
import type { Email, User } from "@shared/schema";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication on mount
  useEffect(() => {
    // Check for OAuth callback with user data in URL
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Start initial email sync
        setTimeout(() => {
          syncEmailsMutation.mutate();
        }, 1000);
        
        toast({
          title: "Welcome!",
          description: "Successfully connected to your Office 365 account.",
        });
        
        return;
      } catch (error) {
        console.error("Failed to parse user data from URL:", error);
      }
    }
    
    // Check for existing stored authentication
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        return;
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("user");
      }
    }
    
    // Show authentication modal if no valid user found
    setShowAuthModal(true);
  }, []);

  // Fetch emails
  const { data: emails = [], isLoading: emailsLoading, refetch: refetchEmails } = useQuery<Email[]>({
    queryKey: ["/api/emails", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Sync emails mutation
  const syncEmailsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      const response = await apiRequest("POST", `/api/emails/sync/${user.id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails", user?.id] });
      toast({
        title: "Emails synced",
        description: "Your emails have been synchronized successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: "Failed to sync emails. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async ({ emailId, updates }: { emailId: string; updates: Partial<Email> }) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update email. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAuthenticate = async (accessToken: string, userData: any) => {
    try {
      // If userData is provided (from popup), use it directly
      if (userData && userData.id) {
        setUser(userData);
        setIsAuthenticated(true);
        setShowAuthModal(false);
        
        // Start initial email sync
        setTimeout(() => {
          syncEmailsMutation.mutate();
        }, 1000);
        
        toast({
          title: "Welcome!",
          description: "Successfully connected to your Office 365 account.",
        });
        
        return;
      }
      
      // Fallback to API call (legacy)
      const response = await apiRequest("POST", "/api/auth/microsoft", {
        accessToken,
        refreshToken: "refresh_token_placeholder",
        profile: userData
      });
      
      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      setTimeout(() => {
        syncEmailsMutation.mutate();
      }, 1000);
      
      toast({
        title: "Welcome!",
        description: "Successfully connected to your Office 365 account.",
      });
      
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: "Failed to authenticate with Office 365. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEmailUpdate = (emailId: string, updates: Partial<Email>) => {
    updateEmailMutation.mutate({ emailId, updates });
  };

  const handleRefresh = () => {
    syncEmailsMutation.mutate();
  };

  // Filter emails by folder and search
  const filteredEmails = emails.filter(email => {
    const matchesFolder = selectedFolder === "inbox" ? email.folder === "inbox" :
                         selectedFolder === "sent" ? email.folder === "sent" :
                         selectedFolder === "important" ? email.isImportant :
                         selectedFolder === "urgent" ? email.category === "urgent" :
                         selectedFolder === "meeting" ? email.category === "meeting" :
                         selectedFolder === "task" ? email.category === "task" :
                         selectedFolder === "follow-up" ? email.category === "follow-up" :
                         true;

    const matchesSearch = searchQuery === "" || 
                         email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         email.body.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFolder && matchesSearch;
  });

  // Calculate email counts for sidebar
  const emailCounts = {
    inbox: emails.filter(e => e.folder === "inbox" && !e.isRead).length,
    sent: emails.filter(e => e.folder === "sent").length,
    drafts: 0, // Not implemented yet
    important: emails.filter(e => e.isImportant).length,
    deleted: 0, // Not implemented yet
    urgent: emails.filter(e => e.category === "urgent").length,
    meeting: emails.filter(e => e.category === "meeting").length,
    task: emails.filter(e => e.category === "task").length,
    "follow-up": emails.filter(e => e.category === "follow-up").length,
  };

  if (!isAuthenticated) {
    return (
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticate={handleAuthenticate}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-ms-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 ms-blue rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-ms-gray-500">AI Email Organizer</h1>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-ms-gray-100 rounded-lg px-3 py-2 w-96">
            <Search className="w-4 h-4 text-ms-gray-300 mr-2" />
            <Input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent flex-1 outline-none text-sm border-none focus:ring-0"
            />
            <kbd className="hidden lg:inline-block px-2 py-1 text-xs bg-white rounded border text-ms-gray-300">⌘K</kbd>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden p-2 text-ms-gray-400"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-ms-gray-400 hover:text-ms-gray-500 rounded-lg hover:bg-ms-gray-100"
          >
            <Bell className="w-5 h-5" />
            {emailCounts.inbox > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-ms-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {emailCounts.inbox > 9 ? "9+" : emailCounts.inbox}
              </Badge>
            )}
          </Button>

          {/* User Profile */}
          <div className="flex items-center space-x-2 cursor-pointer">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" alt={user?.username} />
              <AvatarFallback className="bg-ms-blue text-white text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium text-ms-gray-500">
              {user?.username}
            </span>
            <ChevronDown className="w-4 h-4 text-ms-gray-300" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          className={isMobileMenuOpen ? "block" : "hidden md:flex"}
          selectedFolder={selectedFolder}
          onFolderChange={setSelectedFolder}
          emailCounts={emailCounts}
        />

        {/* Center Panel - Email List */}
        <EmailList
          emails={filteredEmails}
          selectedFolder={selectedFolder}
          onEmailUpdate={handleEmailUpdate}
          onRefresh={handleRefresh}
          isLoading={emailsLoading || syncEmailsMutation.isPending}
        />

        {/* Right Panel - AI Chat Assistant */}
        <ChatAssistant
          userId={user?.id || ""}
          className="hidden lg:flex"
        />
      </div>
    </div>
  );
}
