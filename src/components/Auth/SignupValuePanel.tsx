'use client';

import { Flex, Heading, Text, Box, Tooltip } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';
import { PROVIDER_LOGOS } from '@/assets/model-logos';

const TRACKED_MODELS = [
  { provider: 'google',    name: 'Google AI Overviews' },
  { provider: 'google',    name: 'AI Mode (Gemini Pro)' },
  { provider: 'openai',    name: 'ChatGPT 5' },
  { provider: 'anthropic', name: 'Claude Sonnet 4.6' },
  { provider: 'mistral',   name: 'Mistral Le Chat' },
] as const;

function buildBenefits(trialDays: number): readonly string[] {
  return [
    `${trialDays}-day free trial`,
    'No credit card required',
    'Setup in under 2 minutes',
  ] as const;
}

function ModelStrip() {
  return (
    <Flex align="center" style={{ position: 'relative', height: 32 }}>
      {TRACKED_MODELS.map((m, i) => (
        <Tooltip key={m.name} content={m.name}>
          <Box
            style={{
              lineHeight: 0,
              padding: 2,
              border: '1.5px solid var(--green-9)',
              borderRadius: '50%',
              backgroundColor: 'white',
              position: 'relative',
              zIndex: TRACKED_MODELS.length - i,
              marginLeft: i === 0 ? 0 : -6,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(PROVIDER_LOGOS[m.provider.toLowerCase()] as { src: string })?.src ?? ''}
              alt={m.name}
              width={18}
              height={18}
              style={{ borderRadius: '50%', display: 'block' }}
            />
          </Box>
        </Tooltip>
      ))}
    </Flex>
  );
}

export interface SignupValuePanelProps {
  /** Trial duration in days, sourced from the `trial_days` system setting. */
  trialDays: number;
}

export default function SignupValuePanel({ trialDays }: SignupValuePanelProps) {
  const benefits = buildBenefits(trialDays);
  return (
    <Flex direction="column" gap="6" className="max-w-md w-full mx-auto md:mx-0">
      {/* Brand mark */}
      <Flex align="center" gap="2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-light.png"
          alt=""
          width={32}
          height={32}
          style={{ display: 'block', borderRadius: 6 }}
        />
        <Heading size="5" weight="bold" className="tracking-tight">
          Spectacl
        </Heading>
      </Flex>

      {/* Headline + subtitle */}
      <Flex direction="column" gap="3">
        <Heading
          size={{ initial: '7', md: '9' } as never}
          weight="bold"
          className="tracking-tight"
          style={{ lineHeight: 1.05 }}
        >
          See your brand
          <br />
          through AI&apos;s eyes.
        </Heading>
        <Text size="4" color="gray" style={{ lineHeight: 1.5 }}>
          Spectacl tracks how ChatGPT, Claude, Gemini and Google AI Overviews
          talk about your brand and how you stack up against competitors.
        </Text>
      </Flex>

      {/* Model strip */}
      <Flex direction="column" gap="2">
        <ModelStrip />
        <Text size="2" color="gray" weight="medium">
          All major AI models, tracked daily.
        </Text>
      </Flex>

      {/* Benefits checklist */}
      <Flex direction="column" gap="3">
        {benefits.map((b) => (
          <Flex key={b} align="center" gap="3">
            <Box
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: 'var(--accent-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckIcon width="14" height="14" style={{ color: 'var(--accent-11)' }} />
            </Box>
            <Text size="3" weight="medium">
              {b}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
