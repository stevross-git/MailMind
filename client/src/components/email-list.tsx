import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Star, 
  Archive, 
  RefreshCw, 
  Settings,
  CircleAlert,
  Calendar,
  CheckSquare,
  Reply
} from "lucide-react";
import type { Email } from "@shared/schema";

interface EmailListProps {
  emails: Email[];
  selectedFolder: string;
  onEmailUpdate: (emailId: string, updates: Partial<Email>) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "urgent":
      return <CircleAlert className="w-3 h-3 mr-1" />;
    case "meeting":
      return <Calendar className="w-3 h-3 mr-1" />;
    case "task":
      return <CheckSquare className="w-3 h-3 mr-1" />;
    case "follow-up":
      return <Reply className="w-3 h-3 mr-1" />;
    default:
      return null;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "urgent":
      return "bg-ms-red bg-opacity-10 text-ms-red";
    case "meeting":
      return "ms-blue bg-opacity-10 text-ms-blue";
    case "task":
      return "bg-ms-green bg-opacity-10 text-ms-green";
    case "follow-up":
      return "bg-ms-orange bg-opacity-10 text-ms-orange";
    default:
      return "bg-ms-gray-200 text-ms-gray-400";
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatTime = (date: Date) => {
  const now = new Date();
  const emailDate = new Date(date);
  const diffInHours = (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInHours * 60);
    return `${minutes} min ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return emailDate.toLocaleDateString();
  }
};

export default function EmailList({ 
  emails, 
  selectedFolder, 
  onEmailUpdate, 
  onRefresh, 
  isLoading = false 
}: EmailListProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "unread" | "flagged">("all");

  const filteredEmails = emails.filter(email => {
    if (filter === "unread") return !email.isRead;
    if (filter === "flagged") return email.isFlagged;
    return true;
  });

  const unreadCount = emails.filter(email => !email.isRead).length;

  const handleEmailSelect = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails);
    if (checked) {
      newSelected.add(emailId);
    } else {
      newSelected.delete(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const handleStarToggle = (email: Email) => {
    onEmailUpdate(email.id, { isFlagged: !email.isFlagged });
  };

  return (
    <main className="flex-1 flex flex-col bg-white">
      {/* Email List Header */}
      <div className="border-b border-ms-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-ms-gray-500 capitalize">
              {selectedFolder}
            </h2>
            {unreadCount > 0 && (
              <span className="text-sm text-ms-gray-300">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter Buttons */}
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1 text-sm rounded-lg",
                filter === "all" 
                  ? "bg-ms-gray-100 text-ms-gray-400" 
                  : "text-ms-gray-400 hover:bg-ms-gray-100"
              )}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1 text-sm rounded-lg",
                filter === "unread" 
                  ? "bg-ms-gray-100 text-ms-gray-400" 
                  : "text-ms-gray-400 hover:bg-ms-gray-100"
              )}
            >
              Unread
            </Button>
            <Button
              variant={filter === "flagged" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("flagged")}
              className={cn(
                "px-3 py-1 text-sm rounded-lg",
                filter === "flagged" 
                  ? "bg-ms-gray-100 text-ms-gray-400" 
                  : "text-ms-gray-400 hover:bg-ms-gray-100"
              )}
            >
              Flagged
            </Button>

            {/* Actions */}
            <div className="border-l border-ms-gray-200 ml-2 pl-2 flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-ms-gray-400 hover:text-ms-gray-500 rounded-lg hover:bg-ms-gray-100"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-ms-gray-400 hover:text-ms-gray-500 rounded-lg hover:bg-ms-gray-100"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmails.length === 0 ? (
          <div className="p-8 text-center text-ms-gray-300">
            <div className="w-12 h-12 mx-auto mb-4 opacity-50 flex items-center justify-center">
              📥
            </div>
            <p className="text-lg font-medium mb-2">No emails found</p>
            <p className="text-sm">
              {filter !== "all" 
                ? `No ${filter} emails in your ${selectedFolder}` 
                : `Your ${selectedFolder} is empty`}
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = selectedEmails.has(email.id);
            const senderName = email.from.split('@')[0] || email.from;
            
            return (
              <div
                key={email.id}
                className={cn(
                  "border-b border-ms-gray-200 p-4 hover:bg-ms-gray-100 cursor-pointer transition-colors",
                  !email.isRead && "bg-blue-50 bg-opacity-30"
                )}
                onClick={() => onEmailUpdate(email.id, { isRead: true })}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleEmailSelect(email.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="" alt={senderName} />
                        <AvatarFallback className={cn(
                          "text-xs font-medium",
                          email.category === "urgent" && "bg-ms-red bg-opacity-10 text-ms-red"
                        )}>
                          {getInitials(senderName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <span className={cn(
                        "font-medium",
                        email.isRead ? "text-ms-gray-400" : "text-ms-gray-500"
                      )}>
                        {senderName}
                      </span>
                      
                      {email.category && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-ms-red rounded-full" />
                          <span className="text-xs text-ms-red font-medium">
                            {email.category.toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <span className="text-xs text-ms-gray-300 ml-auto">
                        {formatTime(email.receivedAt)}
                      </span>
                    </div>
                    
                    <h3 className={cn(
                      "font-medium mb-1",
                      email.isRead ? "text-ms-gray-400" : "text-ms-gray-500"
                    )}>
                      {email.subject}
                    </h3>
                    
                    <p className={cn(
                      "text-sm line-clamp-2",
                      email.isRead ? "text-ms-gray-300" : "text-ms-gray-400"
                    )}>
                      {email.aiSummary || email.bodyPreview}
                    </p>
                    
                    {(email.category || email.priority) && (
                      <div className="flex items-center space-x-2 mt-2">
                        {email.category && (
                          <Badge className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs",
                            getCategoryColor(email.category)
                          )}>
                            {getCategoryIcon(email.category)}
                            {email.category === "urgent" ? "High Priority" : 
                             email.category === "meeting" ? "Meeting Request" :
                             email.category === "task" ? "Task Assignment" :
                             email.category === "follow-up" ? "Follow-up" :
                             email.category}
                          </Badge>
                        )}
                        
                        {email.priority && email.priority > 3 && (
                          <Badge className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-ms-orange bg-opacity-10 text-ms-orange">
                            High Priority
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarToggle(email);
                      }}
                      className={cn(
                        "p-1 rounded hover:bg-ms-gray-200",
                        email.isFlagged 
                          ? "text-ms-orange hover:text-ms-orange" 
                          : "text-ms-gray-300 hover:text-ms-orange"
                      )}
                    >
                      <Star className={cn("w-4 h-4", email.isFlagged && "fill-current")} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmailUpdate(email.id, { folder: "archive" });
                      }}
                      className="p-1 text-ms-gray-300 hover:text-ms-gray-500 rounded hover:bg-ms-gray-200"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
