import login from "../actions/auth";
import {
  Button,
  Center,
  Container,
  Paper,
  PasswordInput,
  TextInput,
  Title,
} from "@mantine/core";

export default function Login() {
  return (
    <Center w="100vw" h="100vh">
      <Container size={420} my={40}>
        <Title ta="center">UT Dining Admin Dashboard</Title>

        <form>
          <Paper withBorder p={22} mt={30} radius="md">
            <TextInput
              name="email"
              label="Email"
              placeholder="you@email.com"
              required
              radius="md"
            />
            <PasswordInput
              name="password"
              label="Password"
              placeholder="Your password"
              required
              mt="md"
              radius="md"
            />
            <Button
              type="submit"
              formAction={login}
              fullWidth
              mt="md"
              radius="md"
            >
              Sign in
            </Button>
          </Paper>
        </form>
      </Container>
    </Center>
  );
}
