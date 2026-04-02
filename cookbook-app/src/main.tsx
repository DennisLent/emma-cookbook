// Frontend entrypoint that mounts the React application.

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
