
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import type { Contact, Message, MessageTemplate, SendMessageInput } from '../../../server/src/schema';

interface ChatInterfaceProps {
  userId: number;
  contact: Contact;
  templates: MessageTemplate[];
}

export function ChatInterface({ userId, contact, templates }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages
  const loadMessages = useCallback(async () => {
    try {
      const chatMessages = await trpc.getChatMessages.query({
        user_id: userId,
        contact_id: contact.id,
        limit: 50
      });
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [userId, contact.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsLoading(true);
    try {
      const messageData: SendMessageInput = {
        user_id: userId,
        contact_id: contact.id,
        content: messageText
      };

      // Note: Since sendMessage handler is a stub, this demonstrates the intended flow
      await trpc.sendMessage.mutate(messageData);
      
      // Optimistically add the message to the UI
      const newMessage: Message = {
        id: Date.now(), // Temporary ID
        user_id: userId,
        contact_id: contact.id,
        content: messageText,
        is_outbound: true,
        status: 'sent',
        whatsapp_message_id: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      setMessages((prev: Message[]) => [...prev, newMessage]);
      setMessageText('');
      
      // Reload messages to get the actual server response
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    if (template.variables && template.variables.length > 0) {
      const initialVariables: Record<string, string> = {};
      template.variables.forEach((variable: string) => {
        initialVariables[variable] = '';
      });
      setTemplateVariables(initialVariables);
      setIsTemplateDialogOpen(true);
    } else {
      setMessageText(template.content);
    }
  };

  const handleTemplateConfirm = () => {
    if (!selectedTemplate) return;

    let content = selectedTemplate.content;
    if (selectedTemplate.variables) {
      selectedTemplate.variables.forEach((variable: string) => {
        const value = templateVariables[variable] || `[${variable}]`;
        content = content.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
      });
    }

    setMessageText(content);
    setIsTemplateDialogOpen(false);
    setSelectedTemplate(null);
    setTemplateVariables({});
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-gray-500';
      case 'delivered': return 'text-blue-500';
      case 'read': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <span>💬</span>
            <span>Chat with {contact.first_name} {contact.last_name}</span>
          </h2>
          <p className="text-gray-600 flex items-center space-x-2">
            <span>📱 {contact.phone_number}</span>
            {contact.email && <span>• 📧 {contact.email}</span>}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {messages.length} messages
        </Badge>
      </div>

      {/* Chat Area */}
      <Card className="h-96">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Message History</CardTitle>
          <CardDescription>
            WhatsApp Business conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80 px-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-gray-600">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start a conversation with {contact.first_name}
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_outbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.is_outbound
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-75">
                          {message.created_at.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {message.is_outbound && (
                          <span className={`text-xs ${getStatusColor(message.status)}`}>
                            {getStatusIcon(message.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Send Message</CardTitle>
            {templates.length > 0 && (
              <Select onValueChange={(value) => {
                const template = templates.find(t => t.id === parseInt(value));
                if (template) handleTemplateSelect(template);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="📝 Use Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: MessageTemplate) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <Textarea
              value={messageText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageText(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {messageText.length}/1000 characters
              </p>
              <Button 
                type="submit" 
                disabled={isLoading || !messageText.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Sending...' : '📤 Send Message'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Template Variables Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Variables</DialogTitle>
            <DialogDescription>
              Fill in the variables for "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && selectedTemplate.variables && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded text-sm">
                <strong>Template:</strong> {selectedTemplate.content}
              </div>
              {selectedTemplate.variables.map((variable: string) => (
                <div key={variable} className="space-y-2">
                  <label className="block text-sm font-medium">
                    {variable}
                  </label>
                  <Input
                    value={templateVariables[variable] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTemplateVariables((prev: Record<string, string>) => ({
                        ...prev,
                        [variable]: e.target.value
                      }))
                    }
                    placeholder={`Enter ${variable}...`}
                  />
                </div>
              ))}
              <Separator />
              <div className="space-y-2">
                <strong className="text-sm">Preview:</strong>
                <div className="p-3 bg-blue-50 rounded text-sm">
                  {(() => {
                    let preview = selectedTemplate.content;
                    selectedTemplate.variables?.forEach((variable: string) => {
                      const value = templateVariables[variable] || `[${variable}]`;
                      preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
                    });
                    return preview;
                  })()}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsTemplateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleTemplateConfirm}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Use Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Info */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is a demo interface. The chat messages are handled by stub API endpoints. 
            In a real implementation, messages would be stored in PostgreSQL and synchronized with WhatsApp Business API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
