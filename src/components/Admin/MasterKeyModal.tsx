"use client";

import { useState, useEffect } from 'react';
import { Box, Flex, Text, TextField, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import Button from "@/components/Shared/Button";
import Modal from "@/components/Shared/Modal";
import { MasterKey } from './MasterLLMManager';

interface MasterKeyModalProps {
    masterKey: MasterKey;
    onClose: () => void;
    onSave: (provider: string, key: string) => Promise<void>;
}

export default function MasterKeyModal({ masterKey, onClose, onSave }: MasterKeyModalProps) {
    const [key, setKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testError, setTestError] = useState('');
    const [testSuccess, setTestSuccess] = useState('');

    useEffect(() => {
        setKey('');
        setTestError('');
        setTestSuccess('');
    }, [masterKey]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(masterKey.provider, key);
            onClose();
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestError('');
        setTestSuccess('');
        
        try {
            if (!key && !masterKey.isSet) {
                setTestError('Please enter an API key to test.');
                return;
            }

            const response = await fetch('/api/admin/master-llm-keys/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    provider: masterKey.provider,
                    key: key || undefined 
                    // If key is missing, it tests the stored key.
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Connection test failed');
            }

            setTestSuccess('Connection successful!');
        } catch (err: unknown) {
            setTestError(err instanceof Error ? err.message : 'Connection test failed');
        } finally {
            setTesting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Configure ${masterKey.displayName} Master Key`}
            actions={
                <>
                    <Button
                        variant="secondary"
                        onClick={handleTestConnection}
                        disabled={testing || (!key && !masterKey.isSet)}
                        isLoading={testing}
                        loadingText="Testing..."
                    >
                        Test Connection
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving || (!key && !masterKey.isSet)}
                        isLoading={saving}
                        loadingText="Saving..."
                    >
                        Save Key
                    </Button>
                </>
            }
        >
            <Flex direction="column" gap="4">
                <Callout.Root color="blue" size="1">
                    <Callout.Icon>
                        <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>
                        This key will be used by all Managed spaces for <strong>{masterKey.displayName}</strong> models.
                    </Callout.Text>
                </Callout.Root>

                <Box>
                    <Text as="label" size="2" weight="bold" mb="1">
                        API Key
                    </Text>
                    <TextField.Root
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder={masterKey.isSet ? "••••••••••••••••" : "sk-..."}
                        size="2"
                    />
                    <Box mt="1">
                        <Text size="1" color="gray">
                            {masterKey.isSet
                                ? "Leave blank to keep existing key."
                                : "Enter your API key."}
                        </Text>
                    </Box>
                </Box>

                {/* Test Result Messages */}
                {testError && (
                    <Callout.Root color="red" size="1">
                        <Callout.Text>{testError}</Callout.Text>
                    </Callout.Root>
                )}
                {testSuccess && (
                    <Callout.Root color="green" size="1">
                        <Callout.Text>{testSuccess}</Callout.Text>
                    </Callout.Root>
                )}
            </Flex>
        </Modal>
    );
}
