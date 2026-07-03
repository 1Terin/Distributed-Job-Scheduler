import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const AuthContext = createContext(null);
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
    });
    const navigate = useNavigate();
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            localStorage.setItem("token", token);
            axios
                .get("/api/auth/me")
                .then((res) => {
                setUser(res.data);
                localStorage.setItem("user", JSON.stringify(res.data));
            })
                .catch(() => {
                setToken(null);
                setUser(null);
            });
        }
        else {
            delete axios.defaults.headers.common["Authorization"];
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
        }
    }, [token]);
    const login = async (email, password) => {
        const res = await axios.post("/api/auth/login", { email, password });
        const t = res.data?.token;
        if (!t)
            throw new Error("No token returned");
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setToken(t);
        navigate("/");
    };
    const register = async (email, password, name, organizationName) => {
        const res = await axios.post("/api/auth/register", { email, password, name, organizationName });
        const t = res.data?.token;
        if (!t)
            throw new Error("No token returned");
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setToken(t);
        navigate("/");
    };
    const logout = () => {
        setToken(null);
        setUser(null);
        navigate("/login");
    };
    return (_jsx(AuthContext.Provider, { value: { token, user, login, register, logout, isAdmin: user?.role === "ADMIN" }, children: children }));
};
export default AuthContext;
