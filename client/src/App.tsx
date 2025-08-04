
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Contact, 
  Message, 
  MessageTemplate,
  CreateUserInput, 
  LoginInput,
  CreateContactInput,
  CreateMessageTemplateInput,
  SendMessageInput,
  UpdateContactInput,
  UpdateMessageTemplateInput
} from '../../server/src/schema';

type AuthState = 'login' | 'register' | 'authenticated';

function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');

  // Form states
  const [loginForm, setLoginForm] = useState<LoginInput>({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState<CreateUserInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

  const [contactForm, setContactForm] = useState<CreateContactInput>({
    user_id: 0,
    phone_number: '',
    first_name: '',
    last_name: null,
    email: null,
    notes: null
  });

  const [templateForm, setTemplateForm] = useState<CreateMessageTemplateInput>({
    user_id: 0,
    name: '',
    content: '',
    variables: null
  });

  const [messageContent, setMessageContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Load data functions
  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      const result = await trpc.getContacts.query({ userId: user.id });
      setContacts(result);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setError('Failed to load contacts');
    }
  }, [user]);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    try {
      const result = await trpc.getMessageTemplates.query({ userId: user.id });
      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setError('Failed to load templates');
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!user || !selectedContact) return;
    try {
      const result = await trpc.getChatMessages.query({ 
        user_id: user.id, 
        contact_id: selectedContact.id 
      });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    }
  }, [user, selectedContact]);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadTemplates();
    }
  }, [user, loadContacts, loadTemplates]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages();
    }
  }, [selectedContact, loadMessages]);

  // Authentication handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await trpc.loginUser.mutate(loginForm);
      if (result) {
        setUser(result);
        setAuthState('authenticated');
        setLoginForm({ email: '', password: '' });
      } else {
        setError('Invalid email or password');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await trpc.createUser.mutate(registerForm);
      setUser(result);
      setAuthState('authenticated');
      setRegisterForm({ email: '', password: '', first_name: '', last_name: '' });
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Contact handlers
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const contactData = { ...contactForm, user_id: user.id };
      const newContact = await trpc.createContact.mutate(contactData);
      setContacts((prev: Contact[]) => [...prev, newContact]);
      setContactForm({
        user_id: 0,
        phone_number: '',
        first_name: '',
        last_name: null,
        email: null,
        notes: null
      });
    } catch (error) {
      console.error('Failed to create contact:', error);
      setError('Failed to create contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setIsLoading(true);
    try {
      const updateData: UpdateContactInput = {
        id: editingContact.id,
        phone_number: contactForm.phone_number || undefined,
        first_name: contactForm.first_name || undefined,
        last_name: contactForm.last_name,
        email: contactForm.email,
        notes: contactForm.notes
      };
      const updatedContact = await trpc.updateContact.mutate(updateData);
      setContacts((prev: Contact[]) => 
        prev.map((c: Contact) => c.id === editingContact.id ? updatedContact : c)
      );
      setEditingContact(null);
      setContactForm({
        user_id: 0,
        phone_number: '',
        first_name: '',
        last_name: null,
        email: null,
        notes: null
      });
    } catch (error) {
      console.error('Failed to update contact:', error);
      setError('Failed to update contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await trpc.deleteContact.mutate({ contactId });
      setContacts((prev: Contact[]) => prev.filter((c: Contact) => c.id !== contactId));
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      setError('Failed to delete contact');
    }
  };

  // Template handlers
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const templateData = { ...templateForm, user_id: user.id };
      const newTemplate = await trpc.createMessageTemplate.mutate(templateData);
      setTemplates((prev: MessageTemplate[]) => [...prev, newTemplate]);
      setTemplateForm({
        user_id: 0,
        name: '',
        content: '',
        variables: null
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      setError('Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setIsLoading(true);
    try {
      const updateData: UpdateMessageTemplateInput = {
        id: editingTemplate.id,
        name: templateForm.name || undefined,
        content: templateForm.content || undefined,
        variables: templateForm.variables
      };
      const updatedTemplate = await trpc.updateMessageTemplate.mutate(updateData);
      setTemplates((prev: MessageTemplate[]) => 
        prev.map((t: MessageTemplate) => t.id === editingTemplate.id ? updatedTemplate : t)
      );
      setEditingTemplate(null);
      setTemplateForm({
        user_id: 0,
        name: '',
        content: '',
        variables: null
      });
    } catch (error) {
      console.error('Failed to update template:', error);
      setError('Failed to update template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await trpc.deleteMessageTemplate.mutate({ templateId });
      setTemplates((prev: MessageTemplate[]) => prev.filter((t: MessageTemplate) => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
      setError('Failed to delete template');
    }
  };

  // Message handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContact || !messageContent.trim()) return;
    setIsLoading(true);
    try {
      const messageData: SendMessageInput = {
        user_id: user.id,
        contact_id: selectedContact.id,
        content: messageContent.trim(),
        template_id: selectedTemplate !== 'none' ? parseInt(selectedTemplate) : undefined
      };
      const sentMessage = await trpc.sendMessage.mutate(messageData);
      setMessages((prev: Message[]) => [...prev, sentMessage]);
      setMessageContent('');
      setSelectedTemplate('none');
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = (template: MessageTemplate) => {
    setMessageContent(template.content);
    setSelectedTemplate(template.id.toString());
  };

  const startEditingContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      user_id: contact.user_id,
      phone_number: contact.phone_number,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      notes: contact.notes
    });
  };

  const startEditingTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      user_id: template.user_id,
      name: template.name,
      content: template.content,
      variables: template.variables
    });
  };

  const handleEnterSubmit = () => {
    if (!user || !selectedContact || !messageContent.trim()) return;
    
    // Create a synthetic form event
    const syntheticEvent = {
      preventDefault: () => {},
      currentTarget: document.createElement('form'),
      target: document.createElement('form'),
      type: 'submit',
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: 2,
      isTrusted: false,
      nativeEvent: new Event('submit'),
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist: () => {},
      stopPropagation: () => {},
      timeStamp: Date.now()
    } as React.FormEvent;

    handleSendMessage(syntheticEvent);
  };

  // Authentication screens
  if (authState !== 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-700">
              📱 WhatsApp Business Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={authState} onValueChange={(value) => setAuthState(value as AuthState)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginForm((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginForm((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={registerForm.first_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setRegisterForm((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={registerForm.last_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setRegisterForm((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg_email">Email</Label>
                    <Input
                      id="reg_email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg_password">Password</Label>
                    <Input
                      id="reg_password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-700">📱 WhatsApp Business Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.first_name} {user?.last_name}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setUser(null);
                setAuthState('login');
                setContacts([]);
                setTemplates([]);
                setMessages([]);
                setSelectedContact(null);
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <Alert className="mx-4 mt-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="container mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
            <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
            <TabsTrigger value="templates">📝 Templates</TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
              {/* Contact List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contacts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[520px]">
                    {contacts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No contacts yet. Add some contacts first!
                      </div>
                    ) : (
                      contacts.map((contact: Contact) => (
                        <div
                          key={contact.id}
                          className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                            selectedContact?.id === contact.id ? 'bg-green-50 border-green-200' : ''
                          }`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-green-100 text-green-700">
                                {contact.first_name[0]}{contact.last_name?.[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {contact.first_name} {contact.last_name || ''}
                              </p>
                              <p className="text-sm text-gray-500 truncate">{contact.phone_number}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="lg:col-span-2">
                {selectedContact ? (
                  <>
                    <CardHeader className="border-b">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-green-100 text-green-700">
                            {selectedContact.first_name[0]}{selectedContact.last_name?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {selectedContact.first_name} {selectedContact.last_name || ''}
                          </CardTitle>
                          <p className="text-sm text-gray-500">{selectedContact.phone_number}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex flex-col">
                      {/* Messages */}
                      <ScrollArea className="flex-1 h-[380px] p-4">
                        {messages.length === 0 ? (
                          <div className="text-center text-gray-500 mt-8">
                            No messages yet. Start a conversation!
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message: Message) => (
                              <div
                                key={message.id}
                                className={`flex ${message.is_outbound ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    message.is_outbound
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-200 text-gray-900'
                                  }`}
                                >
                                  <p>{message.content}</p>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className={`text-xs ${
                                      message.is_outbound ? 'text-green-100' : 'text-gray-500'
                                    }`}>
                                      {message.created_at.toLocaleTimeString()}
                                    </p>
                                    {message.is_outbound && (
                                      <Badge
                                        variant="secondary" 
                                        className={`text-xs ml-2 ${
                                          message.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                          message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                          message.status === 'read' ? 'bg-purple-100 text-purple-800' :
                                          'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {message.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="border-t p-4">
                        <form onSubmit={handleSendMessage} className="space-y-3">
                          <div className="flex gap-2">
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Template" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No template</SelectItem>
                                {templates.map((template: MessageTemplate) => (
                                  <SelectItem key={template.id} value={template.id.toString()}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedTemplate !== 'none' && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const template = templates.find((t: MessageTemplate) => t.id.toString() === selectedTemplate);
                                  if (template) applyTemplate(template);
                                }}
                              >
                                Use Template
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Textarea
                              value={messageContent}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setMessageContent(e.target.value)
                              }
                              placeholder="Type your message..."
                              className="flex-1 min-h-[60px]"
                              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEnterSubmit();
                                }
                              }}
                            />
                            <Button 
                              type="submit" 
                              className="bg-green-600 hover:bg-green-700"
                              disabled={isLoading || !messageContent.trim()}
                            >
                              Send
                            </Button>
                          </div>
                        </form>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <p className="text-xl mb-2">💬</p>
                      <p>Select a contact to start chatting</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add/Edit Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingContact ? 'Edit Contact' : 'Add New Contact'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form 
                    onSubmit={editingContact ? handleUpdateContact : handleCreateContact} 
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_first_name">First Name</Label>
                        <Input
                          id="contact_first_name"
                          value={contactForm.first_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setContactForm((prev: CreateContactInput) => ({ ...prev, first_name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_last_name">Last Name</Label>
                        <Input
                          id="contact_last_name"
                          value={contactForm.last_name || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setContactForm((prev: CreateContactInput) => ({ 
                              ...prev, 
                              last_name: e.target.value || null 
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Phone Number</Label>
                      <Input
                        id="contact_phone"
                        value={contactForm.phone_number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContactForm((prev: CreateContactInput) => ({ ...prev, phone_number: e.target.value }))
                        }
                        placeholder="+1234567890"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={contactForm.email || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContactForm((prev: CreateContactInput) => ({ 
                            ...prev, 
                            email: e.target.value || null 
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_notes">Notes</Label>
                      <Textarea
                        id="contact_notes"
                        value={contactForm.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setContactForm((prev: CreateContactInput) => ({ 
                            ...prev, 
                            notes: e.target.value || null 
                          }))
                        }
                        placeholder="Additional notes about this contact..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                      </Button>
                      {editingContact && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingContact(null);
                            setContactForm({
                              user_id: 0,
                              phone_number: '',
                              first_name: '',
                              last_name: null,
                              email: null,
                              notes: null
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Contacts List */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Contacts ({contacts.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {contacts.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <p className="text-xl mb-2">👥</p>
                        <p>No contacts yet</p>
                        <p className="text-sm">Add your first contact to get started!</p>
                      </div>
                    ) : (
                      contacts.map((contact: Contact) => (
                        <div key={contact.id} className="p-4 border-b hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-green-100 text-green-700">
                                  {contact.first_name[0]}{contact.last_name?.[0] || ''}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium">
                                  {contact.first_name} {contact.last_name || ''}
                                </h3>
                                <p className="text-sm text-gray-600">{contact.phone_number}</p>
                                {contact.email && (
                                  <p className="text-sm text-gray-600">{contact.email}</p>
                                )}
                                {contact.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{contact.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingContact(contact)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteContact(contact.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add/Edit Template Form */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form 
                    onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} 
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="template_name">Template Name</Label>
                      <Input
                        id="template_name"
                        value={templateForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTemplateForm((prev: CreateMessageTemplateInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="e.g., Welcome Message, Follow-up"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="template_content">Message Content</Label>
                      <Textarea
                        id="template_content"
                        value={templateForm.content}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setTemplateForm((prev: CreateMessageTemplateInput) => ({ ...prev, content: e.target.value }))
                        }
                        placeholder="Write your message template here..."
                        className="min-h-[120px]"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                      </Button>
                      {editingTemplate && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplate(null);
                            setTemplateForm({
                              user_id: 0,
                              name: '',
                              content: '',
                              variables: null
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Templates List */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Templates ({templates.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {templates.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <p className="text-xl mb-2">📝</p>
                        <p>No templates yet</p>
                        <p className="text-sm">Create your first template to save time!</p>
                      </div>
                    ) : (
                      templates.map((template: MessageTemplate) => (
                        <div key={template.id} className="p-4 border-b hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium mb-2">{template.name}</h3>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">
                                {template.content}
                              </p>
                              <p className="text-xs text-gray-400">
                                Created: {template.created_at.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingTemplate(template)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
