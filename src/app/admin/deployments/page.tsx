import { Container, Box, Flex, Heading, Text, Grid, Badge, Card, Inset, Code as RadixCode } from "@radix-ui/themes";
import PageHeader from "@/components/Shared/PageHeader";

export default function DeploymentsPage() {
  return (
    <Container size="3" p="6">
      <Box mb="8">
        <PageHeader
          title="Deployment Guide"
          description="How to deploy Spectacl to staging and production environments."
        />
      </Box>

      <Flex direction="column" gap="8">

        {/* Branch Strategy */}
        <Section title="Branch Strategy">
          <Table
            headers={["", "Staging", "Production"]}
            rows={[
              ["Branch", "develop", "main"],
              ["Auto-deploy", "✅ On push", "❌ Manual only"],
              ["Domain", "staging.spectacl.org", "app.spectacl.org"],
              ["Mollie key", "test_xxxx", "live_xxxx"],
            ]}
          />
        </Section>

        {/* Coolify Setup */}
        <Section title="Coolify Setup">
          <Flex direction="column" gap="2">
            {[
              { text: <>Create <Text weight="bold" color="indigo">two separate applications</Text> in Coolify from the same GitHub repo.</> },
              { text: <>Set <Text weight="bold" color="indigo">Watch Branch</Text> to <Code>develop</Code> for staging, <Code>main</Code> for production.</> },
              { text: <>Enable <Text weight="bold" color="indigo">Auto Deploy</Text> on staging only — leave it off for production.</> },
              { text: <>Configure separate env vars per app (separate DB, Redis, Mollie keys).</> }
            ].map((item, i) => (
              <Flex key={i} gap="2" align="start">
                <Text size="2" color="gray" weight="bold">{i + 1}.</Text>
                <Text size="2" color="gray">{item.text}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>

        {/* Env Vars */}
        <Section title="Key Environment Variables">
          <Grid columns={{ initial: '1', md: '2' }} gap="4">
            <EnvBlock title="Staging" vars={[
              ["DATABASE_URL", "postgresql://...staging_db..."],
              ["REDIS_URL", "redis://...staging_redis..."],
              ["MOLLIE_API_KEY", "test_xxxxxxxxxxxx"],
              ["NEXT_PUBLIC_APP_URL", "https://staging.spectacl.org"],
              ["BETTER_AUTH_URL", "https://staging.spectacl.org"],
            ]} />
            <EnvBlock title="Production" vars={[
              ["DATABASE_URL", "postgresql://...prod_db..."],
              ["REDIS_URL", "redis://...prod_redis..."],
              ["MOLLIE_API_KEY", "live_xxxxxxxxxxxx"],
              ["NEXT_PUBLIC_APP_URL", "https://app.spectacl.org"],
              ["BETTER_AUTH_URL", "https://app.spectacl.org"],
            ]} />
          </Grid>
        </Section>

        {/* Workflow */}
        <Section title="Deploy Workflow">
          <Flex direction="column" gap="4">
            <Step number={1} label="Push to staging (auto)">
              <CodeBlock>{`git push origin develop\n# → auto-deploys to staging.spectacl.org`}</CodeBlock>
            </Step>
            <Step number={2} label="Verify staging is healthy" />
            <Step number={3} label="Promote to production (manual)">
              <CodeBlock>{`git checkout main\ngit merge develop\ngit push origin main\n# → then click "Deploy" in Coolify for the prod app`}</CodeBlock>
            </Step>
          </Flex>
        </Section>

        {/* Notes */}
        <Section title="Important Notes">
          <Flex direction="column" gap="2">
            {[
              <>Prisma migrations run automatically on startup via <Code>prisma migrate deploy</Code>.</>,
              <>Never share databases between staging and production.</>,
              <>Use the Mollie <Text weight="bold" color="indigo">test</Text> API key on staging, <Text weight="bold" color="indigo">live</Text> key on production.</>,
              <><Code>MOLLIE_WEBHOOK_URL</Code> must be a publicly reachable URL — Mollie won't call localhost.</>
            ].map((item, i) => (
              <Flex key={i} gap="2" align="start">
                <Text size="2" color="gray" weight="bold">•</Text>
                <Text size="2" color="gray">{item}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>

      </Flex>
    </Container>
  );
}

/* ─── Small layout helpers ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="2">
      <Heading size="3" mb="4">{title}</Heading>
      {children}
    </Card>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <Box style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 'var(--font-size-2)', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <Box asChild style={{ borderBottom: '1px solid var(--gray-6)' }}>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{ paddingBottom: 'var(--space-2)', paddingRight: 'var(--space-6)', color: 'var(--gray-11)', fontWeight: 'var(--font-weight-medium)' }}>{h}</th>
              ))}
            </tr>
          </Box>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Box asChild key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--gray-4)' }}>
              <tr>
                {row.map((cell, j) => (
                  <td key={j} style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingRight: 'var(--space-6)', color: j === 0 ? 'var(--gray-11)' : 'var(--gray-12)', fontWeight: j === 0 ? 'var(--font-weight-medium)' : 'normal' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            </Box>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

function EnvBlock({ title, vars }: { title: string; vars: [string, string][] }) {
  return (
    <Box>
      <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }} mb="2">{title}</Text>
      <Box p="3" style={{ borderRadius: 'var(--radius-3)', backgroundColor: 'var(--gray-3)', border: '1px solid var(--gray-5)', fontFamily: 'var(--font-mono)' }}>
        <Flex direction="column" gap="1">
          {vars.map(([key, val]) => (
            <Text key={key} size="1" style={{ display: 'block' }}>
              <Text color="indigo">{key}</Text>
              <Text color="gray">=</Text>
              <Text color="gray">{val}</Text>
            </Text>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}

function Step({ number, label, children }: { number: number; label: string; children?: React.ReactNode }) {
  return (
    <Flex gap="3">
      <Flex 
        width="24px" 
        height="24px" 
        align="center" 
        justify="center" 
        style={{ 
          backgroundColor: 'var(--indigo-9)', 
          color: 'white', 
          borderRadius: '50%', 
          flexShrink: 0,
          fontSize: 'var(--font-size-1)',
          fontWeight: 'var(--font-weight-bold)'
        }}
      >
        {number}
      </Flex>
      <Box style={{ flex: 1 }}>
        <Text size="2" weight="bold" color="gray" mb={children ? "2" : "0"} style={{ display: 'block' }}>{label}</Text>
        {children}
      </Box>
    </Flex>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Box p="3" style={{ backgroundColor: 'var(--gray-12)', color: 'white', borderRadius: 'var(--radius-3)', overflowX: 'auto' }}>
      <Text as="p" size="1" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
        {children}
      </Text>
    </Box>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <RadixCode size="1" color="indigo">
      {children}
    </RadixCode>
  );
}
