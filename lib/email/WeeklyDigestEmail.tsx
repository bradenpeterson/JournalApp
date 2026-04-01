import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

function formatDigestDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export type WeeklyDigestEmailProps = {
  displayName?: string | null
  weekStart: string
  weekEnd: string
  entryCount: number
  avgScore: number
  topMood: string
  summary: string
  dashboardUrl: string
}

export function WeeklyDigestEmail({
  displayName,
  weekStart,
  weekEnd,
  entryCount,
  avgScore,
  topMood,
  summary,
  dashboardUrl,
}: WeeklyDigestEmailProps) {
  const greeting = displayName?.trim() ? `Hi ${displayName.trim()},` : 'Hi,'
  const range = `${formatDigestDate(weekStart)} – ${formatDigestDate(weekEnd)}`

  return (
    <Html>
      <Head />
      <Preview>{`Your week in review — ${entryCount} entries, mood ${topMood}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly digest</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={textMuted}>
            {range} · {entryCount} {entryCount === 1 ? 'entry' : 'entries'} · avg mood score{' '}
            {avgScore}/10 · top label: {topMood}
          </Text>
          <Section style={summaryBox}>
            <Text style={summaryText}>{summary}</Text>
          </Section>
          <Button href={dashboardUrl} style={button}>
            Open your journal
          </Button>
          <Text style={footer}>— Journal</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '520px',
}

const h1 = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: '#27272a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 8px',
}

const textMuted = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 20px',
}

const summaryBox = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const summaryText = {
  color: '#27272a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const footer = {
  color: '#a1a1aa',
  fontSize: '13px',
  margin: '24px 0 0',
}
