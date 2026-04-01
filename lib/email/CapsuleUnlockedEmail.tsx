import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

function formatUnlockAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export type CapsuleUnlockedEmailProps = {
  title: string
  unlockAtIso: string
  capsuleUrl: string
}

export function CapsuleUnlockedEmail({ title, unlockAtIso, capsuleUrl }: CapsuleUnlockedEmailProps) {
  const safeTitle = title.replace(/"/g, "'")

  return (
    <Html>
      <Head />
      <Preview>{`Your time capsule "${safeTitle}" is ready to open`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Time capsule unlocked</Heading>
          <Text style={text}>
            Your capsule “<strong>{safeTitle}</strong>” reached its unlock time (
            {formatUnlockAt(unlockAtIso)}).
          </Text>
          <Button href={capsuleUrl} style={button}>
            Open capsule
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
  margin: '0 0 24px',
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
