'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Flex, Text, Badge, IconButton, Tooltip, AlertDialog, Code, Switch } from '@radix-ui/themes';
import { PlusIcon, Pencil1Icon, EyeOpenIcon, EyeClosedIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { GlobalModel } from '@prisma/client';
import { useToast } from '@/components/Shared/RadixToast';
import { GlobalModelDialog } from './GlobalModelDialog';

export function GlobalModelsTable() {
  const [models, setModels] = useState<GlobalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GlobalModel | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  
  const [deactivateAlertOpen, setDeactivateAlertOpen] = useState(false);
  const [modelToDeactivate, setModelToDeactivate] = useState<GlobalModel | null>(null);

  const [envStatus, setEnvStatus] = useState<Record<string, unknown> | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { toast } = useToast();

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/global-models?includeArchived=${showArchived}`);
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      setModels(data);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to load models.',
      });
    }

    try {
      const envRes = await fetch('/api/admin/env-status');
      if (envRes.ok) {
        const envData = await envRes.json();
        setEnvStatus(envData);
      }
    } catch {
       console.error("Failed to load ENV status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const handleCreateOrUpdate = async (data: Partial<GlobalModel>) => {
    try {
      const isEditing = dialogMode === 'edit' && selectedModel;
      const url = isEditing 
        ? `/api/admin/global-models/${selectedModel.id}` 
        : `/api/admin/global-models`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save model');
      }

      toast({
        title: 'Success',
        description: `Model ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      
      fetchModels();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async () => {
    if (!modelToDeactivate) return;
    try {
      const res = await fetch(`/api/admin/global-models/${modelToDeactivate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });

      if (!res.ok) throw new Error('Failed to deactivate model');

      toast({
        title: 'Success',
        description: 'Model deactivated successfully.',
      });
      fetchModels();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not deactivate model.',
      });
    } finally {
      setDeactivateAlertOpen(false);
      setModelToDeactivate(null);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedModel(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (model: GlobalModel) => {
    setDialogMode('edit');
    setSelectedModel(model);
    setDialogOpen(true);
  };

  const promptDeactivate = (model: GlobalModel) => {
    setModelToDeactivate(model);
    setDeactivateAlertOpen(true);
  };

  const handleReactivate = async (model: GlobalModel) => {
    try {
      const res = await fetch(`/api/admin/global-models/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });

      if (!res.ok) throw new Error('Failed to reactivate model');

      toast({
        title: 'Success',
        description: 'Model reactivated successfully.',
      });
      fetchModels();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not reactivate model.',
      });
    }
  };

  const activeModels = models;

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text size="4" weight="bold">Global Models Registry</Text>
        <Flex gap="4" align="center">
          <Text as="label" size="2" color="gray">
            <Flex gap="2" align="center">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} /> Show Deactivated
            </Flex>
          </Text>
          <Button onClick={openCreateDialog}>
            <PlusIcon /> Add Model
          </Button>
        </Flex>
      </Flex>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Display Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>API Model ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Context Window</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Max Output</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={7}>
                <Flex justify="center" p="4">
                  <Text color="gray">Loading models...</Text>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ) : activeModels.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={7}>
                <Flex justify="center" p="4">
                  <Text color="gray">No global models configured.</Text>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ) : (
            activeModels.map((model) => (
              <Table.Row key={model.id} align="center">
                <Table.Cell>
                  <Text weight="medium" style={{ textTransform: 'capitalize' }}>{model.provider}</Text>
                </Table.Cell>
                <Table.Cell>{model.displayName}</Table.Cell>
                <Table.Cell>
                  <Code size="2">{model.modelId}</Code>
                </Table.Cell>
                <Table.Cell>
                  <Text color="gray">{model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k` : '-'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text color="gray">{model.maxOutputTokens.toLocaleString()}</Text>
                </Table.Cell>
                <Table.Cell>
                  {model.isArchived ? (
                    <Badge color="gray" variant="soft"><EyeClosedIcon /> Deactivated</Badge>
                  ) : model.isEnabled ? (
                    <Badge color="green" variant="soft"><CheckCircledIcon /> Enabled</Badge>
                  ) : (
                    <Badge color="yellow" variant="soft"><CrossCircledIcon /> Disabled</Badge>
                  )}
                </Table.Cell>
                <Table.Cell align="right">
                  <Flex gap="2" justify="end">
                    <Tooltip content="Edit Model">
                      <IconButton variant="ghost" color="gray" onClick={() => openEditDialog(model)}>
                        <Pencil1Icon />
                      </IconButton>
                    </Tooltip>
                    {model.isArchived ? (
                      <Tooltip content="Reactivate Model">
                        <IconButton variant="ghost" color="green" onClick={() => handleReactivate(model)}>
                          <EyeOpenIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Deactivate Model">
                        <IconButton variant="ghost" color="red" onClick={() => promptDeactivate(model)}>
                          <EyeClosedIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>

      <GlobalModelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateOrUpdate}
        mode={dialogMode}
        initialData={selectedModel}
        envStatus={{
          openai: !!(envStatus?.llm as Record<string, { set: boolean }> | undefined)?.OPENAI_API_KEY?.set,
          anthropic: !!(envStatus?.llm as Record<string, { set: boolean }> | undefined)?.ANTHROPIC_API_KEY?.set,
          google: !!(envStatus?.llm as Record<string, { set: boolean }> | undefined)?.GOOGLE_API_KEY?.set,
          mistral: !!(envStatus?.llm as Record<string, { set: boolean }> | undefined)?.MISTRAL_API_KEY?.set,
        }}
      />

      {/* Deactivate Alert Dialog */}
      <AlertDialog.Root open={deactivateAlertOpen} onOpenChange={setDeactivateAlertOpen}>
        <AlertDialog.Content style={{ maxWidth: 450 }}>
          <AlertDialog.Title>Deactivate Model</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to deactivate <strong>{modelToDeactivate?.displayName}</strong>? 
            <br/><br/>
            This is a soft-delete. The model will remain in the database for historical references but will no longer be available for spaces to select. spaces already using this model will preserve their settings but will face execution errors if the API key is not present.
          </AlertDialog.Description>
          
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleDeactivate}>
                Deactivate Model
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
}


