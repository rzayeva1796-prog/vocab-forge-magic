import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserContextType {
  userId: string | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  isLoading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get("user_id");
    if (uid) {
      setUserId(uid);
    }
    setIsLoading(false);
  }, []);

  return (
    <UserContext.Provider value={{ userId, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
