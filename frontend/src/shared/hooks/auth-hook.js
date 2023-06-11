import { useState, useEffect, useCallback } from "react";

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    token: null,
    tokenExpirationDate: null,
    userId: null,
  });

  const login = useCallback((uid, token, expirationDate) => {
    const tokenExpiration =
      expirationDate || new Date(new Date().getTime() + 1000 * 60 * 60);

    setAuthState({
      token,
      userId: uid,
      tokenExpirationDate: tokenExpiration.toISOString(),
    });
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      token: null,
      userId: null,
      tokenExpirationDate: null,
    });
    localStorage.removeItem("userData");
  }, []);

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem("userData"));

    if (
      storedData &&
      storedData.token &&
      new Date(storedData.expiration) > new Date()
    ) {
      login(
        storedData.userId,
        storedData.token,
        new Date(storedData.expiration)
      );
    }
  }, [login]);

  useEffect(() => {
    let logoutTimer;
    if (authState.token && authState.tokenExpirationDate) {
      const remainingTime =
        new Date(authState.tokenExpirationDate).getTime() -
        new Date().getTime();
      logoutTimer = setTimeout(logout, remainingTime);
    }
    return () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
      }
    };
  }, [authState.token, authState.tokenExpirationDate, logout]);

  useEffect(() => {
    if (authState.token || authState.tokenExpirationDate) {
      localStorage.setItem(
        "userData",
        JSON.stringify({
          userId: authState.userId,
          token: authState.token,
          expiration: authState.tokenExpirationDate,
        })
      );
    }
  }, [authState.token, authState.tokenExpirationDate, authState.userId]);

  return { token: authState.token, login, logout, userId: authState.userId };
};
