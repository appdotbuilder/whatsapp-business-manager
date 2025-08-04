
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Contact, CreateContactInput, UpdateContactInput } from '../../../server/src/schema';

interface ContactManagerProps {
  userId: number;
  contacts: Contact[];
  onContactSelect: (contact: Contact) => void;
  onContactCreate: (contact: Contact) => void;
  onContactUpdate: (contact: Contact) => void;
  onContactDelete: (contactId: number) => void;
}

export function ContactManager({ 
  userId, 
  contacts, 
  onContactSelect, 
  onContactCreate, 
  onContactUpdate, 
  onContactDelete 
}: ContactManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [createFormData, setCreateFormData] = useState<CreateContactInput>({
    user_id: userId,
    phone_number: '',
    first_name: '',
    last_name: null,
    email: null,
    notes: null
  });

  const [editFormData, setEditFormData] = useState<Partial<UpdateContactInput>>({});

  const filteredContacts = contacts.filter((contact: Contact) =>
    contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone_number.includes(searchTerm) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Note: Since createContact handler is a stub, this demonstrates the intended flow
      const newContact = await trpc.createContact.mutate(createFormData);
      onContactCreate(newContact);
      setCreateFormData({
        user_id: userId,
        phone_number: '',
        first_name: '',
        last_name: null,
        email: null,
        notes: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    setIsLoading(true);
    try {
      const updateData: UpdateContactInput = {
        id: editingContact.id,
        ...editFormData
      };
      const updatedContact = await trpc.updateContact.mutate(updateData);
      onContactUpdate(updatedContact);
      setEditingContact(null);
      setEditFormData({});
    } catch (error) {
      console.error('Failed to update contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contactId: number) => {
    try {
      await trpc.deleteContact.mutate({ contactId });
      onContactDelete(contactId);
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setEditFormData({
      phone_number: contact.phone_number,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      notes: contact.notes
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">👥 Contact Management</h2>
          <p className="text-gray-600">Manage your WhatsApp Business contacts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              ➕ Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>
                Create a new contact for your WhatsApp Business
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={createFormData.phone_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateContactInput) => ({ ...prev, phone_number: e.target.value }))
                    }
                    placeholder="+1234567890"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={createFormData.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateContactInput) => ({ ...prev, first_name: e.target.value }))
                      }
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={createFormData.last_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateContactInput) => ({ ...prev, last_name: e.target.value || null }))
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createFormData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateContactInput) => ({ ...prev, email: e.target.value || null }))
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={createFormData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateFormData((prev: CreateContactInput) => ({ ...prev, notes: e.target.value || null }))
                    }
                    placeholder="Additional notes about this contact..."
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? 'Creating...' : 'Create Contact'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="🔍 Search contacts..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contacts Grid */}
      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">
              {contacts.length === 0 ? 'No Contacts Yet' : 'No Matching Contacts'}
            </h3>
            <p className="text-gray-600 mb-4">
              {contacts.length === 0 
                ? 'Start building your contact list for WhatsApp Business'
                : 'Try adjusting your search terms'
              }
            </p>
            {contacts.length === 0 && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Add Your First Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact: Contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {contact.first_name} {contact.last_name}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-1">
                      <span>📱</span>
                      <span>{contact.phone_number}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {contact.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {contact.email && (
                  <p className="text-sm text-gray-600 flex items-center space-x-1 mb-2">
                    <span>📧</span>
                    <span>{contact.email}</span>
                  </p>
                )}
                {contact.notes && (
                  <p className="text-sm text-gray-600 mb-3">
                    📝 {contact.notes.length > 50 
                      ? `${contact.notes.substring(0, 50)}...` 
                      : contact.notes
                    }
                  </p>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400">
                    Added {contact.created_at.toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      
                      onClick={() => onContactSelect(contact)}
                      className="text-green-600 hover:bg-green-50"
                    >
                      💬 Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(contact)}
                    >
                      ✏️
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                          🗑️
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {contact.first_name} {contact.last_name}? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(contact.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <Input
                    id="editPhone"
                    value={editFormData.phone_number || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: Partial<UpdateContactInput>) => ({ ...prev, phone_number: e.target.value }))
                    }
                    placeholder="+1234567890"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editFormData.first_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: Partial<UpdateContactInput>) => ({ ...prev, first_name: e.target.value }))
                      }
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editFormData.last_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: Partial<UpdateContactInput>) => ({ ...prev, last_name: e.target.value || null }))
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: Partial<UpdateContactInput>) => ({ ...prev, email: e.target.value || null }))
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea
                    id="editNotes"
                    value={editFormData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditFormData((prev: Partial<UpdateContactInput>) => ({ ...prev, notes: e.target.value || null }))
                    }
                    placeholder="Additional notes about this contact..."
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? 'Updating...' : 'Update Contact'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
