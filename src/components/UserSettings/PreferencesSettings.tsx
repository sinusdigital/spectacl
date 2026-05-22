import { useState } from 'react';
import { Flex, Card, Heading, Text, Box, Select, Checkbox, Callout, Grid, Button, Separator } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';

export default function PreferencesSettings() {
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    analysisResults: true,
    teamInvitations: true,
    weeklyReports: false,
    productUpdates: false,
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowSuccess(false);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    setLoading(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Box>
          <Heading size="4" mb="1">Preferences</Heading>
          <Text size="2" color="gray">
            Customize your experience and notification settings
          </Text>
        </Box>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="5">
            <Grid columns={{ initial: '1', sm: '2' }} gap="4">
              <Flex direction="column" gap="2">
                <Text as="label" size="2" weight="bold" htmlFor="theme">
                  Theme
                </Text>
                <Select.Root value={theme} onValueChange={setTheme} size="3">
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="light">Light</Select.Item>
                    <Select.Item value="dark">Dark</Select.Item>
                    <Select.Item value="system">System</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Text size="1" color="gray">Choose how Spectacl looks to you</Text>
              </Flex>

              <Flex direction="column" gap="2">
                <Text as="label" size="2" weight="bold" htmlFor="language">
                  Language
                </Text>
                <Select.Root value={language} onValueChange={setLanguage} size="3">
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="en">English</Select.Item>
                    <Select.Item value="de">Deutsch</Select.Item>
                    <Select.Item value="fr">Français</Select.Item>
                    <Select.Item value="es">Español</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Grid>

            <Separator size="4" />

            <Box>
              <Heading size="3" mb="3">Email Notifications</Heading>
              <Flex direction="column" gap="4">
                <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'start', cursor: 'pointer' }}>
                  <Checkbox 
                    size="3"
                    checked={notifications.analysisResults} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, analysisResults: checked === true }))}
                  />
                  <Box>
                    <Text as="div" size="2" weight="bold">Analysis Results</Text>
                    <Text as="p" size="1" color="gray">Get notified when prompt analysis completes</Text>
                  </Box>
                </label>

                <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'start', cursor: 'pointer' }}>
                  <Checkbox 
                    size="3"
                    checked={notifications.teamInvitations} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, teamInvitations: checked === true }))}
                  />
                  <Box>
                    <Text as="div" size="2" weight="bold">Team Invitations</Text>
                    <Text as="p" size="1" color="gray">Get notified when you&apos;re invited to a space</Text>
                  </Box>
                </label>

                <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'start', cursor: 'pointer' }}>
                  <Checkbox 
                    size="3"
                    checked={notifications.weeklyReports} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReports: checked === true }))}
                  />
                  <Box>
                    <Text as="div" size="2" weight="bold">Weekly Reports</Text>
                    <Text as="p" size="1" color="gray">Receive weekly summary of your entities</Text>
                  </Box>
                </label>

                <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'start', cursor: 'pointer' }}>
                  <Checkbox 
                    size="3"
                    checked={notifications.productUpdates} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, productUpdates: checked === true }))}
                  />
                  <Box>
                    <Text as="div" size="2" weight="bold">Product Updates</Text>
                    <Text as="p" size="1" color="gray">Get notified about new features and updates</Text>
                  </Box>
                </label>
              </Flex>
            </Box>

            {showSuccess && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckIcon />
                </Callout.Icon>
                <Callout.Text>
                  Preferences updated successfully!
                </Callout.Text>
              </Callout.Root>
            )}

            <Flex gap="3" pt="4" mt="2" style={{ borderTop: '1px solid var(--gray-4)' }}>
              <Button type="submit" loading={loading}>
                Save Preferences
              </Button>
              <Button type="button" variant="soft" color="gray" onClick={() => setShowSuccess(false)}>
                Cancel
              </Button>
            </Flex>
          </Flex>
        </form>
      </Flex>
    </Card>
  );
}
