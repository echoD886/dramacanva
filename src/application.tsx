import "./demo/install";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "./styles/globals.css";
import "./pages/home/home-liblib.css";
import { PublicEntry } from "./public-entry";
createRoot(document.getElementById("root")!).render(<PublicEntry/>);
