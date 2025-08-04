
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { ContactManager } from '@/components/ContactManager';
import { MessageTemplateManager } from '@/components/MessageTemplateManager';
import { ChatInterface } from '@/components/ChatInterface';
import type { User, Contact, MessageTemplate } from '../../server/src/schema';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  contacts: Contact[];
  templates: MessageTemplate[];
  selectedContact: Contact | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    contacts: [],
    templates: [],
    selectedContact: null
  });
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Load user data after authentication
  const loadUserData = useCallback(async (userId: number) => {
    try {
      const [contacts, templates] = await Promise.all([
        trpc.getContacts.query({ userId }),
        trpc.getMessageTemplates.query({ userId })
      ]);
      
      setState(prev => ({
        ...prev,
        contacts,
        templates
      }));
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, []);

  const handleLogin = async (user: User) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true
    }));
    await loadUserData(user.id);
  };

  const handleLogout = () => {
    setState({
      user: null,
      isAuthenticated: false,
      contacts: [],
      templates: [],
      selectedContact: null
    });
    setActiveTab('contacts');
  };

  const handleContactSelect = (contact: Contact) => {
    setState(prev => ({
      ...prev,
      selectedContact: contact
    }));
    setActiveTab('chat');
  };

  const handleContactUpdate = (updatedContact: Contact) => {
    setState(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => 
        c.id === updatedContact.id ? updatedContact : c
      ),
      selectedContact: prev.selectedContact?.id === updatedContact.id 
        ? updatedContact 
        : prev.selectedContact
    }));
  };

  const handleContactDelete = (contactId: number) => {
    setState(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== contactId),
      selectedContact: prev.selectedContact?.id === contactId ? null : prev.selectedContact
    }));
  };

  const handleContactCreate = (newContact: Contact) => {
    setState(prev => ({
      ...prev,
      contacts: [...prev.contacts, newContact]
    }));
  };

  const handleTemplateCreate = (newTemplate: MessageTemplate) => {
    setState(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
  };

  const handleTemplateUpdate = (updatedTemplate: MessageTemplate) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      )
    }));
  };

  const handleTemplateDelete = (templateId: number) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== templateId)
    }));
  };

  // Authentication screen
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-700">
              📱 WhatsApp Business Manager
            </CardTitle>
            <CardDescription>
              Manage your WhatsApp Business interactions efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm onSuccess={handleLogin} />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm onSuccess={handleLogin} />
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-green-700">
              📱 WhatsApp Business Manager
            </h1>
            <Badge variant="outline" className="text-sm">
              Welcome, {state.user?.first_name} {state.user?.last_name}
            </Badge>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="contacts" className="flex items-center space-x-2">
              <span>👥</span>
              <span>Contacts</span>
              <Badge variant="secondary" className="ml-1">
                {state.contacts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <span>📝</span>
              <span>Templates</span>
              <Badge variant="secondary" className="ml-1">
                {state.templates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <span>💬</span>
              <span>Chat</span>
              {state.selectedContact && (
                <Badge variant="default" className="ml-1">
                  {state.selectedContact.first_name}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <span>📊</span>
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <ContactManager
              userId={state.user!.id}
              contacts={state.contacts}
              onContactSelect={handleContactSelect}
              onContactCreate={handleContactCreate}
              onContactUpdate={handleContactUpdate}
              onContactDelete={handleContactDelete}
            />
          </TabsContent>

          <TabsContent value="templates">
            <MessageTemplateManager
              userId={state.user!.id}
              templates={state.templates}
              onTemplateCreate={handleTemplateCreate}
              onTemplateUpdate={handleTemplateUpdate}
              onTemplateDelete={handleTemplateDelete}
            />
          </TabsContent>

          <TabsContent value="chat">
            {state.selectedContact ? (
              <ChatInterface
                userId={state.user!.id}
                contact={state.selectedContact}
                templates={state.templates}
              />
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold mb-2">No Contact Selected</h3>
                  <p className="text-gray-600 mb-4">
                    Select a contact from the Contacts tab to start chatting
                  </p>
                  <Button 
                    onClick={() => setActiveTab('contacts')} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Go to Contacts
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>👥</span>
                    <span>Total Contacts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {state.contacts.length}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Active contacts in your database
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📝</span>
                    <span>Message Templates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {state.templates.length}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Reusable message templates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Account Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold text-green-600 mb-2">
                    ✅ Active
                  </div>
                  <p className="text-sm text-gray-600">
                    Account created: {state.user?.created_at.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>📈 Quick Stats</CardTitle>
                <CardDescription>
                  Overview of your WhatsApp Business activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Contacts with Email</span>
                    <Badge variant="secondary">
                      {state.contacts.filter(c => c.email).length}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Contacts with Notes</span>
                    <Badge variant="secondary">
                      {state.contacts.filter(c => c.notes).length}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Templates with Variables</span>
                    <Badge variant="secondary">
                      {state.templates.filter(t => t.variables && t.variables.length > 0).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
