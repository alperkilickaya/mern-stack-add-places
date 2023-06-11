import { useState, useCallback, useRef, useEffect } from "react";

export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState();

  // bu hook'un kullanıldığı component her render olduğunda aynı kalacak bir değişken oluşturur.
  const activeHpptRequests = useRef([]);

  const sendRequest = useCallback(
    async (url, method = "GET", body = null, headers = {}) => {
      setIsLoading(true);
      //her istek atıldığında kullanmak üzere bir AbortController oluşturuyoruz.
      const httpAbortCtrl = new AbortController();
      activeHpptRequests.current.push(httpAbortCtrl);

      try {
        const response = await fetch(url, {
          method,
          body,
          headers,
          signal: httpAbortCtrl.signal,
        });

        const responseData = await response.json();

        // istek atıldıktan sonra, istekler dizisinden bu isteğin AbortController'ını çıkarıyoruz.
        activeHpptRequests.current = activeHpptRequests.current.filter(
          (reqCtrl) => reqCtrl !== httpAbortCtrl
        );

        if (!response.ok) {
          throw new Error(responseData.message);
        }
        setIsLoading(false);
        return responseData;
      } catch (err) {
        setError(err.message || "Something went wrong, please try again.");
        setIsLoading(false);
        // eğer custom hook içinde bir error oluşursa, bu error'u dışarıya fırlatıyoruz. aksi halde kullanılan component'te kod execution devam eder.
        throw err;
      }
    },
    []
  );

  const clearError = () => {
    setError(null);
  };

  //bu hook kullanıldığı component unmount olduğunda çalışır. Bu sayede component unmount olmadan önceki istekler iptal edilir ve memory leak oluşmaz.
  useEffect(() => {
    return () => {
      activeHpptRequests.current.forEach((abortCtrl) => abortCtrl.abort());
    };
  }, []);

  return { isLoading, error, sendRequest, clearError };
};
