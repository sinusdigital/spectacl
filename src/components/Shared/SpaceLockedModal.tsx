"use client";

import Link from "next/link";
import { Dialog, Flex, Heading, Text, Button } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";

interface SpaceLockedModalProps {
    spaceName?: string;
    supportEmail?: string;
}

export default function SpaceLockedModal({ spaceName, supportEmail }: SpaceLockedModalProps) {
    const email = supportEmail || "hello@spectacl.org";
    return (
        <Dialog.Root open>
            <Dialog.Content
                maxWidth="440px"
                onEscapeKeyDown={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <Flex direction="column" align="center" gap="5" py="4">
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: "var(--radius-full)",
                            background: "var(--red-3)",
                        }}
                    >
                        <LockClosedIcon width={24} height={24} color="var(--red-11)" />
                    </Flex>

                    <Flex direction="column" align="center" gap="2">
                        <Heading size="5" align="center">
                            This workspace is locked
                        </Heading>
                        <Text size="2" color="gray" align="center">
                            {spaceName ? `"${spaceName}" has` : "Your workspace has"} been
                            temporarily locked by an administrator. Your data is safe and
                            nothing has been deleted.
                        </Text>
                    </Flex>

                    <Text size="2" color="gray" align="center">
                        If you believe this is a mistake, please reach out to our team
                        and we&apos;ll get this resolved.
                    </Text>

                    <Flex direction="column" gap="2" width="100%">
                        <Button asChild size="3" variant="solid" style={{ width: "100%" }}>
                            <Link href="/spaces">
                                Switch Workspace
                            </Link>
                        </Button>
                        <Button asChild size="3" variant="soft" color="gray" style={{ width: "100%" }}>
                            <a href={`mailto:${email}`}>
                                Contact Support
                            </a>
                        </Button>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
