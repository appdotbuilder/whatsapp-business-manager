
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
import type { MessageTemplate, CreateMessageTemplateInput, UpdateMessageTemplateInput } from '../../../server/src/schema';

interface MessageTemplateManagerProps {
  userId: number;
  templates: MessageTemplate[];
  onTemplateCreate: (template: MessageTemplate) => void;
  onTemplateUpdate: (template: MessageTemplate) => void;
  onTemplateDelete: (templateId: number) => void;
}

export function MessageTemplateManager({ 
  userId, 
  templates, 
  onTemplateCreate, 
  onTemplateUpdate, 
  onTemplateDelete 
}: MessageTemplateManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [createFormData, setCreateFormData] = useState<CreateMessageTemplateInput>({
    user_id: userId,
    name: '',
    content: '',
    variables: null
  });

  const [editFormData, setEditFormData] = useState<Partial<UpdateMessageTemplateInput>>({});

  const filteredTemplates = templates.filter((template: MessageTemplate) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extract variables from template content (simple implementation)
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(match => match.replace(/\{\{|\}\}/g, '')) : [];
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const variables = extractVariables(createFormData.content);
      const templateData = {
        ...createFormData,
        variables: variables.length > 0 ? variables : null
      };

      // Note: Since createMessageTemplate handler is a stub, this demonstrates the intended flow
      const newTemplate = await trpc.createMessageTemplate.mutate(templateData);
      onTemplateCreate(newTemplate);
      setCreateFormData({
        user_id: userId,
        name: '',
        content: '',
        variables: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setIsLoading(true);
    try {
      const variables = editFormData.content ? extractVariables(editFormData.content) : null;
      const updateData: UpdateMessageTemplateInput = {
        id: editingTemplate.id,
        ...editFormData,
        variables: variables && variables.length > 0 ? variables : null
      };
      const updatedTemplate = await trpc.updateMessageTemplate.mutate(updateData);
      onTemplateUpdate(updatedTemplate);
      setEditingTemplate(null);
      setEditFormData({});
    } catch (error) {
      console.error('Failed to update template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateId: number) => {
    try {
      await trpc.deleteMessageTemplate.mutate({ templateId });
      onTemplateDelete(templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const openEditDialog = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setEditFormData({
      name: template.name,
      content: template.content,
      variables: template.variables
    });
  };

  const previewTemplate = (content: string): string => {
    let preview = content;
    const variables = extractVariables(content);
    variables.forEach((variable: string) => {
      preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), `[${variable}]`);
    });
    return preview;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📝 Message Templates</h2>
          <p className="text-gray-600">Create and manage reusable message templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              ➕ Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Message Template</DialogTitle>
              <DialogDescription>
                Create a reusable template. Use {"{{variable}}"} for dynamic content.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={createFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateMessageTemplateInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Welcome Message"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateContent">Message Content *</Label>
                  <Textarea
                    id="templateContent"
                    value={createFormData.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateFormData((prev: CreateMessageTemplateInput) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Hello {{name}}, welcome to our service! Your account {{account_id}} is now active."
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Tip: Use {"{{variable}}"} syntax for dynamic content
                  </p>
                </div>
                {createFormData.content && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="p-3 bg-gray-50 rounded border text-sm">
                      {previewTemplate(createFormData.content)}
                    </div>
                    {extractVariables(createFormData.content).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-gray-600">Variables:</span>
                        {extractVariables(createFormData.content).map((variable: string) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? 'Creating...' : 'Create Template'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="🔍 Search templates..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">
              {templates.length === 0 ? 'No Templates Yet' : 'No Matching Templates'}
            </h3>
            <p className="text-gray-600 mb-4">
              {templates.length === 0 
                ? 'Create your first message template to save time'
                : 'Try adjusting your search terms'
              }
            </p>
            {templates.length === 0 && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Your First Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template: MessageTemplate) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Created {template.created_at.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    ID: {template.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {template.content.length > 100 
                      ? `${template.content.substring(0, 100)}...` 
                      : template.content
                    }
                  </div>
                  
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-600">Variables:</span>
                      {template.variables.map((variable: string) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Separator />
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(template)}
                    >
                      ✏️ Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                          🗑️ Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
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
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your message template
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTemplateName">Template Name</Label>
                  <Input
                    id="editTemplateName"
                    value={editFormData.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: Partial<UpdateMessageTemplateInput>) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Welcome Message"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTemplateContent">Message Content</Label>
                  <Textarea
                    id="editTemplateContent"
                    value={editFormData.content || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditFormData((prev: Partial<UpdateMessageTemplateInput>) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Hello {{name}}, welcome to our service!"
                    rows={4}
                  />
                </div>
                {editFormData.content && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="p-3 bg-gray-50 rounded border text-sm">
                      {previewTemplate(editFormData.content)}
                    </div>
                    {extractVariables(editFormData.content).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-gray-600">Variables:</span>
                        {extractVariables(editFormData.content).map((variable: string) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? 'Updating...' : 'Update Template'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
