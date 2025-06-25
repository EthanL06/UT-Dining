import { createTheme, MantineColorsTuple } from "@mantine/core";

const UTColors: MantineColorsTuple = [
  "#fff2e5",
  "#fde3d2",
  "#f6c6a5",
  "#f0a674",
  "#eb8b4b",
  "#e87b30",
  "#e87222",
  "#c35b14",
  "#b8540f",
  "#a14705",
];

const theme = createTheme({
  colors: {
    UTColors,
  },
  cursorType: "pointer",
});

export default theme;
