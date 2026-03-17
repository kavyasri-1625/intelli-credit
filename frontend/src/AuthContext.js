import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ic_token") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("ic_user") || "");

  function login(tok, user) {
    setToken(tok);
    setUsername(user);
    localStorage.setItem("ic_token", tok);
    localStorage.setItem("ic_user", user);
  }

  function logout() {
    setToken("");
    setUsername("");
    localStorage.removeItem("ic_token");
    localStorage.removeItem("ic_user");
  }

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
