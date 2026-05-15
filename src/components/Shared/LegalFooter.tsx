'use client';

import React from 'react';
import { Flex, Box, Heading, Text } from '@radix-ui/themes';
import Link from 'next/link';

export function LegalFooter() {
    return (
        <Box py="6" style={{ textAlign: 'center' }}>
            <Flex direction="column" gap="4" align="center">
                <Box>
                    <Heading size="4" mb="1">Built for transparency.</Heading>
                    <Text size="2" color="gray">Operating with integrity under Sinus Digital B.V.</Text>
                </Box>
                
                <Flex gap="4" wrap="wrap" justify="center" className="text-sm text-gray-500">
                    <Link href="mailto:hello@spectacl.org" className="hover:text-indigo-600">Contact</Link>
                </Flex>

                <Box mt="4">
                    <Text size="1" color="gray">
                        © 2026 Sinus Digital B.V. KVK 99865416 
                    </Text>
                </Box>
            </Flex>
        </Box>
    );
}
