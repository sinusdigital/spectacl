'use client';

import { EnvelopeClosedIcon, Link2Icon, CheckIcon } from '@radix-ui/react-icons';
import RadixDialog from '@/components/Shared/RadixDialog';
import Button from '@/components/Shared/Button';
import { Box, Flex, Text, Card } from '@radix-ui/themes';
import TipCallout from '@/components/Shared/TipCallout';

interface HowToJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToJoinModal({ isOpen, onClose }: HowToJoinModalProps) {
  return (
    <RadixDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Content className="max-w-md">
        <RadixDialog.Header>
          <RadixDialog.Title>How to Join a Space</RadixDialog.Title>
          <RadixDialog.Description>
            You need to be invited by a space owner or admin to join an existing workspace.
          </RadixDialog.Description>
        </RadixDialog.Header>

        <Box pt="4">
          {/* Steps */}
          <Flex gap="4" mb="4">
            {/* Step 1 */}
            <Card style={{ flex: 1 }} size="1">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <EnvelopeClosedIcon width={15} height={15} />
                  <Text as="div" size="2" weight="medium" className="text-[var(--gray-12)] leading-none">
                    1. Get Invited
                  </Text>
                </Flex>
                <Text as="p" size="1" color="gray">
                  Ask a space admin to send an invite link.
                </Text>
              </Flex>
            </Card>

            {/* Step 2 */}
            <Card style={{ flex: 1 }} size="1">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Link2Icon width={15} height={15} />
                  <Text as="div" size="2" weight="medium" className="text-[var(--gray-12)] leading-none">
                    2. Check Here
                  </Text>
                </Flex>
                <Text as="p" size="1" color="gray">
                  The space will appear with an &quot;Accept&quot; button.
                </Text>
              </Flex>
            </Card>

            {/* Step 3 */}
            <Card style={{ flex: 1 }} size="1">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckIcon width={15} height={15} />
                  <Text as="div" size="2" weight="medium" className="text-[var(--gray-12)] leading-none">
                    3. Collaborate
                  </Text>
                </Flex>
                <Text as="p" size="1" color="gray">
                  Join the space with one click.
                </Text>
              </Flex>
            </Card>
          </Flex>

          {/* Info Box */}
          <TipCallout>
            Space owners and admins can invite members from the Space Settings page under the &quot;Invitations&quot; tab.
          </TipCallout>
        </Box>

        <RadixDialog.Footer>
          <Button
            variant="primary"
            onClick={onClose}
          >
            Got it
          </Button>
        </RadixDialog.Footer>
      </RadixDialog.Content>
    </RadixDialog.Root>
  );
}
