import React from 'react';
import NextLink from 'next/link';
import { Card, Flex, Heading, Text, Box, Link } from '@radix-ui/themes';

export default function AuthMessageCard({
  icon: Icon,
  title,
  description,
  linkText = "Back to login",
  linkHref = "/login"
}: {
  icon: React.ElementType;
  title: string;
  description: React.ReactNode;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
      <Flex direction="column" gap="4" align="center" mb="2">
        <Icon width="48" height="48" />
        <Heading size="6" weight="bold">{title}</Heading>
        <Text size="3" color="gray" align="center">
          {description}
        </Text>
      </Flex>
      <Box mt="6" className="text-center">
        <Link asChild size="2" weight="medium" className="transition-colors">
          <NextLink href={linkHref}>
            {linkText}
          </NextLink>
        </Link>
      </Box>
    </Card>
  );
}
