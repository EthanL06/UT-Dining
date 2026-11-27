import { Alert, Button, Center, Container, Paper, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconBrandGoogleFilled } from '@tabler/icons-react';
import { signInWithGoogle } from '../actions/auth';

const errorMessages: Record<string, string> = {
  not_allowed: 'That Google account does not have access to this dashboard.',
  auth: 'Google sign-in did not finish. Try again.',
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.auth) : null;

  return (
    <Center w="100vw" h="100vh">
      <Container size={420} my={40}>
        <Title ta="center">UT Dining Admin Dashboard</Title>

        <Paper withBorder p={22} mt={30} radius="md">
          <Text size="sm" c="dimmed" ta="center" mb="md">
            Sign in with the Google account that has dashboard access.
          </Text>

          {errorMessage && (
            <Alert
              color="red"
              variant="light"
              radius="md"
              mb="md"
              icon={<IconAlertCircle size={18} />}
            >
              {errorMessage}
            </Alert>
          )}

          <form action={signInWithGoogle}>
            <Button
              type="submit"
              fullWidth
              radius="md"
              leftSection={<IconBrandGoogleFilled size={18} />}
            >
              Continue with Google
            </Button>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}
