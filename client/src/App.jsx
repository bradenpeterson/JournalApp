import { Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import EntryDetail from "./pages/EntryDetail";
import EntryEditor from "./pages/EntryEditor";

export default function App() {
    return (
        <Routes>
            <Route path="/registration/sign_in" element={<SignIn />} />
            <Route path="/registration/sign_up" element={<SignUp />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/entries/:id" element={<EntryDetail />} />
            <Route path="/entries/new" element={<EntryEditor />} />
        </Routes>
    );
}