import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Inbox, 
  Send, 
  FileText, 
  Star, 
  Trash2, 
  Plus,
  Circle
} from "lucide-react";

interface SidebarProps {
  className?: string;
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  emailCounts: Record<string, number>;
}

const navigationItems = [
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
  { id: "sent", label: "Sent", icon: Send, countKey: "sent" },
  { id: "drafts", label: "Drafts", icon: FileText, countKey: "drafts" },
  { id: "important", label: "Important", icon: Star, countKey: "important" },
  { id: "deleted", label: "Deleted", icon: Trash2, countKey: "deleted" },
];

const aiCategories = [
  { id: "urgent", label: "Urgent", color: "bg-ms-red", countKey: "urgent" },
  { id: "meeting", label: "Meetings", color: "ms-blue", countKey: "meeting" },
  { id: "task", label: "Tasks", color: "bg-ms-green", countKey: "task" },
  { id: "follow-up", label: "Follow-up", color: "bg-ms-orange", countKey: "follow-up" },
];

export default function Sidebar({ className, selectedFolder, onFolderChange, emailCounts }: SidebarProps) {
  return (
    <aside className={cn("w-64 bg-white border-r border-ms-gray-200 flex flex-col", className)}>
      {/* Compose Button */}
      <div className="p-4">
        <Button className="w-full ms-blue hover:ms-blue-dark text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedFolder === item.id;
            const count = emailCounts[item.countKey] || 0;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onFolderChange(item.id)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg w-full text-left transition-colors",
                    isSelected 
                      ? "ms-blue text-white" 
                      : "text-ms-gray-400 hover:bg-ms-gray-100 hover:text-ms-gray-500"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {count > 0 && (
                    <Badge 
                      variant={isSelected ? "secondary" : "outline"}
                      className={cn(
                        "ml-auto text-xs px-2 py-1 rounded-full",
                        isSelected 
                          ? "bg-white bg-opacity-20 text-white border-white border-opacity-20" 
                          : "bg-transparent text-ms-gray-300"
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* AI Categories */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-ms-gray-300 uppercase tracking-wider mb-3">
            AI Categories
          </h3>
          <ul className="space-y-2">
            {aiCategories.map((category) => {
              const isSelected = selectedFolder === category.id;
              const count = emailCounts[category.countKey] || 0;

              return (
                <li key={category.id}>
                  <button
                    onClick={() => onFolderChange(category.id)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg w-full text-left transition-colors",
                      isSelected 
                        ? "ms-blue text-white" 
                        : "text-ms-gray-400 hover:bg-ms-gray-100 hover:text-ms-gray-500"
                    )}
                  >
                    <Circle className={cn("w-3 h-3", category.color)} />
                    <span>{category.label}</span>
                    {count > 0 && (
                      <Badge 
                        variant="outline"
                        className="ml-auto text-xs text-ms-gray-300 bg-transparent"
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
