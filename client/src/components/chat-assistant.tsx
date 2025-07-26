import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Mic, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";

interface ChatAssistantProps {
  userId: string;
  className?: string;
}

interface ChatResponse {
  response: string;
}

const quickCommands = [
  "Summarize today",
  "Draft reply",
  "Find email"
];

const quickActions = [
  { label: "Summarize urgent emails", color: "text-ms-blue", bgColor: "bg-ms-blue bg-opacity-10 hover:bg-ms-blue hover:text-white" },
  { label: "Draft replies", color: "text-ms-green", bgColor: "bg-ms-green bg-opacity-10 hover:bg-ms-green hover:text-white" },
  { label: "Schedule emails", color: "text-ms-orange", bgColor: "bg-ms-orange bg-opacity-10 hover:bg-ms-orange hover:text-white" }
];

export default function ChatAssistant({ userId, className }: ChatAssistantProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", userId],
    enabled: !!userId
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string): Promise<ChatResponse> => {
      const response = await apiRequest("POST", `/api/chat/${userId}`, { content });
      return await response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", userId] });
      setMessage("");
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      setIsTyping(false);
    }
  });

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    sendMessageMutation.mutate(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(message);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <aside className={cn("w-80 bg-white border-l border-ms-gray-200 flex flex-col", className)}>
      {/* Chat Header */}
      <div className="border-b border-ms-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-ms-blue to-blue-400 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-ms-gray-500">AI Assistant</h3>
            <p className="text-xs text-ms-green">Online • Ready to help</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
          </div>
        ) : messages.length === 0 ? (
          <>
            {/* Welcome Message */}
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8 bg-gradient-to-br from-ms-blue to-blue-400">
                <AvatarFallback>
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-ms-gray-100 rounded-lg p-3 max-w-xs">
                <p className="text-sm text-ms-gray-500">
                  Hi! I'm your AI email assistant. I can help you analyze your emails, draft replies, and answer questions about your inbox. How can I help you today?
                </p>
                <span className="text-xs text-ms-gray-300 mt-2 block">Just now</span>
              </div>
            </div>

            {/* Quick Action Suggestions */}
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSendMessage(action.label)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg transition-colors",
                    action.bgColor,
                    action.color
                  )}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start space-x-3",
                msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
              )}
            >
              <Avatar className={cn(
                "w-8 h-8 flex-shrink-0",
                msg.role === "assistant" 
                  ? "bg-gradient-to-br from-ms-blue to-blue-400" 
                  : "bg-ms-gray-300"
              )}>
                <AvatarFallback>
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "rounded-lg p-3 max-w-xs",
                msg.role === "user" 
                  ? "ms-blue text-white text-right" 
                  : "bg-ms-gray-100"
              )}>
                <p className={cn(
                  "text-sm whitespace-pre-wrap",
                  msg.role === "user" ? "text-white" : "text-ms-gray-500"
                )}>
                  {msg.content}
                </p>
                <span className={cn(
                  "text-xs mt-2 block",
                  msg.role === "user" ? "text-blue-100" : "text-ms-gray-300"
                )}>
                  {formatTime(msg.timestamp!)}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8 bg-gradient-to-br from-ms-blue to-blue-400">
              <AvatarFallback>
                <Bot className="w-4 h-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-ms-gray-100 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-ms-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-ms-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-ms-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-ms-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Ask me about your emails..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              className="w-full border border-ms-gray-200 rounded-lg py-2 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ms-blue focus:border-transparent"
            />
            <Button
              onClick={() => handleSendMessage(message)}
              disabled={!message.trim() || sendMessageMutation.isPending}
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-ms-gray-300 hover:text-ms-blue p-1"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-ms-gray-300 hover:text-ms-gray-500 rounded-lg hover:bg-ms-gray-100"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Commands */}
        <div className="mt-3 flex flex-wrap gap-1 text-xs">
          {quickCommands.map((command, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => handleSendMessage(command)}
              className="px-2 py-1 bg-ms-gray-100 text-ms-gray-400 rounded hover:bg-ms-gray-200 text-xs"
            >
              {command}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}
