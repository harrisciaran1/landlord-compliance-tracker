import { Html, Head, Body, Container, Section, Text, Link, Heading } from '@react-email/components';

interface ExpiryReminderEmailProps {
  recipientName: string;
  propertyAddress: string;
  postcode: string;
  complianceType: string;
  expiryDate: string;
  daysRemaining: number;
  urgency: 'informational' | 'advisory' | 'warning' | 'urgent' | 'critical' | 'expired';
  snoozeUrl: string;
  dashboardUrl: string;
  complianceItemId: string;
}

export function ExpiryReminderEmail(props: ExpiryReminderEmailProps) {
  const {
    recipientName,
    propertyAddress,
    postcode,
    complianceType,
    expiryDate,
    daysRemaining,
    urgency,
    snoozeUrl,
    dashboardUrl,
  } = props;

  const urgencyColors = {
    informational: '#3b82f6',
    advisory: '#3b82f6',
    warning: '#f59e0b',
    urgent: '#f59e0b',
    critical: '#ef4444',
    expired: '#ef4444',
  };

  const color = urgencyColors[urgency];

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', maxWidth: '600px' }}>
          <Heading style={{ color: '#1f2937', marginBottom: '24px' }}>CompliTrack Reminder</Heading>
          
          <Text style={{ fontSize: '16px', color: '#4b5563', marginBottom: '16px' }}>
            Hi {recipientName},
          </Text>

          <Section style={{ backgroundColor: color, padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
            <Text style={{ color: '#ffffff', fontWeight: 'bold', margin: 0 }}>
              {daysRemaining > 0 
                ? `${complianceType} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
                : `${complianceType} has expired`}
            </Text>
          </Section>

          <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            <strong>Property:</strong> {propertyAddress}, {postcode}
          </Text>
          <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            <strong>Expiry Date:</strong> {expiryDate}
          </Text>

          <Section style={{ marginBottom: '24px' }}>
            <Link
              href={dashboardUrl}
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '6px',
                display: 'inline-block',
                fontWeight: 'bold',
              }}
            >
              View in Dashboard
            </Link>
          </Section>

          <Text style={{ fontSize: '12px', color: '#9ca3af', marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            This tool tracks deadlines and stores documents. It does not provide legal advice or certify compliance.
            Always verify current requirements with a qualified professional.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
