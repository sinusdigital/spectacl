import React from 'react';
import { Flex, Heading, Text } from '@radix-ui/themes';
import { cn } from '@/lib/utils';
import SectionLabel from './SectionLabel';

type SpacingValue = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type HeadingSize = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

interface HeaderLayoutProps {
    // Margins
    m?: SpacingValue;
    mt?: SpacingValue;
    mr?: SpacingValue;
    mb?: SpacingValue;
    ml?: SpacingValue;
    mx?: SpacingValue;
    my?: SpacingValue;
    // Padding
    p?: SpacingValue;
    pt?: SpacingValue;
    pr?: SpacingValue;
    pb?: SpacingValue;
    pl?: SpacingValue;
    px?: SpacingValue;
    py?: SpacingValue;
}

interface HeaderRootProps extends HeaderLayoutProps {
    children: React.ReactNode;
    className?: string;
}

const HeaderRoot = ({ 
    children, 
    className, 
    m, mt, mr, mb = "4", ml, mx, my,
    p, pt, pr, pb, pl, px, py 
}: HeaderRootProps) => (
    <Flex 
        justify="between" 
        align="start" 
        m={m} mt={mt} mr={mr} mb={mb} ml={ml} mx={mx} my={my}
        p={p} pt={pt} pr={pr} pb={pb} pl={pl} px={px} py={py}
        className={cn("w-full", className)}
    >
        {children}
    </Flex>
);

const HeaderContent = ({ 
    children, 
    className,
    m, mt, mr, mb, ml, mx, my,
    p, pt, pr, pb, pl, px, py 
}: HeaderRootProps) => (
    <Flex 
        direction="column" 
        gap="1" 
        m={m} mt={mt} mr={mr} mb={mb} ml={ml} mx={mx} my={my}
        p={p} pt={pt} pr={pr} pb={pb} pl={pl} px={px} py={py}
        className={className}
    >
        {children}
    </Flex>
);

const HeaderKicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <SectionLabel className={cn("mb-1", className)}>
        {children}
    </SectionLabel>
);

interface HeaderTitleProps extends HeaderLayoutProps {
    children: React.ReactNode;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    size?: HeadingSize;
    weight?: "light" | "regular" | "medium" | "bold";
    className?: string;
    style?: React.CSSProperties;
}

const HeaderTitle = ({ 
    children, 
    as = 'h2', 
    size = '6', 
    weight = 'bold',
    className,
    style
}: HeaderTitleProps) => (
    <Heading 
        as={as} 
        size={size} 
        weight={weight} 
        className={cn("tracking-tight", className)}
        style={style}
    >
        {children}
    </Heading>
);

const HeaderDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <Text size="1" color="gray" className={className}>
        {children}
    </Text>
);

const HeaderActions = ({ 
    children, 
    className,
    m, mt, mr, mb, ml, mx, my,
    p, pt, pr, pb, pl, px, py 
}: HeaderRootProps) => (
    <Flex 
        align="center" 
        gap="2" 
        m={m} mt={mt} mr={mr} mb={mb} ml={ml} mx={mx} my={my}
        p={p} pt={pt} pr={pr} pb={pb} pl={pl} px={px} py={py}
        className={className}
    >
        {children}
    </Flex>
);

/**
 * Unified Header component using the Compound Component pattern.
 * Use for page-level headers and section-level headers with kickers.
 */
export const Header = {
    Root: HeaderRoot,
    Content: HeaderContent,
    Kicker: HeaderKicker,
    Title: HeaderTitle,
    Description: HeaderDescription,
    Actions: HeaderActions,
};

export default Header;
