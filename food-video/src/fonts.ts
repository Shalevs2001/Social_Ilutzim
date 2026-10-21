import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const fontFamily = "Rubik";
loadFont({ family: fontFamily, url: staticFile("fonts/Rubik-Medium.ttf"), weight: "500" });
loadFont({ family: fontFamily, url: staticFile("fonts/Rubik-Black.ttf"), weight: "900" });
