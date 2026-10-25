import { Center, Loader } from "@mantine/core";

export default function Home() {
  return (
    <Center w="100vw" h="100vh">
      <Loader color="var(--color-UTColors)" size={"sm"} />
    </Center>
  );
}
